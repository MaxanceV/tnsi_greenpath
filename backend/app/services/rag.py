"""Service RAG (Retrieval-Augmented Generation) du chatbot GreenPath.

Toute initialisation est sautée si `DISABLE_RAG=1` est set (utilisé en tests
pytest pour éviter de charger PyTorch / le modèle d'embedding à chaque test).


Pipeline complet :
1. **Indexation** : convertir produits et knowledge base en documents textuels,
   les transformer en vecteurs via `sentence-transformers`, les stocker dans
   ChromaDB (vector store local persistant).
2. **Retrieval** : à la question d'un user, embedder la question puis chercher
   les top-K documents les plus similaires (cosine similarity).
3. **Generation** : injecter les documents retrouvés dans un prompt LLM
   et appeler Hugging Face Inference API pour générer la réponse finale.

Tout est conçu pour fonctionner avec un compte HF gratuit. L'embedding est
local (pas d'API), seul le LLM utilise l'API HF.
"""

from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Dict, List, Optional

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

from .. import models
from ..database import SessionLocal
from .co2 import co2_for_step, total_co2_for_product

# ---------------------------------------------------------------- Config

EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"
COLLECTION_NAME = "greenpath_v1"
CHROMA_PATH = Path(__file__).resolve().parents[2] / "chroma_db"
KNOWLEDGE_PATH = Path(__file__).resolve().parents[2] / "knowledge"


# ---------------------------------------------------------------- Service

