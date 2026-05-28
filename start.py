#!/usr/bin/env python3
"""Lance GreenPath (backend + frontend) en une commande, sur tout OS.

Usage :
    python start.py              # macOS, Linux, Windows
    ./start.sh                   # wrapper macOS/Linux
    start.bat                    # wrapper Windows

Fonctionnalités :
- Détecte l'OS et le bon chemin du venv (.venv/bin/ vs .venv/Scripts/)
- Vérifie les prérequis (venv + node_modules)
- Exécute le seed si la base est vide ou inexistante (idempotent)
- Lance uvicorn + ng serve avec logs redirigés dans logs/
- Affiche les URLs et les comptes démo
- Arrêt propre des deux serveurs sur Ctrl+C
"""

from __future__ import annotations

import platform
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
LOGS = ROOT / "logs"
IS_WINDOWS = platform.system() == "Windows"


# ---------------------------------------------------------------- Helpers OS

def venv_python() -> Path:
    """Chemin de l'exécutable Python dans le venv backend, selon l'OS."""
    if IS_WINDOWS:
        return BACKEND / ".venv" / "Scripts" / "python.exe"
    return BACKEND / ".venv" / "bin" / "python"


def npm_executable() -> str:
    """Nom de la commande npm selon l'OS."""
    return "npm.cmd" if IS_WINDOWS else "npm"


def log(msg: str) -> None:
    print(f"[GreenPath] {msg}", flush=True)


# ---------------------------------------------------------------- Prérequis

def check_prereqs() -> None:
    if not (BACKEND / ".venv").exists():
        log("ERREUR : venv Python manquant. Première installation :")
        log("  cd backend")
        if IS_WINDOWS:
            log("  python -m venv .venv")
            log("  .venv\\Scripts\\activate")
        else:
            log("  python -m venv .venv")
            log("  source .venv/bin/activate")
        log("  pip install -r requirements.txt")
        sys.exit(1)

    if not (FRONTEND / "node_modules").exists():
        log("ERREUR : node_modules manquant. Première installation :")
        log("  cd frontend && npm install")
        sys.exit(1)


# ---------------------------------------------------------------- Seed

def db_needs_seed() -> bool:
    """True si greenpath.db n'existe pas, ou contient 0 produit."""
    db_path = BACKEND / "greenpath.db"
    if not db_path.exists():
        return True

    # Compte les produits via une petite invocation Python
    code = (
        "from app.database import SessionLocal\n"
        "from app import models\n"
        "db = SessionLocal()\n"
        "print(db.query(models.Product).count())\n"
        "db.close()\n"
    )
    result = subprocess.run(
        [str(venv_python()), "-c", code],
        cwd=BACKEND,
        capture_output=True,
        text=True,
    )
    output = (result.stdout or "").strip()
    return output == "0" or output == ""


def run_seed() -> None:
    log("Base de données vide → exécution du seed de démonstration...")
    subprocess.run([str(venv_python()), "seed_demo.py"], cwd=BACKEND, check=True)


# ---------------------------------------------------------------- Attente HTTP

def wait_for_http(url: str, timeout_s: int, name: str) -> bool:
    """Attend qu'une URL réponde 200, ou abandonne après `timeout_s`."""
    for _ in range(timeout_s):
        try:
            with urllib.request.urlopen(url, timeout=1) as resp:
                if 200 <= resp.status < 500:
                    return True
        except (urllib.error.URLError, ConnectionRefusedError, OSError, TimeoutError):
            pass
        time.sleep(1)
    log(f"ERREUR : {name} ne répond pas après {timeout_s}s. Voir logs/{name}.log")
    return False


# ---------------------------------------------------------------- Lancement

def launch_backend() -> subprocess.Popen:
    log("Démarrage du backend (FastAPI / uvicorn)...")
    log_file = open(LOGS / "backend.log", "w", encoding="utf-8")
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if IS_WINDOWS else 0
    return subprocess.Popen(
        [
            str(venv_python()),
            "-m", "uvicorn",
            "app.main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--log-level", "warning",
        ],
        cwd=BACKEND,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=creationflags,
    )


def launch_frontend() -> subprocess.Popen:
    log("Démarrage du frontend (Angular / vite)...")
    log_file = open(LOGS / "frontend.log", "w", encoding="utf-8")
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if IS_WINDOWS else 0
    # Sur Windows, npm.cmd doit être lancé via shell pour bien résoudre le PATH.
    return subprocess.Popen(
        [npm_executable(), "start"],
        cwd=FRONTEND,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        shell=IS_WINDOWS,
        creationflags=creationflags,
    )


def terminate_processes(*procs: subprocess.Popen) -> None:
    """Arrête proprement les processus, puis force au bout de 5s si besoin."""
    for proc in procs:
        if proc.poll() is None:
            try:
                if IS_WINDOWS:
                    proc.send_signal(signal.CTRL_BREAK_EVENT)
                else:
                    proc.terminate()
            except Exception:
                pass
    deadline = time.time() + 5
    for proc in procs:
        remaining = max(0, deadline - time.time())
        try:
            proc.wait(timeout=remaining)
        except subprocess.TimeoutExpired:
            try:
                proc.kill()
            except Exception:
                pass


# ---------------------------------------------------------------- Affichage

URLS_BANNER = """
========================================================================
  GreenPath est lancé !
  ----------------------
  Frontend : http://localhost:4200
  Backend  : http://localhost:8000
  Swagger  : http://localhost:8000/docs

  Comptes démo :
    Admin        admin@greenpath.com         / admin123
    Entreprise   petitemarie@demo.greenpath  / demo123
    Consommateur lea@demo.greenpath          / demo123  (avec panier rempli)

  Logs : tail -f logs/backend.log  ou  logs/frontend.log
  Appuyez sur Ctrl+C pour tout arrêter.
========================================================================
"""


# ---------------------------------------------------------------- Main

def main() -> None:
    check_prereqs()
    LOGS.mkdir(exist_ok=True)

    if db_needs_seed():
        run_seed()
    else:
        log("Base de données déjà peuplée → seed ignoré.")

    backend = launch_backend()
    if not wait_for_http("http://localhost:8000/", 20, "backend"):
        terminate_processes(backend)
        sys.exit(1)
    log("Backend prêt → http://localhost:8000")

    frontend = launch_frontend()
    if not wait_for_http("http://localhost:4200/", 60, "frontend"):
        terminate_processes(backend, frontend)
        sys.exit(1)
    log("Frontend prêt → http://localhost:4200")

    print(URLS_BANNER)

    try:
        # Attend qu'un des deux meure, ou Ctrl+C
        while True:
            time.sleep(1)
            if backend.poll() is not None:
                log("Le backend s'est arrêté. Arrêt complet.")
                break
            if frontend.poll() is not None:
                log("Le frontend s'est arrêté. Arrêt complet.")
                break
    except KeyboardInterrupt:
        log("Ctrl+C reçu. Arrêt en cours...")
    finally:
        terminate_processes(backend, frontend)
        log("Tout est arrêté.")


if __name__ == "__main__":
    main()
