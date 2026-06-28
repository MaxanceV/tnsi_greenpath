"""Point d'entrée de l'API GreenPath.

Responsabilité unique (SRP) : assembler l'application FastAPI.
- Configuration CORS
- Enregistrement des routers
- Déclenchement du démarrage via `startup.run_all()`

Toute logique d'initialisation (migrations, bootstrap) est dans `startup.py`.
Toute logique métier est dans `services/`.
"""

import os
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import startup
from .routers import auth, batches, chat, consumption, contributors, products, public, users

# ---------------------------------------------------------------------------
# Initialisation DB + bootstrap (délégué à startup.py)
# ---------------------------------------------------------------------------
startup.run_all()

# ---------------------------------------------------------------------------
# Application FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(
    title="GreenPath API",
    description="API de traçabilité GS1 avec blockchain SHA-256 et chatbot RAG.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    # Autorise localhost et toute IP LAN (ex: 192.168.x.x) sur le port 4200.
    # En production, restreindre à l'origine exacte du front.
    allow_origin_regex=r"http://[a-zA-Z0-9.\-]+:4200",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(batches.router)
app.include_router(contributors.router)
app.include_router(consumption.router)
app.include_router(chat.router)
app.include_router(public.router)


# ---------------------------------------------------------------------------
# Événements de démarrage
# ---------------------------------------------------------------------------

@app.on_event("startup")
def _index_rag_on_startup() -> None:
    """Lance l'indexation RAG en arrière-plan (skip si DISABLE_RAG=1)."""
    if os.getenv("DISABLE_RAG") == "1":
        return

    def _run() -> None:
        try:
            from .services.rag import get_rag
            stats = get_rag().index_all()
            print(f"[RAG] Indexation terminée : {stats}")
        except Exception as e:
            print(f"[RAG] Échec de l'indexation initiale : {e}")

    threading.Thread(target=_run, daemon=True).start()


@app.get("/")
def read_root():
    return {"status": "GreenPath Backend en ligne"}
