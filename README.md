# GreenPath — MVP Traçabilité RSE

> **Problématique :** Comment permettre aux entreprises européennes de tracer l'impact environnemental de leurs produits le long de leur supply chain afin de répondre aux obligations réglementaires et valoriser leur engagement RSE ?

---

## L'équipe et la répartition des tâches

| Personne | Lot fonctionnel | État |
|---|---|---|
| **Baptiste Matrat** | Saisie produit + étapes (formulaire, validation, CRUD) | Fait |
| **Justine Rault** | Calcul CO₂ + dashboard (KPIs, détail par étape, recherche/filtres) | Fait |
| **(temporaire — Baptiste)** | Auth (login, rôles, gestion utilisateurs, vues filtrées par entreprise) | Fait |
| **Marie Probert** | Page publique consommateur + cohérence frontend | À faire |
| **Ferdinand Martin-Lavigne** | Fake blockchain (hash SHA-256) + QR code | À faire |
| **Maxance Villame** | Setup technique, jeu de données démo, tests | À faire |
| **Abdrahamane Mbourou Camara** | Coordination (auth déjà implémentée) | À faire |

---

## Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | **Angular 19** (standalone components, signals, Reactive Forms) | Organisation claire, idéal pour le travail en équipe |
| Backend | **Python 3 + FastAPI** | API REST rapide, doc Swagger auto |
| ORM | **SQLAlchemy** | Mapping objet/relationnel simple |
| Base de données | **SQLite** (fichier local `greenpath.db`) | Zéro install |
| Validation | **Pydantic v2** + **email-validator** | Validation des entrées API |
| Auth | **JWT** (`pyjwt`) + **bcrypt** (`passlib`) | Standard pour SPA + hash de passwords sécurisé |
| Blockchain (simulée) | Fonction `anchor()` → hash SHA-256 | Remplaçable par Hyperledger en V2 |
| QR Code | `qrcode` (Python) | Un QR par produit |

---

## Schéma de la base de données

```mermaid
erDiagram
    USER ||--o{ PRODUCT : "possède"
    PRODUCT ||--o{ STEP : "contient (cascade delete)"

    USER {
        INTEGER id PK
        STRING email UK "unique, validé"
        STRING password_hash "bcrypt"
        STRING role "admin | entreprise"
        STRING company_name "nom commercial"
        DATETIME created_at
    }

    PRODUCT {
        INTEGER id PK
        INTEGER owner_id FK "→ users.id, ON DELETE SET NULL"
        STRING name "obligatoire, 1-120 car."
        STRING description "optionnel, max 500 car."
        DATETIME created_at
    }

    STEP {
        INTEGER id PK
        INTEGER product_id FK "→ products.id, ON DELETE CASCADE"
        INTEGER position "ordre, ≥ 1"
        STRING name "obligatoire"
        STRING step_type "matiere_premiere | fabrication | transport | distribution"
        STRING supplier "optionnel"
        STRING location "optionnel"
        FLOAT weight_kg "> 0"
        STRING transport_mode "camion | bateau | avion | train | aucun"
        FLOAT distance_km "≥ 0, optionnel"
    }
```

### Notes importantes

