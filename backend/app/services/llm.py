"""Client LLM pour Hugging Face Inference Providers (nouvelle API 2024+).

Hugging Face a migré son ancienne "Serverless Inference API"
(`api-inference.huggingface.co`) vers un nouveau routeur unifié
(`router.huggingface.co/v1/chat/completions`) au format compatible OpenAI.

Cette API est gratuite (avec quotas) pour les modèles open-weights
compatibles chat completions.
"""

from __future__ import annotations

import os
from typing import List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

# Modèle par défaut : Llama 3.1 8B est gratuit, multilingue (incl. français)
# et de bonne qualité. Surchargeable via HF_MODEL dans .env.
DEFAULT_MODEL = os.getenv("HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
HF_TOKEN = os.getenv("HF_TOKEN")
HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions"


class LLMNotConfigured(RuntimeError):
    """Levée quand HF_TOKEN manque."""


class LLMError(RuntimeError):
    """Erreur générique d'appel au LLM."""


def is_configured() -> bool:
    return bool(HF_TOKEN)


def chat_completion(
    messages: List[dict],
    max_tokens: int = 500,
    temperature: float = 0.3,
    timeout_s: int = 90,
) -> str:
    """Appelle le router HF en mode chat completions (format OpenAI).

    `messages` : liste de dict `{"role": "system"|"user"|"assistant", "content": "..."}`.
    """
    if not HF_TOKEN:
        raise LLMNotConfigured(
            "Le token Hugging Face n'est pas configuré (variable d'environnement HF_TOKEN). "
            "Ajoute-le dans backend/.env."
        )

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }

    try:
        response = requests.post(
            HF_ROUTER_URL, json=payload, headers=headers, timeout=timeout_s
        )
    except requests.RequestException as e:
        raise LLMError(f"Échec d'appel HF Inference : {e}")

    if response.status_code == 401:
        raise LLMNotConfigured(
            "Token Hugging Face invalide ou expiré. Vérifie la valeur de HF_TOKEN."
        )
    if response.status_code == 503:
        raise LLMError(
            "Le modèle est en cours de chargement côté Hugging Face. Réessaie dans 10-20 s."
        )
    if response.status_code >= 400:
        raise LLMError(
            f"Erreur HF Inference (HTTP {response.status_code}) : {response.text[:300]}"
        )

    try:
        data = response.json()
    except ValueError:
        raise LLMError("Réponse HF non-JSON.")

    # Format OpenAI : choices[0].message.content
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError):
        if isinstance(data, dict) and "error" in data:
            err = data["error"]
            msg = err.get("message") if isinstance(err, dict) else str(err)
            raise LLMError(f"Erreur HF : {msg}")
        raise LLMError(f"Format de réponse HF inattendu : {str(data)[:200]}")


def build_messages(
    system_instructions: str,
    retrieved_context: str,
    history: List[dict],
    user_question: str,
) -> List[dict]:
    """Construit la liste de messages au format OpenAI à partir des éléments RAG.

    - Le contexte récupéré est intégré au message système (donc influence
      tout l'échange sans polluer l'historique visible).
    - L'historique récent (6 derniers max) est inclus tel quel.
    - La question finale est ajoutée comme dernier message user.
    """
    system_content = system_instructions
    if retrieved_context:
        system_content += (
            "\n\n=== Contexte récupéré (sources GreenPath) ===\n"
            f"{retrieved_context}\n"
            "=== Fin du contexte ===\n\n"
            "Réponds en français, de façon concise et factuelle, en t'appuyant sur le contexte. "
            "Si la réponse n'est pas dans le contexte, dis-le honnêtement plutôt que d'inventer."
        )

    messages: List[dict] = [{"role": "system", "content": system_content}]

    # Garde les 6 derniers messages historiques au plus
    for msg in history[-6:]:
        role = msg.get("role")
        content = (msg.get("content") or "").strip()
        if not content or role not in {"user", "assistant"}:
            continue
        messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_question})
    return messages
