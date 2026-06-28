"""Router chatbot — point d'entrée HTTP uniquement.

Responsabilité unique (SRP) : valider la requête HTTP et déléguer
au service métier `services/chat.py`.
Toute la logique RAG, filtrage et construction de prompt est dans le service.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user
from ..services import chat as chat_service
from ..services import llm

router = APIRouter(prefix="/chat", tags=["chat"])


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
    try:
        return chat_service.process_chat(
            question=payload.question,
            history=[m.model_dump() for m in payload.history],
            db=db,
            user=user,
        )
    except llm.LLMNotConfigured as e:
        raise HTTPException(status_code=503, detail=str(e))
    except llm.LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))