- **Cascade delete** sur `STEP` : supprimer un produit supprime ses étapes.
- **SET NULL** sur `PRODUCT.owner_id` : si on supprime un utilisateur, ses produits restent mais perdent leur propriétaire (seul l'admin les verra).
- **Le CO₂ n'est PAS stocké** : recalculé à la volée depuis `services/co2.py` (facteurs ADEME).
- Le mot de passe est **hashé en bcrypt** avant insertion : la DB ne contient jamais de mot de passe en clair.

---

## Système d'authentification et de rôles

### Deux rôles

| Rôle | Peut faire |
|---|---|
| **`admin`** (Super Admin) | Voir tous les produits de toutes les entreprises · Créer / modifier / supprimer des utilisateurs · Changer les rôles · Accéder à `/admin/users` |
| **`entreprise`** | Voir / créer / modifier / supprimer **uniquement ses propres produits** |
| (non-connecté) | Accéder à la page publique d'un produit via `/public/products/{id}` (utilisé par le QR code consommateur) |

### Compte admin par défaut

Au tout premier démarrage du backend, si aucun utilisateur n'existe en base, un admin est créé automatiquement :

| Email | Mot de passe |
|---|---|
| `admin@greenpath.com` | `admin123` |

> **À changer en production** ! Le mot de passe peut être modifié depuis la page `/admin/users` une fois connecté.

### Flux de connexion (JWT)

1. L'utilisateur poste son email/mot de passe sur `POST /auth/login`.
2. Le backend vérifie le hash bcrypt et renvoie un **JWT** signé (clé `HS256`, durée 24h) + les infos user.
3. Le frontend stocke le token dans `localStorage` et l'envoie sur toutes les requêtes suivantes dans l'en-tête `Authorization: Bearer <token>` (via un intercepteur HTTP Angular).
4. Si une requête renvoie `401`, l'intercepteur déconnecte l'utilisateur automatiquement.

---

## Structure du projet

```
tnsi_greenpath/
├── backend/
│   ├── app/
│   │   ├── main.py                # Point d'entrée FastAPI + bootstrap admin + CORS
│   │   ├── database.py            # Connexion SQLite + session SQLAlchemy
│   │   ├── models.py              # Tables User, Product, Step
│   │   ├── schemas.py             # Schémas Pydantic + validations
│   │   ├── dependencies.py        # get_current_user, require_admin
│   │   ├── routers/
│   │   │   ├── auth.py            # /auth/login, /auth/me
│   │   │   ├── users.py           # /users (admin seulement)
│   │   │   ├── products.py        # /products (filtré par rôle)
│   │   │   └── public.py          # /public/products/{id} (pour le QR code)
│   │   └── services/
│   │       ├── auth.py            # bcrypt + JWT
│   │       └── co2.py             # Calcul d'empreinte carbone (facteurs ADEME)
│   ├── requirements.txt
│   └── greenpath.db               # SQLite (créé au runtime)
│
└── frontend/
    ├── src/app/
    │   ├── app.component.ts        # Shell avec barre de navigation + logout
    │   ├── app.config.ts           # Providers (HttpClient + interceptor JWT)
    │   ├── app.routes.ts           # Routes protégées par guards
    │   ├── models/
    │   │   ├── product.model.ts
    │   │   └── auth.model.ts       # User, UserRole, LoginRequest, etc.
    │   ├── services/
    │   │   ├── product.service.ts
    │   │   ├── user.service.ts     # CRUD users (admin only)
    │   │   ├── auth.service.ts     # login, logout, currentUser signal
    │   │   └── auth.interceptor.ts # ajoute le Bearer token + gère 401
    │   ├── guards/
    │   │   └── auth.guard.ts       # authGuard, adminGuard, guestGuard
    │   └── components/
    │       ├── login/              # Page de connexion
    │       ├── product-form/       # Création/édition d'un produit
    │       ├── product-list/       # Dashboard RSE (filtré selon rôle)
    │       └── admin-users/        # Gestion des utilisateurs (admin only)
    ├── angular.json
    └── package.json
```

---

## Guide de démarrage

### 1. Cloner le projet

```bash
git clone https://github.com/MaxanceV/tnsi_greenpath
cd tnsi_greenpath
```

### 2. Lancer le backend (FastAPI)

```bash
cd backend

# Créer l'environnement virtuel
python -m venv .venv

# Activer
source .venv/bin/activate              # macOS / Linux
# .venv\Scripts\activate               # Windows (cmd)
# .venv\Scripts\Activate.ps1           # Windows (PowerShell)

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur avec rechargement auto
uvicorn app.main:app --reload
```

- API : http://localhost:8000
- Documentation Swagger interactive : **http://localhost:8000/docs**
- Au premier démarrage, l'admin par défaut est créé (cf. section auth ci-dessus).

### 3. Lancer le frontend (Angular)

Dans **un autre terminal** :

```bash
cd frontend

# Installer les dépendances (la première fois uniquement)
npm install

# Lancer le serveur de dev (bind sur 0.0.0.0 pour permettre l'accès LAN)
npm start
```

- Application : **http://localhost:4200**
- Tu seras redirigé vers `/login`. Utilise `admin@greenpath.com` / `admin123`.

### 4. Accéder depuis un autre appareil sur le même Wi-Fi (téléphone, ordi voisin)

L'application est conçue pour fonctionner sur le **réseau local** sans config supplémentaire — pratique pour scanner les QR codes depuis un téléphone pendant une démo.

```bash
# Affiche l'URL à partager
./scripts/show-lan-url.sh
```

Le script affiche quelque chose comme :

```
Frontend  : http://192.168.1.42:4200
Backend   : http://192.168.1.42:8000
```

Sur le téléphone (connecté au même Wi-Fi), ouvre simplement `http://192.168.1.42:4200`.

**Comment ça marche** :
- Le backend bind sur `0.0.0.0:8000` (toutes les interfaces) via `uvicorn --host 0.0.0.0`
- Le frontend bind sur `0.0.0.0:4200` via `ng serve --host 0.0.0.0`
- CORS du backend accepte toute origine `http://<n'importe-quelle-IP>:4200`
- Le frontend détecte l'IP utilisée par l'utilisateur et appelle l'API sur cette même IP (cf. `src/app/config/api.config.ts`)
- Le backend génère le QR code avec l'IP LAN (déduit de l'`Origin` HTTP) → un QR généré sur `192.168.1.42:4200` est scannable par un téléphone sur le même Wi-Fi

