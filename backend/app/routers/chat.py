"""Endpoint chatbot RAG.

Pipeline complet :
1. Récupère l'utilisateur courant et son rôle
2. Calcule le filtre de retrieval adapté (entreprise → ses produits,
   consommateur → ses produits consommés, admin → tout)
3. Embed la question, retrieve top-K dans Chroma
4. Construit le prompt système adapté au rôle + injecte le contexte
5. Appelle HF Inference API
6. Renvoie la réponse + les sources utilisées
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user
from ..services import llm
from ..services.co2 import co2_for_step, total_co2_for_product
from ..services.rag import get_rag

router = APIRouter(prefix="/chat", tags=["chat"])


def _get_visible_products(db: Session, user: models.User) -> List[models.Product]:
    """Renvoie les produits accessibles à l'utilisateur selon son rôle."""
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


def _build_rag_filter(
    user: models.User,
    products: List[models.Product],
) -> tuple[Optional[int], Optional[List[int]]]:
    """Calcule le filtre ChromaDB depuis le rôle et la liste de produits visibles.

    Renvoie (owner_id_filter, product_ids_filter) — au plus un est non-None.
    """
    if user.role == "admin":
        return None, None
    if user.role == "entreprise":
        return user.id, None
    return None, [p.id for p in products]


def _build_structured_context(products: List[models.Product]) -> str:
    """Construit un classement CO₂ exact depuis la BDD, injecté avant le RAG.

    Permet au LLM de répondre aux questions d'agrégation (max, tri, comparaison)
    que la similarité sémantique de ChromaDB ne peut pas résoudre seule.
    """
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


def _system_instructions(role: str) -> str:
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


def _format_rag_results(retrieved: List[dict]) -> tuple[str, List[schemas.ChatSource]]:
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


@router.post("", response_model=schemas.ChatResponse)
def chat(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not llm.is_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "Le chatbot n'est pas configuré : ajoute HF_TOKEN dans "
                "backend/.env (cf. README, section Chatbot RAG)."
            ),
        )

    visible_products = _get_visible_products(db, user)

    rag = get_rag()
    owner_id_filter, product_ids_filter = _build_rag_filter(user, visible_products)
    retrieved = rag.retrieve(
        payload.question,
        top_k=10,
        owner_id_filter=owner_id_filter,
        product_ids_filter=product_ids_filter,
    )
    rag_context, sources = _format_rag_results(retrieved)

    structured_context = _build_structured_context(visible_products)
    full_context = (
        f"{structured_context}\n\n{rag_context}" if structured_context else rag_context
    )

    messages = llm.build_messages(
        system_instructions=_system_instructions(user.role),
        retrieved_context=full_context,
        history=[m.model_dump() for m in payload.history],
        user_question=payload.question,
    )

    try:
        answer = llm.chat_completion(messages, max_tokens=500, temperature=0.3)
    except llm.LLMNotConfigured as e:
        raise HTTPException(status_code=503, detail=str(e))
    except llm.LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return schemas.ChatResponse(answer=answer, sources=sources)