class RAGService:
    """Service singleton qui maintient l'embedder et la vector DB."""

    _instance: "Optional[RAGService]" = None
    _lock = threading.Lock()

    def __new__(cls) -> "RAGService":
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        if os.getenv("DISABLE_RAG") == "1":
            # Mode test : ne charge pas le modèle ni Chroma
            self.embedder = None
            self.client = None
            self.collection = None
            self._initialized = True
            return
        print(f"[RAG] Chargement du modèle d'embedding ({EMBEDDING_MODEL})...")
        # Essaie en ligne d'abord (télécharge si absent du cache).
        # En cas d'échec réseau, bascule en offline (utilise le cache existant).
        try:
            self.embedder = SentenceTransformer(EMBEDDING_MODEL, device="cpu")
        except Exception as e:
            print(f"[RAG] Chargement échoué ({e}). Bascule en mode offline...")
            os.environ["HF_HUB_OFFLINE"] = "1"
            os.environ["TRANSFORMERS_OFFLINE"] = "1"
            self.embedder = SentenceTransformer(EMBEDDING_MODEL, device="cpu")
        print("[RAG] Modèle chargé.")

        CHROMA_PATH.mkdir(exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=str(CHROMA_PATH),
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        self._initialized = True

    # ---------------------------------------------------------------- Indexation

    @staticmethod
    def _product_to_documents(product: models.Product) -> List[Dict]:
        """Construit un document texte par étape + un doc global pour le produit."""
        owner_name = product.owner.company_name if product.owner else "Inconnu"
        total_co2 = round(total_co2_for_product(product), 3)

        docs: List[Dict] = []

        # Document global produit
        steps_summary = ", ".join(
            f"{s.position}.{s.name}" for s in sorted(product.steps, key=lambda x: x.position)
        )
        product_text = (
            f"Produit : {product.name}\n"
            f"Entreprise / marque : {owner_name}\n"
            f"Description : {product.description or 'Non renseignée'}\n"
            f"Empreinte carbone totale : {total_co2} kg CO₂\n"
            f"Nombre d'étapes : {len(product.steps)}\n"
            f"Étapes : {steps_summary}"
        )
        docs.append(
            {
                "id": f"product:{product.id}",
                "text": product_text,
                "metadata": {
                    "kind": "product",
                    "product_id": product.id,
                    "product_name": product.name,
                    "owner_id": product.owner_id or 0,
                    "owner_name": owner_name,
                    "total_co2_kg": total_co2,
                },
            }
        )

        # Un document par étape (granularité fine pour la retrieval)
        for step in product.steps:
            co2 = round(co2_for_step(step), 3)
            step_text = (
                f"Étape {step.position} du produit {product.name} (entreprise {owner_name}) : {step.name}.\n"
                f"Type : {step.step_type}.\n"
                f"Fournisseur : {step.supplier or 'non renseigné'}.\n"
                f"Lieu : {step.location or 'non renseigné'}.\n"
                f"Poids : {step.weight_kg} kg.\n"
                f"Transport : {step.transport_mode or 'aucun'}.\n"
                f"Distance : {step.distance_km if step.distance_km else 0} km.\n"
                f"Empreinte CO₂ de cette étape : {co2} kg CO₂."
            )
            docs.append(
                {
                    "id": f"step:{step.id}",
                    "text": step_text,
                    "metadata": {
                        "kind": "step",
                        "product_id": product.id,
                        "product_name": product.name,
                        "owner_id": product.owner_id or 0,
                        "owner_name": owner_name,
                        "step_type": step.step_type,
                        "transport_mode": step.transport_mode or "",
                        "location": step.location or "",
                        "co2_kg": co2,
                    },
                }
            )

        return docs

    @staticmethod
    def _knowledge_to_documents() -> List[Dict]:
        """Charge la knowledge base markdown et la découpe en chunks."""
        docs: List[Dict] = []
        if not KNOWLEDGE_PATH.exists():
            return docs

        for md_file in sorted(KNOWLEDGE_PATH.glob("*.md")):
            content = md_file.read_text(encoding="utf-8")
            # Découpage simple par sections de niveau 2 (##)
            sections = content.split("\n## ")
            for i, section in enumerate(sections):
                if not section.strip():
                    continue
                if i > 0:
                    section = "## " + section
                # Découpage supplémentaire si la section est trop longue
                chunks = _split_chunk(section, max_chars=900)
                for j, chunk in enumerate(chunks):
                    docs.append(
                        {
                            "id": f"kb:{md_file.stem}:{i}:{j}",
                            "text": chunk.strip(),
                            "metadata": {
                                "kind": "knowledge",
                                "source": md_file.name,
                            },
                        }
                    )
        return docs

    def index_documents(self, docs: List[Dict]) -> None:
        """Ajoute / met à jour des documents dans la collection (upsert)."""
        if not docs:
            return
        ids = [d["id"] for d in docs]
        texts = [d["text"] for d in docs]
        metadatas = [d["metadata"] for d in docs]
        embeddings = self.embedder.encode(texts, show_progress_bar=False).tolist()
        self.collection.upsert(
            ids=ids,
            documents=texts,
            metadatas=metadatas,
            embeddings=embeddings,
        )

    def remove_product(self, product_id: int) -> None:
        """Supprime tous les documents (product + steps) liés à un produit."""
        try:
            self.collection.delete(where={"product_id": product_id})
        except Exception as e:
            print(f"[RAG] Erreur suppression product_id={product_id} : {e}")

    def reindex_product(self, product: models.Product) -> None:
        """Réindexe un produit (suppression puis insertion)."""
        self.remove_product(product.id)
        self.index_documents(self._product_to_documents(product))

    def index_all(self) -> Dict[str, int]:
        """Réindexe la knowledge base + tous les produits de la DB."""
        # Vider la collection pour repartir propre
        try:
            self.client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

        kb_docs = self._knowledge_to_documents()
        self.index_documents(kb_docs)
        print(f"[RAG] Knowledge base indexée : {len(kb_docs)} chunk(s).")

        db = SessionLocal()
        try:
            products = db.query(models.Product).all()
            product_docs: List[Dict] = []
            for p in products:
                product_docs.extend(self._product_to_documents(p))
            self.index_documents(product_docs)
            print(
                f"[RAG] {len(products)} produit(s) indexé(s) → {len(product_docs)} document(s)."
            )
            return {
                "knowledge_chunks": len(kb_docs),
                "products_indexed": len(products),
                "product_documents": len(product_docs),
            }
        finally:
            db.close()

    # ---------------------------------------------------------------- Retrieval

    def retrieve(
        self,
        query: str,
        top_k: int = 6,
        owner_id_filter: Optional[int] = None,
        product_ids_filter: Optional[List[int]] = None,
    ) -> List[Dict]:
        """Recherche les top-K documents les plus similaires à la question.

        Filtres optionnels :
        - `owner_id_filter` : limite aux documents du produit d'une entreprise
          (pour qu'une entreprise ne voie pas les détails des concurrents).
        - `product_ids_filter` : limite aux produits scannés par un
          consommateur + knowledge base.
        """
        query_emb = self.embedder.encode([query]).tolist()

        where_clause: Optional[Dict] = None
        if owner_id_filter is not None:
            # Entreprise : ses produits OU la knowledge base
            where_clause = {
                "$or": [
                    {"owner_id": owner_id_filter},
                    {"kind": "knowledge"},
                ]
            }
        elif product_ids_filter is not None:
            # Consommateur : ses produits consommés OU la knowledge base
            if not product_ids_filter:
                where_clause = {"kind": "knowledge"}
            else:
                where_clause = {
                    "$or": [
                        {"product_id": {"$in": product_ids_filter}},
                        {"kind": "knowledge"},
                    ]
                }

        results = self.collection.query(
            query_embeddings=query_emb,
            n_results=top_k,
            where=where_clause,
        )
        # Format Chroma : results[key][0] (premier query)
        return [
            {
                "text": doc,
                "metadata": meta,
                "distance": dist,
            }
            for doc, meta, dist in zip(
                results.get("documents", [[]])[0],
                results.get("metadatas", [[]])[0],
                results.get("distances", [[]])[0],
            )
        ]


# ---------------------------------------------------------------- Helpers

def _split_chunk(text: str, max_chars: int = 900) -> List[str]:
    """Découpage simple par paragraphe quand le chunk dépasse `max_chars`."""
    if len(text) <= max_chars:
        return [text]
    parts: List[str] = []
    current = ""
    for para in text.split("\n\n"):
        if len(current) + len(para) + 2 > max_chars and current:
            parts.append(current)
            current = para
        else:
            current = f"{current}\n\n{para}" if current else para
    if current:
        parts.append(current)
    return parts


# Singleton paresseux : ne charge le modèle qu'à la première utilisation
_singleton: Optional[RAGService] = None


def get_rag() -> RAGService:
    global _singleton
    if _singleton is None:
        _singleton = RAGService()
    return _singleton