**Si ça ne marche pas** :
- macOS peut afficher une popup demandant si Python/Node peut accepter les connexions entrantes → **Autoriser**
- Vérifie que les deux appareils sont bien sur le **même réseau Wi-Fi** (pas sur cellulaire / hotspot)
- Désactive temporairement le pare-feu macOS si nécessaire : *Réglages Système → Réseau → Pare-feu*

---

## API REST

Toutes les routes sont documentées et testables sur http://localhost:8000/docs.

### Auth

| Méthode | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Échange email/password contre un JWT |
| `GET` | `/auth/me` | Connecté | Infos de l'utilisateur courant |

### Produits (filtrés automatiquement par rôle)

| Méthode | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/products` | Connecté | Créer un produit (le `owner_id` est l'utilisateur connecté) |
| `GET` | `/products` | Connecté | Lister ses produits (admin : tous) |
| `GET` | `/products/{id}` | Connecté | Détail (403 si pas propriétaire et pas admin) |
| `PUT` | `/products/{id}` | Connecté | Mettre à jour |
| `DELETE` | `/products/{id}` | Connecté | Supprimer |
| `GET` | `/products/stats/summary` | Connecté | KPIs du dashboard (filtrés par rôle) |

### Utilisateurs (admin uniquement)

| Méthode | URL | Description |
|---|---|---|
| `GET` | `/users` | Lister tous les utilisateurs |
| `POST` | `/users` | Créer un utilisateur |
| `PUT` | `/users/{id}` | Modifier (entreprise, rôle, mot de passe) |
| `DELETE` | `/users/{id}` | Supprimer (impossible de se supprimer soi-même) |

### Public (pour la future page consommateur du QR code)

| Méthode | URL | Description |
|---|---|---|
| `GET` | `/public/products/{id}` | Détail public d'un produit, sans authentification |

### Exemple : se connecter et créer un produit

```bash
# 1. Login → récupère le token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@greenpath.com","password":"admin123"}' \
  | grep -oE '"access_token":"[^"]+' | cut -d'"' -f4)

# 2. Créer un produit avec le token
curl -X POST http://localhost:8000/products \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "T-shirt coton bio",
    "steps": [
      { "position": 1, "name": "Culture", "step_type": "matiere_premiere", "weight_kg": 0.3, "location": "Inde" },
      { "position": 2, "name": "Livraison", "step_type": "transport", "weight_kg": 0.3, "transport_mode": "bateau", "distance_km": 8000 }
    ]
  }'
