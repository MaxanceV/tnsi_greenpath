# GreenPath - MVP Traçabilité RSE

**Problématique :** Comment permettre aux entreprises européennes de tracer l'impact environnemental de leurs produits le long de leur supply chain afin de répondre aux obligations réglementaires et valoriser leur engagement RSE ?

---

## L'équipe
* Abdrahamane Mbourou Camara
* Baptiste Matrat
* Ferdinand Martin-Lavigne
* Justine Rault
* Marie Probert
* Maxance Villame

---

## Stack Technique
* **Frontend :** Angular
* **Backend :** Python (FastAPI)
* **Base de données :** SQLite (Fichier local)

---

## Guide de démarrage

Pour faire tourner le projet localement sur votre machine, suivez les étapes ci-dessous après avoir cloné le dépôt.

### 1. Cloner le projet
bash
git clone https://github.com/MaxanceV/tnsi_greenpath
cd greenpath

### 2. Initialiser et lancer le Frontend (Angular)
Le dossier contenant les modules d'Angular (node_modules) est ignoré par Git. Vous devez obligatoirement installer les dépendances avant de lancer le serveur.

Aller dans le dossier frontend
cd frontend

Installer les packages nécessaires
npm install

Lancer le serveur de développement local npm start (ou "ng serve" si vous avez l'Angular CLI installé globalement)

Le frontend sera accessible sur http://localhost:4200

### 3. Initialiser et lancer le Backend (FastAPI)
Il est fortement recommandé de créer un environnement virtuel Python pour isoler les dépendances du projet.

Revenir à la racine puis aller dans le backend
cd ../backend

Créer l'environnement virtuel (.venv)
python -m venv .venv

Activer l'environnement virtuel :
Sur Windows (Command Prompt) :
.venv\Scripts\activate
Sur Windows (PowerShell) :
.venv\Scripts\Activate.ps1
Sur Mac / Linux :
source .venv/bin/activate

Installer les dépendances Python
pip install -r requirements.txt

Lancer le serveur FastAPI avec rechargement automatique
uvicorn app.main:app --reload
