"""Service métier du chatbot GreenBot.

Responsabilité unique : orchestrer la pipeline RAG → LLM.
Le router `routers/chat.py` délègue ici toute la logique métier
(SRP SOLID) et ne conserve que la validation HTTP + les dépendances FastAPI.

Pipeline :
1. Déterminer les produits visibles selon le rôle de l'utilisateur
2. Construire le filtre ChromaDB adapté
3. Récupérer les documents pertinents (RAG retrieve)
4. Construire le contexte structuré (classement CO₂ exact)
5. Assembler le prompt système selon le rôle
6. Appeler le LLM et retourner réponse + sources
"""

from typing import List, Optional

from sqlalchemy.orm import Session

from .. import models, schemas
from ..services import llm
from ..services.co2 import co2_for_step, total_co2_for_product
from ..services.rag import get_rag


# ---------------------------------------------------------------------------
# Visibilité des produits (Open/Closed : ajouter un rôle = ajouter un cas)
# ---------------------------------------------------------------------------

def get_visible_products(db: Session, user: models.User) -> List[models.Product]:
    """Renvoie les produits accessibles selon le rôle de l'utilisateur."""
    if user.role == "admin":
        return db.query(models.Product).all()
    if user.role == "entreprise":
        return db.query(models.Product).filter_by(owner_id=user.id).all()
    if user.role == "consommateur":
        consumed_ids = [
            c.product_id
            for c in db.query(models.Consumption).filter_by(user_id=user.id).all()
        ]
        if not consumed_ids:
            return []
        return db.query(models.Product).filter(models.Product.id.in_(consumed_ids)).all()
    return []


# ---------------------------------------------------------------------------
# Filtre ChromaDB
# ---------------------------------------------------------------------------

def build_rag_filter(
    user: models.User,
    products: List[models.Product],
) -> tuple[Optional[int], Optional[List[int]]]:
    """Calcule le filtre ChromaDB (owner_id_filter, product_ids_filter)."""
    if user.role == "admin":
        return None, None
    if user.role == "entreprise":
        return user.id, None
    return None, [p.id for p in products]


# ---------------------------------------------------------------------------
# Construction du contexte
# ---------------------------------------------------------------------------

def build_structured_context(products: List[models.Product]) -> str:
    """Construit un classement CO₂ exact depuis la BDD pour injection dans le prompt."""
    if not products:
        return ""

    ranked = sorted(
        [(p, round(total_co2_for_product(p), 3)) for p in products],
        key=lambda x: x[1],
        reverse=True,
    )

    lines = ["=== Classement des produits par empreinte CO₂ (données réelles) ==="]
    for rank, (product, total_co2) in enumerate(ranked, start=1):
        owner = product.owner.company_name if product.owner else "Inconnu"
        steps_co2 = ", ".join(
            f"{s.name} ({round(co2_for_step(s), 3)} kg CO₂)"
            for s in sorted(product.steps, key=lambda s: s.position)
        ) or "aucune étape"
        lines.append(
            f"{rank}. {product.name} — {owner} — Total : {total_co2} kg CO₂"
            f" | Étapes : {steps_co2}"
        )
    lines.append("=== Fin du classement ===")
    return "\n".join(lines)


def build_system_instructions(role: str) -> str:
    """Génère les instructions système adaptées au rôle de l'utilisateur."""
    base = (
        "Tu es GreenBot, l'assistant carbone de GreenPath. "
        "IMPORTANT : les sources fournies dans le contexte sont les DONNÉES RÉELLES "
        "de l'utilisateur connecté (produits qu'il a scannés, produits de son "
        "entreprise, ou base de connaissances ADEME). Tu DOIS t'appuyer dessus "
        "pour répondre, en citant les noms exacts des produits et les valeurs "
        "exactes de CO₂ que tu y vois. Ne dis JAMAIS que tu n'as pas accès aux "
        "données : tu y as accès via le contexte ci-dessous. "
        "Tes réponses font 3 à 6 phrases maximum, en français, factuelles et concrètes."
    )
    if role == "consommateur":
        return base + (
            "\n\nL'utilisateur est un CONSOMMATEUR. Le contexte contient les "
            "produits qu'il a scannés et ajoutés à son suivi. Pour répondre aux "
            "questions sur 'mes produits', utilise directement les noms et "
            "valeurs CO₂ des produits du contexte. Compare, classe, recommande."
        )
    if role == "entreprise":
        return base + (
            "\n\nL'utilisateur est une ENTREPRISE. Le contexte contient ses "
            "propres produits et leurs étapes de supply chain. Pour répondre aux "
            "questions sur 'mes produits', utilise directement les données du "
            "contexte. Identifie les étapes les plus émettrices et suggère "
            "des leviers d'amélioration concrets."
        )
    return base + (
        "\n\nL'utilisateur est SUPER ADMIN : il voit tous les produits de "
        "toutes les entreprises. Compare, identifie les bonnes/mauvaises pratiques."
    )


def format_rag_results(retrieved: List[dict]) -> tuple[str, List[schemas.ChatSource]]:
    """Concatène les documents récupérés en bloc texte + liste de sources."""
    blocks = []
    sources: List[schemas.ChatSource] = []
    for i, doc in enumerate(retrieved, start=1):
        text = doc["text"]
        meta = doc.get("metadata") or {}
        blocks.append(f"--- Source {i} ---\n{text}")

        kind = meta.get("kind", "")
        if kind == "product":
            title = meta.get("product_name", "Produit")
        elif kind == "step":
            title = f"Étape de {meta.get('product_name', 'produit')}"
        elif kind == "knowledge":
            title = f"Base de connaissances : {meta.get('source', '?')}"
        else:
            title = "Source"

        sources.append(
            schemas.ChatSource(
                kind=kind or "unknown",
                title=title,
                snippet=text[:160].replace("\n", " ") + ("…" if len(text) > 160 else ""),
                distance=float(doc.get("distance", 0.0)),
            )
        )
    return "\n\n".join(blocks), sources


# ---------------------------------------------------------------------------
# Orchestrateur principal
# ---------------------------------------------------------------------------

def process_chat(
    question: str,
    history: list,
    db: Session,
    user: models.User,
) -> schemas.ChatResponse:
    """Orchestre la pipeline complète RAG → LLM et retourne la réponse."""
    visible_products = get_visible_products(db, user)

    owner_id_filter, product_ids_filter = build_rag_filter(user, visible_products)
    retrieved = get_rag().retrieve(
        question,
        top_k=10,
        owner_id_filter=owner_id_filter,
        product_ids_filter=product_ids_filter,
    )
    rag_context, sources = format_rag_results(retrieved)

    structured_context = build_structured_context(visible_products)
    full_context = (
        f"{structured_context}\n\n{rag_context}" if structured_context else rag_context
    )

    messages = llm.build_messages(
        system_instructions=build_system_instructions(user.role),
        retrieved_context=full_context,
        history=history,
        user_question=question,
    )

    answer = llm.chat_completion(messages, max_tokens=500, temperature=0.3)
    return schemas.ChatResponse(answer=answer, sources=sources)