```

---

## Calcul CO₂ (facteurs ADEME mockés)

Le calcul se fait dans `backend/app/services/co2.py`.

**Transport** : kg CO₂ par tonne·km

| Mode | Facteur |
|---|---|
| Avion | 1.50 |
| Camion | 0.10 |
| Train | 0.025 |
| Bateau | 0.015 |
| Aucun | 0.0 |

**Production / matière** (si l'étape n'a pas de transport) : kg CO₂ par kg

| Type | Facteur |
|---|---|
| Matière première | 4.0 |
| Fabrication | 5.0 |
| Distribution | 0.2 |

**Règle** : si une étape a `distance_km > 0` ET un `transport_mode` (≠ aucun), on calcule un CO₂ de transport. Sinon on applique le facteur de base lié au `step_type`.

---

## Vues selon le rôle

### Vue Entreprise (rôle `entreprise`)
- Voit uniquement ses propres produits dans le dashboard
- Peut créer, modifier, supprimer **ses** produits
- Les KPIs (CO₂ moyen, total) sont calculés sur ses produits uniquement
- N'a pas accès à `/admin/users` (redirigé vers `/products`)

### Vue Super Admin (rôle `admin`)
- Voit **tous les produits de toutes les entreprises** dans le dashboard
- Une colonne "Entreprise" apparaît sur chaque ligne
- A accès au lien **"Utilisateurs"** dans la barre de navigation
- Peut créer / modifier / supprimer des utilisateurs et changer leur rôle
- Ne peut pas se retirer son propre rôle admin ni se supprimer (garde-fou)

### Vue Publique (non connecté)
- Aucun accès au dashboard (redirigé vers `/login`)
- Accès en lecture seule à `/public/products/{id}` (utilisé par le QR code consommateur)
- La page consommateur frontend est en cours (Marie)

---

## Fonctionnalités déjà implémentées

### Saisie produit + étapes (Baptiste)
- Formulaire Angular avec étapes dynamiques (ajouter/supprimer/réordonner)
- Validation côté front (Reactive Forms) **et** côté back (Pydantic)

### Dashboard RSE (Justine)
- 4 KPIs en cartes (auto-filtrés selon rôle)
- Liste avec colonne CO₂ (+ colonne Entreprise visible uniquement par l'admin)
- Modale de détail avec barre de répartition multicolore
- Recherche textuelle + filtres avancés (type, transport, fournisseur, lieu, poids, distance, CO₂) dans une modale dédiée
- Chips de filtres actifs retirables

### Authentification et rôles
- Login JWT, intercepteur HTTP, guards de routes
- Vues filtrées automatiquement par `owner_id` côté backend
- Page admin de gestion des utilisateurs (création, édition, changement de rôle, suppression)
- Endpoint public pour la future page consommateur

---

## Reste à faire (V2 / autres binômes)

- **Page publique consommateur** (Marie) : URL `/p/{id}` accessible via QR code, design simplifié
- **Génération de QR code** (Ferdinand) : un QR par produit pointant vers la page publique
- **Fake blockchain** (Ferdinand) : hash SHA-256 par étape, badge « Vérifié »
- **Jeu de données démo** (Maxance) : 3 produits réalistes pour la démo
- **Tests** (Maxance) : Pytest sur CO₂ et validation
- **Sécurité prod** (Abdrahamane) : `SECRET_KEY` en variable d'environnement, durée de token configurable, refresh token éventuellement

---

## Conventions de code

- **Python** : PEP 8, type hints partout, logique métier dans `services/`, validations dans Pydantic.
- **TypeScript / Angular** : composants standalone, `inject()`, **signals** pour l'état réactif, Reactive Forms.
- **Git** : `feature/<nom>`. PR avec relecture avant merge sur `main`.

---

## Dépannage rapide

| Problème | Solution |
|---|---|
| `npm install` échoue avec `EACCES` sur le cache | `npm install --cache /tmp/npm-cache` |
| `passlib` plante avec `password cannot be longer than 72 bytes` | Vérifier que `bcrypt<4.1` est bien installé (`pip install "bcrypt<4.1"`) |
| Login refusé alors que je connais le password | Si tu as ajouté un user "à la main" en SQL, son password n'est pas hashé — recrée-le via l'API |
| Front bloqué sur le login en boucle | Le token a expiré (24h) → re-login. Si ça persiste, vide le `localStorage` du navigateur |
| `greenpath.db` corrompu / je veux repartir à zéro | Supprimer le fichier `backend/greenpath.db` (l'admin sera re-créé) |
| Je veux changer la `SECRET_KEY` du JWT | Modifier `backend/app/services/auth.py`. En prod, à mettre en variable d'env |
| Un produit n'affiche pas de CO₂ | Vérifier `weight_kg > 0`, et soit `step_type` valide, soit `transport_mode + distance_km` |
| Erreur CORS `localhost:4200` | Vérifier que le backend tourne et que CORS est ouvert sur `localhost:4200` dans `main.py` |
