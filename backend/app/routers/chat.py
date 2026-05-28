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
from ..services.rag import get_rag

router = APIRouter(prefix="/chat", tags=["chat"])


def _system_instructions(role: str) -> str:
    """Prompt système adapté au rôle de l'utilisateur."""
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


def _build_filter(db: Session, user: models.User) -> tuple[Optional[int], Optional[List[int]]]:
    """Calcule le filtre de retrieval selon le rôle.

    Renvoie un tuple (owner_id_filter, product_ids_filter). Au plus un des
    deux est non-None.
    - Admin : aucun filtre (tout est vu)
    - Entreprise : limité à ses propres produits
    - Consommateur : limité aux produits qu'il a déjà ajoutés à son suivi
    """
    if user.role == "admin":
        return None, None
    if user.role == "entreprise":
        return user.id, None
    if user.role == "consommateur":
        product_ids = [
            c.product_id
            for c in db.query(models.Consumption).filter_by(user_id=user.id).all()
        ]
        return None, product_ids
    return None, []


def _format_context(retrieved: List[dict]) -> tuple[str, List[schemas.ChatSource]]:
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

    rag = get_rag()
    owner_id_filter, product_ids_filter = _build_filter(db, user)
    retrieved = rag.retrieve(
        payload.question,
        top_k=10,
        owner_id_filter=owner_id_filter,
        product_ids_filter=product_ids_filter,
    )
    context_text, sources = _format_context(retrieved)

    messages = llm.build_messages(
        system_instructions=_system_instructions(user.role),
        retrieved_context=context_text,
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
