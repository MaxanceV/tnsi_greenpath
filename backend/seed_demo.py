"""Script de seed des données démo GreenPath.

Usage (depuis le dossier `backend/` avec le venv activé) :

    python seed_demo.py

Idempotent : relancer le script ne crée pas de doublons. Les entités
manquantes sont créées, celles déjà présentes sont laissées telles quelles.

Crée :
- 6 utilisateurs `entreprise` (une par marque produit)
- 8 produits réalistes avec leurs étapes de supply chain
- 2 utilisateurs `consommateur` (Léa déjà avec un panier rempli)
- Des entrées de consommation pour Léa et Tom (seulement si le compte n'en a
  pas encore — évite les doublons à chaque relance)

Comptes démo créés (mot de passe pour tous : `demo123`) :
    Entreprises :
        petitemarie@demo.greenpath       Petite Marie Textile
        biobuzz@demo.greenpath           BioBuzz Confitures
        chocoprovence@demo.greenpath     Chocolaterie Provençale
        cafe@demo.greenpath              Maison du Café
        vergers@demo.greenpath           Vergers Provence
        domaine@demo.greenpath           Domaine Bio Bordeaux
    Consommateurs :
        lea@demo.greenpath               Léa Dupont
        tom@demo.greenpath               Tom Martin
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from app import models
from app.database import SessionLocal, engine
from app.services.auth import hash_password
from app.services.blockchain import assign_hashes
from app.services.co2 import total_co2_for_product

# Crée le schéma si la DB est neuve
models.Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------- Données démo

@dataclass(frozen=True)
class DemoStep:
    position: int
    name: str
    step_type: str
    weight_kg: float
    supplier: Optional[str] = None
    location: Optional[str] = None
    transport_mode: Optional[str] = None
    distance_km: Optional[float] = None


@dataclass(frozen=True)
class DemoProduct:
    name: str
    description: str
    owner_email: str
    steps: List[DemoStep]


@dataclass(frozen=True)
class DemoUser:
    email: str
    password: str
    company_name: str  # nom commercial pour entreprise, nom de la personne pour consommateur
    role: str  # "entreprise" ou "consommateur"


@dataclass(frozen=True)
class DemoConsumption:
    consumer_email: str
    product_name: str  # recherché par nom dans la table products
    quantity: float = 1.0
    notes: Optional[str] = None


DEMO_USERS: List[DemoUser] = [
    # Entreprises
    DemoUser("petitemarie@demo.greenpath", "demo123", "Petite Marie Textile", "entreprise"),
    DemoUser("biobuzz@demo.greenpath", "demo123", "BioBuzz Confitures", "entreprise"),
    DemoUser("chocoprovence@demo.greenpath", "demo123", "Chocolaterie Provençale", "entreprise"),
    DemoUser("cafe@demo.greenpath", "demo123", "Maison du Café", "entreprise"),
    DemoUser("vergers@demo.greenpath", "demo123", "Vergers Provence", "entreprise"),
    DemoUser("domaine@demo.greenpath", "demo123", "Domaine Bio Bordeaux", "entreprise"),
    # Consommateurs
    DemoUser("lea@demo.greenpath", "demo123", "Léa Dupont", "consommateur"),
    DemoUser("tom@demo.greenpath", "demo123", "Tom Martin", "consommateur"),
]


DEMO_PRODUCTS: List[DemoProduct] = [
    # ---------------------- Textile : Petite Marie ----------------------
    DemoProduct(
        name="T-shirt coton bio",
        description="T-shirt unisexe 180g, coton biologique certifié GOTS",
        owner_email="petitemarie@demo.greenpath",
        steps=[
            DemoStep(1, "Culture du coton bio", "matiere_premiere", 0.3, "FarmIN Bio", "Gujarat, Inde"),
            DemoStep(2, "Transport vers filature", "transport", 0.3, location="Inde → Portugal", transport_mode="bateau", distance_km=11500),
            DemoStep(3, "Filage et tissage", "fabrication", 0.3, "TissagePT", "Porto, Portugal"),
            DemoStep(4, "Confection", "fabrication", 0.3, "Atelier Lyon", "Lyon, France"),
            DemoStep(5, "Livraison entrepôt national", "distribution", 0.3, transport_mode="camion", distance_km=600),
        ],
    ),
    DemoProduct(
        name="Sweat coton bio",
        description="Sweat unisexe 320g, coton biologique GOTS, intérieur molletonné",
        owner_email="petitemarie@demo.greenpath",
        steps=[
            DemoStep(1, "Culture du coton bio", "matiere_premiere", 0.5, "FarmIN Bio", "Gujarat, Inde"),
            DemoStep(2, "Transport vers filature", "transport", 0.5, location="Inde → Portugal", transport_mode="bateau", distance_km=11500),
            DemoStep(3, "Tissage molleton", "fabrication", 0.5, "TissagePT", "Porto, Portugal"),
            DemoStep(4, "Confection", "fabrication", 0.5, "Atelier Lyon", "Lyon, France"),
            DemoStep(5, "Livraison entrepôt", "distribution", 0.5, transport_mode="camion", distance_km=600),
        ],
    ),

    # ---------------------- Alimentation : BioBuzz ----------------------
    DemoProduct(
        name="Confiture fraises bio 250g",
        description="Pot 250g, fraises de Pologne, sans pectine ajoutée",
        owner_email="biobuzz@demo.greenpath",
        steps=[
            DemoStep(1, "Culture des fraises bio", "matiere_premiere", 0.4, "FraiseEU Pologne", "Lublin, Pologne"),
            DemoStep(2, "Transport vers atelier", "transport", 0.4, location="Pologne → France", transport_mode="camion", distance_km=1800),
            DemoStep(3, "Transformation en confiture", "fabrication", 0.25, "Atelier Saveurs FR", "Avignon, France"),
            DemoStep(4, "Distribution magasins", "distribution", 0.25, transport_mode="camion", distance_km=350),
        ],
    ),
    DemoProduct(
        name="Jus d'orange bio 1L",
        description="Bouteille 1L, oranges d'Andalousie, sans sucre ajouté",
        owner_email="biobuzz@demo.greenpath",
        steps=[
            DemoStep(1, "Culture des oranges bio", "matiere_premiere", 1.6, "Naranjas Bio", "Séville, Espagne"),
            DemoStep(2, "Transport vers atelier", "transport", 1.6, location="Espagne → France", transport_mode="camion", distance_km=1200),
            DemoStep(3, "Pressage et embouteillage", "fabrication", 1.0, "Atelier Saveurs FR", "Avignon, France"),
            DemoStep(4, "Distribution magasins", "distribution", 1.0, transport_mode="camion", distance_km=350),
        ],
    ),

    # ---------------------- Chocolat : Chocolaterie Provençale ----------------------
    DemoProduct(
        name="Chocolat noir 70% Équateur",
        description="Tablette 100g, cacao single-origin Équateur, beurre de cacao pur",
        owner_email="chocoprovence@demo.greenpath",
        steps=[
            DemoStep(1, "Culture du cacao", "matiere_premiere", 0.07, "CocoaFair Coop", "Manabí, Équateur"),
            DemoStep(2, "Transport maritime vers Le Havre", "transport", 0.07, location="Équateur → Le Havre", transport_mode="bateau", distance_km=9800),
            DemoStep(3, "Torréfaction et conchage", "fabrication", 0.1, "FabChoco", "Marseille, France"),
            DemoStep(4, "Conditionnement", "fabrication", 0.1, location="Marseille, France"),
            DemoStep(5, "Distribution magasins", "distribution", 0.1, transport_mode="camion", distance_km=500),
        ],
    ),

    # ---------------------- Café : Maison du Café ----------------------
    DemoProduct(
        name="Café arabica Colombie 250g",
        description="Paquet 250g, grains arabica fairtrade, torréfaction artisanale",
        owner_email="cafe@demo.greenpath",
        steps=[
            DemoStep(1, "Culture du café arabica", "matiere_premiere", 0.25, "Coop Caldas", "Manizales, Colombie"),
            DemoStep(2, "Transport maritime", "transport", 0.25, location="Colombie → Marseille", transport_mode="bateau", distance_km=8200),
            DemoStep(3, "Torréfaction artisanale", "fabrication", 0.25, "Maison du Café", "Aix-en-Provence, France"),
            DemoStep(4, "Distribution boutiques", "distribution", 0.25, transport_mode="camion", distance_km=420),
        ],
    ),

    # ---------------------- Fruits & Légumes : Vergers Provence ----------------------
    DemoProduct(
        name="Pommes Gala France 1kg",
        description="Filet 1kg, pommes Gala, vergers du sud-est, récoltées en septembre",
        owner_email="vergers@demo.greenpath",
        steps=[
            DemoStep(1, "Culture en verger", "matiere_premiere", 1.0, "Vergers Provence", "Avignon, France"),
            DemoStep(2, "Conditionnement", "fabrication", 1.0, location="Avignon, France"),
            DemoStep(3, "Distribution magasins", "distribution", 1.0, transport_mode="camion", distance_km=300),
        ],
    ),
    DemoProduct(
        name="Avocats bio Mexique x4",
        description="Filet de 4 avocats Hass bio, importés du Mexique",
        owner_email="vergers@demo.greenpath",
        steps=[
            DemoStep(1, "Culture avocats Hass bio", "matiere_premiere", 0.8, "Aguacates Bio", "Michoacán, Mexique"),
            DemoStep(2, "Transport maritime", "transport", 0.8, location="Mexique → Rotterdam", transport_mode="bateau", distance_km=9000),
            DemoStep(3, "Transport vers entrepôt", "transport", 0.8, location="Rotterdam → France", transport_mode="camion", distance_km=600),
            DemoStep(4, "Distribution magasins", "distribution", 0.8, transport_mode="camion", distance_km=400),
        ],
    ),

    # ---------------------- Vin : Domaine Bio Bordeaux ----------------------
    DemoProduct(
        name="Vin rouge bio Bordeaux 75cl",
        description="Bouteille 75cl, AOC Bordeaux supérieur, viticulture biologique",
        owner_email="domaine@demo.greenpath",
        steps=[
            DemoStep(1, "Viticulture bio", "matiere_premiere", 1.0, "Domaine Bio", "Saint-Émilion, France"),
            DemoStep(2, "Vinification", "fabrication", 1.0, location="Saint-Émilion, France"),
            DemoStep(3, "Embouteillage", "fabrication", 1.2, location="Saint-Émilion, France"),
            DemoStep(4, "Distribution magasins", "distribution", 1.2, transport_mode="camion", distance_km=550),
        ],
    ),
]


# Consommation pré-remplie pour les comptes démo : permet de montrer
# directement un dashboard non vide en démo.
DEMO_CONSUMPTIONS: List[DemoConsumption] = [
    # Léa : profil éco-curieuse, mix textile + alimentation + comparaison local vs importé
    DemoConsumption("lea@demo.greenpath", "T-shirt coton bio", 1.0, "Vu en boutique du quartier"),
    DemoConsumption("lea@demo.greenpath", "Sweat coton bio", 1.0),
    DemoConsumption("lea@demo.greenpath", "Confiture fraises bio 250g", 2.0, "Petit-déjeuner du dimanche"),
    DemoConsumption("lea@demo.greenpath", "Café arabica Colombie 250g", 1.0),
    DemoConsumption("lea@demo.greenpath", "Pommes Gala France 1kg", 1.0, "Local, je préfère"),
    DemoConsumption("lea@demo.greenpath", "Avocats bio Mexique x4", 1.0, "Comparer avec les pommes"),
    DemoConsumption("lea@demo.greenpath", "Chocolat noir 70% Équateur", 1.0),
    DemoConsumption("lea@demo.greenpath", "Jus d'orange bio 1L", 1.0),
    # Tom : profil plus restreint, juste quelques scans
    DemoConsumption("tom@demo.greenpath", "Vin rouge bio Bordeaux 75cl", 1.0, "Dîner samedi"),
    DemoConsumption("tom@demo.greenpath", "Chocolat noir 70% Équateur", 2.0),
    DemoConsumption("tom@demo.greenpath", "Café arabica Colombie 250g", 1.0),
]


# ---------------------------------------------------------------- Logique seed

def _get_or_create_user(db, demo: DemoUser) -> models.User:
    """Renvoie l'utilisateur démo, créé si absent."""
    user = db.query(models.User).filter(models.User.email == demo.email).first()
    if user:
        return user
    user = models.User(
        email=demo.email,
        password_hash=hash_password(demo.password),
        role=demo.role,
        company_name=demo.company_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    label = demo.company_name if demo.role == "entreprise" else f"{demo.company_name} ({demo.role})"
    print(f"  + Utilisateur créé : {demo.email}  →  {label}")
    return user


def _get_or_create_product(db, demo: DemoProduct, owner: models.User) -> tuple[models.Product, bool]:
    """Renvoie (produit, created_now)."""
    existing = (
        db.query(models.Product)
        .filter(models.Product.owner_id == owner.id, models.Product.name == demo.name)
        .first()
    )
    if existing:
        return existing, False

    product = models.Product(
        name=demo.name,
        description=demo.description,
        owner_id=owner.id,
    )
    for step in demo.steps:
        product.steps.append(
            models.Step(
                position=step.position,
                name=step.name,
                step_type=step.step_type,
                supplier=step.supplier,
                location=step.location,
                weight_kg=step.weight_kg,
                transport_mode=step.transport_mode,
                distance_km=step.distance_km,
            )
        )
    db.add(product)
    db.flush()
    assign_hashes(product.steps)
    db.commit()
    db.refresh(product)
    co2 = total_co2_for_product(product)
    print(f"  + Produit créé    : {demo.name} ({len(demo.steps)} étapes, {co2} kg CO₂)")
    return product, True


def _seed_consumptions_for(db, consumer: models.User, entries: List[DemoConsumption]) -> int:
    """Ajoute les consommations seulement si le consommateur n'a aucune entrée.

    Évite les doublons à chaque relance du seed. Si l'on veut re-peupler après
    suppression manuelle des entrées de Léa, c'est sans risque.
    """
    if not entries:
        return 0
    existing = db.query(models.Consumption).filter_by(user_id=consumer.id).count()
    if existing > 0:
        print(f"  · {consumer.email} : déjà {existing} entrée(s) — skip.")
        return 0

    added = 0
    for entry in entries:
        product = db.query(models.Product).filter(models.Product.name == entry.product_name).first()
        if not product:
            print(f"  ! Produit introuvable pour seed conso : {entry.product_name}")
            continue
        consumption = models.Consumption(
            user_id=consumer.id,
            product_id=product.id,
            quantity=entry.quantity,
            notes=entry.notes,
        )
        db.add(consumption)
        added += 1
    db.commit()
    print(f"  + {added} consommation(s) ajoutée(s) pour {consumer.email}")
    return added


def seed() -> None:
    """Point d'entrée du script."""
    db = SessionLocal()
    try:
        print("Seed des données démo GreenPath...")
        print()
        print("Utilisateurs :")
        users_by_email = {u.email: _get_or_create_user(db, u) for u in DEMO_USERS}

        print()
        print("Produits :")
        products_created = 0
        for demo_product in DEMO_PRODUCTS:
            owner = users_by_email[demo_product.owner_email]
            _, created = _get_or_create_product(db, demo_product, owner)
            if created:
                products_created += 1
        products_skipped = len(DEMO_PRODUCTS) - products_created
        print(f"  → {products_created} produit(s) ajouté(s), {products_skipped} déjà présent(s).")

        print()
        print("Consommation :")
        for consumer_user in [u for u in DEMO_USERS if u.role == "consommateur"]:
            consumer = users_by_email[consumer_user.email]
            entries = [c for c in DEMO_CONSUMPTIONS if c.consumer_email == consumer_user.email]
            _seed_consumptions_for(db, consumer, entries)

        print()
        print("Terminé. Comptes démo disponibles (mot de passe : demo123) :")
        print("  --- Entreprises ---")
        for u in DEMO_USERS:
            if u.role == "entreprise":
                print(f"    {u.email}  →  {u.company_name}")
        print("  --- Consommateurs ---")
        for u in DEMO_USERS:
            if u.role == "consommateur":
                print(f"    {u.email}  →  {u.company_name}")
        print()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
