"""Script de seed des données démo GreenPath.

Usage (depuis le dossier `backend/` avec le venv activé) :

    python seed_demo.py

Idempotent : relancer le script ne crée pas de doublons.

Crée :
- 11 utilisateurs `entreprise` (textile, alimentaire, électronique, cosmétique, etc.)
- ~30 produits variés avec leurs étapes de supply chain réalistes
- 2 utilisateurs `consommateur` (Léa et Tom) avec un panier rempli
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from app import models
from app.database import SessionLocal, engine
from app.services.auth import hash_password
from app.services.blockchain import assign_hashes
from app.services.co2 import total_co2_for_product

models.Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------- Types

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
    company_name: str
    role: str


@dataclass(frozen=True)
class DemoConsumption:
    consumer_email: str
    product_name: str
    quantity: float = 1.0
    notes: Optional[str] = None


# ---------------------------------------------------------------- Données

DEMO_USERS: List[DemoUser] = [
    # ===== Entreprises =====
    DemoUser("petitemarie@demo.greenpath", "demo123", "Petite Marie Textile", "entreprise"),
    DemoUser("biobuzz@demo.greenpath", "demo123", "BioBuzz Confitures", "entreprise"),
    DemoUser("chocoprovence@demo.greenpath", "demo123", "Chocolaterie Provençale", "entreprise"),
    DemoUser("cafe@demo.greenpath", "demo123", "Maison du Café", "entreprise"),
    DemoUser("vergers@demo.greenpath", "demo123", "Vergers Provence", "entreprise"),
    DemoUser("domaine@demo.greenpath", "demo123", "Domaine Bio Bordeaux", "entreprise"),
    DemoUser("ecotech@demo.greenpath", "demo123", "EcoTech Reconditionné", "entreprise"),
    DemoUser("pure@demo.greenpath", "demo123", "Pure Cosmétiques", "entreprise"),
    DemoUser("cleanhome@demo.greenpath", "demo123", "CleanHome Écologique", "entreprise"),
    DemoUser("laitnature@demo.greenpath", "demo123", "Lait Nature", "entreprise"),
    DemoUser("paperleaf@demo.greenpath", "demo123", "PaperLeaf Recyclé", "entreprise"),
    # ===== Consommateurs =====
    DemoUser("lea@demo.greenpath", "demo123", "Léa Dupont", "consommateur"),
    DemoUser("tom@demo.greenpath", "demo123", "Tom Martin", "consommateur"),
]


DEMO_PRODUCTS: List[DemoProduct] = [
    # ============ Textile : Petite Marie ============
    DemoProduct(
        "T-shirt coton bio",
        "T-shirt unisexe 180g, coton biologique certifié GOTS.",
        "petitemarie@demo.greenpath",
        [
            DemoStep(1, "Culture du coton bio", "matiere_premiere", 0.3, "FarmIN Bio", "Gujarat, Inde"),
            DemoStep(2, "Transport vers filature", "transport", 0.3, location="Inde → Portugal", transport_mode="bateau", distance_km=11500),
            DemoStep(3, "Filage et tissage", "fabrication", 0.3, "TissagePT", "Porto, Portugal"),
            DemoStep(4, "Confection", "fabrication", 0.3, "Atelier Lyon", "Lyon, France"),
            DemoStep(5, "Livraison entrepôt", "distribution", 0.3, transport_mode="camion", distance_km=600),
        ],
    ),
    DemoProduct(
        "Sweat coton bio",
        "Sweat unisexe 320g, coton biologique GOTS, intérieur molletonné.",
        "petitemarie@demo.greenpath",
        [
            DemoStep(1, "Culture du coton bio", "matiere_premiere", 0.5, "FarmIN Bio", "Gujarat, Inde"),
            DemoStep(2, "Transport vers filature", "transport", 0.5, location="Inde → Portugal", transport_mode="bateau", distance_km=11500),
            DemoStep(3, "Tissage molleton", "fabrication", 0.5, "TissagePT", "Porto, Portugal"),
            DemoStep(4, "Confection", "fabrication", 0.5, "Atelier Lyon", "Lyon, France"),
            DemoStep(5, "Livraison entrepôt", "distribution", 0.5, transport_mode="camion", distance_km=600),
        ],
    ),
    DemoProduct(
        "Jean denim recyclé",
        "Jean unisexe en denim issu de coton recyclé à 60%.",
        "petitemarie@demo.greenpath",
        [
            DemoStep(1, "Récupération coton recyclé", "matiere_premiere", 0.6, "RecycleCotton", "Tanger, Maroc"),
            DemoStep(2, "Transport vers tissage", "transport", 0.6, location="Maroc → Espagne", transport_mode="camion", distance_km=900),
            DemoStep(3, "Tissage denim", "fabrication", 0.6, "DenimES", "Valence, Espagne"),
            DemoStep(4, "Confection et délavage", "fabrication", 0.6, "Atelier Lyon", "Lyon, France"),
            DemoStep(5, "Livraison entrepôt", "distribution", 0.6, transport_mode="camion", distance_km=600),
        ],
    ),
    DemoProduct(
        "Robe en lin",
        "Robe estivale en lin français, manches courtes.",
        "petitemarie@demo.greenpath",
        [
            DemoStep(1, "Culture du lin", "matiere_premiere", 0.4, "LinNormand", "Caen, France"),
            DemoStep(2, "Filage et tissage", "fabrication", 0.4, "TissageNormandie", "Rouen, France"),
            DemoStep(3, "Confection", "fabrication", 0.4, "Atelier Lyon", "Lyon, France"),
            DemoStep(4, "Livraison entrepôt", "distribution", 0.4, transport_mode="camion", distance_km=500),
        ],
    ),

    # ============ BioBuzz Confitures ============
    DemoProduct(
        "Confiture fraises bio 250g",
        "Pot 250g, fraises de Pologne, sans pectine ajoutée.",
        "biobuzz@demo.greenpath",
        [
            DemoStep(1, "Culture des fraises bio", "matiere_premiere", 0.4, "FraiseEU Pologne", "Lublin, Pologne"),
            DemoStep(2, "Transport vers atelier", "transport", 0.4, location="Pologne → France", transport_mode="camion", distance_km=1800),
            DemoStep(3, "Transformation en confiture", "fabrication", 0.25, "Atelier Saveurs FR", "Avignon, France"),
            DemoStep(4, "Distribution magasins", "distribution", 0.25, transport_mode="camion", distance_km=350),
        ],
    ),
    DemoProduct(
        "Jus d'orange bio 1L",
        "Bouteille 1L, oranges d'Andalousie, sans sucre ajouté.",
        "biobuzz@demo.greenpath",
        [
            DemoStep(1, "Culture des oranges bio", "matiere_premiere", 1.6, "Naranjas Bio", "Séville, Espagne"),
            DemoStep(2, "Transport vers atelier", "transport", 1.6, location="Espagne → France", transport_mode="camion", distance_km=1200),
            DemoStep(3, "Pressage et embouteillage", "fabrication", 1.0, "Atelier Saveurs FR", "Avignon, France"),
            DemoStep(4, "Distribution magasins", "distribution", 1.0, transport_mode="camion", distance_km=350),
        ],
    ),
    DemoProduct(
        "Miel d'acacia 500g",
        "Pot 500g, miel d'acacia récolté en Bulgarie.",
        "biobuzz@demo.greenpath",
        [
            DemoStep(1, "Apiculture", "matiere_premiere", 0.5, "Apiculteurs BG", "Plovdiv, Bulgarie"),
            DemoStep(2, "Transport vers conditionnement", "transport", 0.5, location="Bulgarie → France", transport_mode="camion", distance_km=2200),
            DemoStep(3, "Mise en pot", "fabrication", 0.5, "Atelier Saveurs FR", "Avignon, France"),
            DemoStep(4, "Distribution magasins", "distribution", 0.5, transport_mode="camion", distance_km=350),
        ],
    ),

    # ============ Chocolaterie Provençale ============
    DemoProduct(
        "Chocolat noir 70% Équateur",
        "Tablette 100g, cacao single-origin Équateur, beurre de cacao pur.",
        "chocoprovence@demo.greenpath",
        [
            DemoStep(1, "Culture du cacao", "matiere_premiere", 0.07, "CocoaFair Coop", "Manabí, Équateur"),
            DemoStep(2, "Transport maritime", "transport", 0.07, location="Équateur → Le Havre", transport_mode="bateau", distance_km=9800),
            DemoStep(3, "Torréfaction et conchage", "fabrication", 0.1, "FabChoco", "Marseille, France"),
            DemoStep(4, "Conditionnement", "fabrication", 0.1, location="Marseille, France"),
            DemoStep(5, "Distribution magasins", "distribution", 0.1, transport_mode="camion", distance_km=500),
        ],
    ),
    DemoProduct(
        "Chocolat au lait 32%",
        "Tablette 100g, cacao Ghana, lait de vache français.",
        "chocoprovence@demo.greenpath",
        [
            DemoStep(1, "Culture du cacao", "matiere_premiere", 0.05, "Cacao Ghana Coop", "Kumasi, Ghana"),
            DemoStep(2, "Transport maritime", "transport", 0.05, location="Ghana → Le Havre", transport_mode="bateau", distance_km=6500),
            DemoStep(3, "Mélange et conchage", "fabrication", 0.1, "FabChoco", "Marseille, France"),
            DemoStep(4, "Distribution magasins", "distribution", 0.1, transport_mode="camion", distance_km=500),
        ],
    ),
    DemoProduct(
        "Tablette praliné amande",
        "Tablette 100g, chocolat au lait fourré praliné amande.",
        "chocoprovence@demo.greenpath",
        [
            DemoStep(1, "Cacao Ghana", "matiere_premiere", 0.04, "Cacao Ghana Coop", "Kumasi, Ghana"),
            DemoStep(2, "Culture amandes", "matiere_premiere", 0.03, "Provence Amandes", "Aix, France"),
            DemoStep(3, "Transport cacao maritime", "transport", 0.04, location="Ghana → Le Havre", transport_mode="bateau", distance_km=6500),
            DemoStep(4, "Fabrication et fourrage", "fabrication", 0.1, "FabChoco", "Marseille, France"),
            DemoStep(5, "Distribution magasins", "distribution", 0.1, transport_mode="camion", distance_km=500),
        ],
    ),

    # ============ Maison du Café ============
    DemoProduct(
        "Café arabica Colombie 250g",
        "Paquet 250g, grains arabica fairtrade, torréfaction artisanale.",
        "cafe@demo.greenpath",
        [
            DemoStep(1, "Culture du café arabica", "matiere_premiere", 0.25, "Coop Caldas", "Manizales, Colombie"),
            DemoStep(2, "Transport maritime", "transport", 0.25, location="Colombie → Marseille", transport_mode="bateau", distance_km=8200),
            DemoStep(3, "Torréfaction artisanale", "fabrication", 0.25, "Maison du Café", "Aix-en-Provence, France"),
            DemoStep(4, "Distribution boutiques", "distribution", 0.25, transport_mode="camion", distance_km=420),
        ],
    ),
    DemoProduct(
        "Café arabica Éthiopie 250g",
        "Paquet 250g, single-origin Sidamo, notes fruitées.",
        "cafe@demo.greenpath",
        [
            DemoStep(1, "Culture arabica Sidamo", "matiere_premiere", 0.25, "Sidamo Coop", "Yirgacheffe, Éthiopie"),
            DemoStep(2, "Transport maritime", "transport", 0.25, location="Éthiopie → Marseille", transport_mode="bateau", distance_km=6800),
            DemoStep(3, "Torréfaction artisanale", "fabrication", 0.25, "Maison du Café", "Aix-en-Provence, France"),
            DemoStep(4, "Distribution boutiques", "distribution", 0.25, transport_mode="camion", distance_km=420),
        ],
    ),
    DemoProduct(
        "Capsules café compostables x20",
        "Boîte de 20 capsules compostables, café arabica équitable.",
        "cafe@demo.greenpath",
        [
            DemoStep(1, "Culture du café arabica", "matiere_premiere", 0.15, "Coop Caldas", "Manizales, Colombie"),
            DemoStep(2, "Transport maritime", "transport", 0.15, location="Colombie → Marseille", transport_mode="bateau", distance_km=8200),
            DemoStep(3, "Torréfaction", "fabrication", 0.15, "Maison du Café", "Aix-en-Provence, France"),
            DemoStep(4, "Fabrication capsules compostables", "fabrication", 0.2, "BioCaps", "Lyon, France"),
            DemoStep(5, "Distribution boutiques", "distribution", 0.2, transport_mode="camion", distance_km=420),
        ],
    ),

    # ============ Vergers Provence ============
    DemoProduct(
        "Pommes Gala France 1kg",
        "Filet 1kg, pommes Gala, vergers du sud-est.",
        "vergers@demo.greenpath",
        [
            DemoStep(1, "Culture en verger", "matiere_premiere", 1.0, "Vergers Provence", "Avignon, France"),
            DemoStep(2, "Conditionnement", "fabrication", 1.0, location="Avignon, France"),
            DemoStep(3, "Distribution magasins", "distribution", 1.0, transport_mode="camion", distance_km=300),
        ],
    ),
    DemoProduct(
        "Avocats bio Mexique x4",
        "Filet de 4 avocats Hass bio, importés du Mexique.",
        "vergers@demo.greenpath",
        [
            DemoStep(1, "Culture avocats Hass bio", "matiere_premiere", 0.8, "Aguacates Bio", "Michoacán, Mexique"),
            DemoStep(2, "Transport maritime", "transport", 0.8, location="Mexique → Rotterdam", transport_mode="bateau", distance_km=9000),
            DemoStep(3, "Transport vers entrepôt", "transport", 0.8, location="Rotterdam → France", transport_mode="camion", distance_km=600),
            DemoStep(4, "Distribution magasins", "distribution", 0.8, transport_mode="camion", distance_km=400),
        ],
    ),
    DemoProduct(
        "Bananes Antilles 1kg",
        "Régime 1kg de bananes des Antilles françaises.",
        "vergers@demo.greenpath",
        [
            DemoStep(1, "Culture bananes Antilles", "matiere_premiere", 1.0, "Plantations Martinique", "Fort-de-France, Martinique"),
            DemoStep(2, "Transport maritime", "transport", 1.0, location="Martinique → Le Havre", transport_mode="bateau", distance_km=7000),
            DemoStep(3, "Conditionnement", "fabrication", 1.0, location="Le Havre, France"),
            DemoStep(4, "Distribution magasins", "distribution", 1.0, transport_mode="camion", distance_km=550),
        ],
    ),
    DemoProduct(
        "Tomates de Provence 1kg",
        "Barquette 1kg de tomates anciennes, agriculture raisonnée.",
        "vergers@demo.greenpath",
        [
            DemoStep(1, "Culture en serre", "matiere_premiere", 1.0, "Maraîchers Provence", "Cavaillon, France"),
            DemoStep(2, "Conditionnement", "fabrication", 1.0, location="Cavaillon, France"),
            DemoStep(3, "Distribution magasins", "distribution", 1.0, transport_mode="camion", distance_km=200),
        ],
    ),

    # ============ Domaine Bio Bordeaux ============
    DemoProduct(
        "Vin rouge bio Bordeaux 75cl",
        "Bouteille 75cl, AOC Bordeaux supérieur, viticulture biologique.",
        "domaine@demo.greenpath",
        [
            DemoStep(1, "Viticulture bio", "matiere_premiere", 1.0, "Domaine Bio", "Saint-Émilion, France"),
            DemoStep(2, "Vinification", "fabrication", 1.0, location="Saint-Émilion, France"),
            DemoStep(3, "Embouteillage", "fabrication", 1.2, location="Saint-Émilion, France"),
            DemoStep(4, "Distribution magasins", "distribution", 1.2, transport_mode="camion", distance_km=550),
        ],
    ),
    DemoProduct(
        "Vin blanc bio Bordeaux 75cl",
        "Bouteille 75cl, AOC Entre-deux-Mers, biologique.",
        "domaine@demo.greenpath",
        [
            DemoStep(1, "Viticulture bio", "matiere_premiere", 1.0, "Domaine Bio", "Entre-deux-Mers, France"),
            DemoStep(2, "Vinification", "fabrication", 1.0, location="Entre-deux-Mers, France"),
            DemoStep(3, "Embouteillage", "fabrication", 1.2, location="Saint-Émilion, France"),
            DemoStep(4, "Distribution magasins", "distribution", 1.2, transport_mode="camion", distance_km=550),
        ],
    ),

    # ============ EcoTech Reconditionné ============
    DemoProduct(
        "Smartphone reconditionné",
        "Téléphone d'occasion remis à neuf, 128 Go, garanti 2 ans.",
        "ecotech@demo.greenpath",
        [
            DemoStep(1, "Collecte téléphone usagé", "matiere_premiere", 0.2, "Recycl'Phone", "Lille, France"),
            DemoStep(2, "Transport vers atelier", "transport", 0.2, location="Lille → Bordeaux", transport_mode="camion", distance_km=700),
            DemoStep(3, "Reconditionnement", "fabrication", 0.2, "EcoTech Lab", "Bordeaux, France"),
            DemoStep(4, "Distribution magasins", "distribution", 0.25, transport_mode="camion", distance_km=400),
        ],
    ),
    DemoProduct(
        "Ordinateur portable reconditionné",
        "Laptop pro 14 pouces reconditionné, garanti 2 ans, SSD 512 Go.",
        "ecotech@demo.greenpath",
        [
            DemoStep(1, "Collecte laptop usagé", "matiere_premiere", 1.5, "Recycl'Phone", "Lille, France"),
            DemoStep(2, "Transport vers atelier", "transport", 1.5, location="Lille → Bordeaux", transport_mode="camion", distance_km=700),
            DemoStep(3, "Reconditionnement", "fabrication", 1.5, "EcoTech Lab", "Bordeaux, France"),
            DemoStep(4, "Distribution magasins", "distribution", 1.6, transport_mode="camion", distance_km=400),
        ],
    ),
    DemoProduct(
        "Casque audio reconditionné",
        "Casque audio Bluetooth reconditionné, batterie remplacée.",
        "ecotech@demo.greenpath",
        [
            DemoStep(1, "Collecte casque usagé", "matiere_premiere", 0.3, "Recycl'Phone", "Lille, France"),
            DemoStep(2, "Transport vers atelier", "transport", 0.3, location="Lille → Bordeaux", transport_mode="camion", distance_km=700),
            DemoStep(3, "Réparation et nettoyage", "fabrication", 0.3, "EcoTech Lab", "Bordeaux, France"),
            DemoStep(4, "Distribution magasins", "distribution", 0.35, transport_mode="camion", distance_km=400),
        ],
    ),

    # ============ Pure Cosmétiques ============
    DemoProduct(
        "Crème hydratante bio 50ml",
        "Pot 50ml, crème visage bio à l'huile d'argan et aloe vera.",
        "pure@demo.greenpath",
        [
            DemoStep(1, "Huile d'argan Maroc", "matiere_premiere", 0.05, "Argan Coop", "Essaouira, Maroc"),
            DemoStep(2, "Aloe vera Espagne", "matiere_premiere", 0.03, "AloeBio", "Murcie, Espagne"),
            DemoStep(3, "Transport ingrédients", "transport", 0.1, location="Espagne → France", transport_mode="camion", distance_km=1200),
            DemoStep(4, "Fabrication crème", "fabrication", 0.05, "Pure Lab", "Grasse, France"),
            DemoStep(5, "Distribution magasins", "distribution", 0.08, transport_mode="camion", distance_km=400),
        ],
    ),
    DemoProduct(
        "Shampoing solide 100g",
        "Pain de shampoing 100g, formule bio, zéro plastique.",
        "pure@demo.greenpath",
        [
            DemoStep(1, "Bases lavantes végétales", "matiere_premiere", 0.1, "VégétalBase", "Lyon, France"),
            DemoStep(2, "Huiles essentielles", "matiere_premiere", 0.02, "Provence HE", "Grasse, France"),
            DemoStep(3, "Fabrication et pressage", "fabrication", 0.1, "Pure Lab", "Grasse, France"),
            DemoStep(4, "Distribution magasins", "distribution", 0.12, transport_mode="camion", distance_km=400),
        ],
    ),
    DemoProduct(
        "Savon de Marseille 200g",
        "Pain de savon de Marseille véritable 200g, méthode traditionnelle.",
        "pure@demo.greenpath",
        [
            DemoStep(1, "Huile d'olive bio", "matiere_premiere", 0.2, "Provence Oléi", "Aix, France"),
            DemoStep(2, "Saponification chaudron", "fabrication", 0.2, "Savonnerie Marseille", "Marseille, France"),
            DemoStep(3, "Distribution magasins", "distribution", 0.22, transport_mode="camion", distance_km=400),
        ],
    ),

    # ============ CleanHome Écologique ============
    DemoProduct(
        "Lessive écologique 1.5L",
        "Bouteille 1.5L, lessive concentrée biodégradable, 30 lavages.",
        "cleanhome@demo.greenpath",
        [
            DemoStep(1, "Bases lavantes végétales", "matiere_premiere", 1.5, "VégétalBase", "Lyon, France"),
            DemoStep(2, "Fabrication et embouteillage", "fabrication", 1.5, "CleanHome Usine", "Lyon, France"),
            DemoStep(3, "Distribution magasins", "distribution", 1.7, transport_mode="camion", distance_km=500),
        ],
    ),
    DemoProduct(
        "Liquide vaisselle écologique 500ml",
        "Bouteille 500ml, formule plantes, biodégradable.",
        "cleanhome@demo.greenpath",
        [
            DemoStep(1, "Bases lavantes végétales", "matiere_premiere", 0.5, "VégétalBase", "Lyon, France"),
            DemoStep(2, "Fabrication et embouteillage", "fabrication", 0.5, "CleanHome Usine", "Lyon, France"),
            DemoStep(3, "Distribution magasins", "distribution", 0.55, transport_mode="camion", distance_km=500),
        ],
    ),
    DemoProduct(
        "Nettoyant multi-usage 750ml",
        "Spray 750ml, vinaigre blanc et huiles essentielles.",
        "cleanhome@demo.greenpath",
        [
            DemoStep(1, "Vinaigre et HE", "matiere_premiere", 0.75, "VégétalBase", "Lyon, France"),
            DemoStep(2, "Fabrication et embouteillage", "fabrication", 0.75, "CleanHome Usine", "Lyon, France"),
            DemoStep(3, "Distribution magasins", "distribution", 0.8, transport_mode="camion", distance_km=500),
        ],
    ),

    # ============ Lait Nature ============
    DemoProduct(
        "Yaourt nature bio x4",
        "Pack de 4 yaourts nature 125g, lait de vaches bio Normandie.",
        "laitnature@demo.greenpath",
        [
            DemoStep(1, "Lait de vache bio", "matiere_premiere", 0.5, "Ferme du Bocage", "Caen, France"),
            DemoStep(2, "Fermentation et conditionnement", "fabrication", 0.5, "Lait Nature Usine", "Caen, France"),
            DemoStep(3, "Distribution magasins (chaîne froid)", "distribution", 0.55, transport_mode="camion", distance_km=400),
        ],
    ),
    DemoProduct(
        "Beurre fermier bio 250g",
        "Plaquette 250g, beurre doux, baratte traditionnelle.",
        "laitnature@demo.greenpath",
        [
            DemoStep(1, "Lait de vache bio", "matiere_premiere", 0.25, "Ferme du Bocage", "Caen, France"),
            DemoStep(2, "Barattage", "fabrication", 0.25, "Lait Nature Usine", "Caen, France"),
            DemoStep(3, "Distribution magasins (chaîne froid)", "distribution", 0.27, transport_mode="camion", distance_km=400),
        ],
    ),

    # ============ PaperLeaf Recyclé ============
    DemoProduct(
        "Cahier recyclé A5 96 pages",
        "Cahier A5 papier recyclé post-consommation à 100%.",
        "paperleaf@demo.greenpath",
        [
            DemoStep(1, "Pulpe papier recyclé", "matiere_premiere", 0.2, "PulpeRecyclée", "Strasbourg, France"),
            DemoStep(2, "Fabrication papier et reliure", "fabrication", 0.2, "PaperLeaf Usine", "Strasbourg, France"),
            DemoStep(3, "Distribution magasins", "distribution", 0.22, transport_mode="camion", distance_km=600),
        ],
    ),
    DemoProduct(
        "Stylo rechargeable",
        "Stylo bille en bois certifié FSC, recharges disponibles.",
        "paperleaf@demo.greenpath",
        [
            DemoStep(1, "Bois certifié FSC", "matiere_premiere", 0.02, "Bois Vosges FSC", "Épinal, France"),
            DemoStep(2, "Fabrication stylo", "fabrication", 0.03, "PaperLeaf Usine", "Strasbourg, France"),
            DemoStep(3, "Distribution magasins", "distribution", 0.04, transport_mode="camion", distance_km=600),
        ],
    ),
]


DEMO_CONSUMPTIONS: List[DemoConsumption] = [
    # Léa : profil éco-curieux, scanne beaucoup, compare local vs importé
    DemoConsumption("lea@demo.greenpath", "T-shirt coton bio", 1.0, "Vu en boutique du quartier"),
    DemoConsumption("lea@demo.greenpath", "Sweat coton bio", 1.0),
    DemoConsumption("lea@demo.greenpath", "Robe en lin", 1.0, "Pour l'été"),
    DemoConsumption("lea@demo.greenpath", "Confiture fraises bio 250g", 2.0, "Petit-déjeuner"),
    DemoConsumption("lea@demo.greenpath", "Miel d'acacia 500g", 1.0),
    DemoConsumption("lea@demo.greenpath", "Café arabica Colombie 250g", 1.0),
    DemoConsumption("lea@demo.greenpath", "Pommes Gala France 1kg", 1.0, "Local, je préfère"),
    DemoConsumption("lea@demo.greenpath", "Avocats bio Mexique x4", 1.0, "Comparer avec les pommes"),
    DemoConsumption("lea@demo.greenpath", "Tomates de Provence 1kg", 1.0),
    DemoConsumption("lea@demo.greenpath", "Chocolat noir 70% Équateur", 1.0),
    DemoConsumption("lea@demo.greenpath", "Jus d'orange bio 1L", 1.0),
    DemoConsumption("lea@demo.greenpath", "Crème hydratante bio 50ml", 1.0),
    DemoConsumption("lea@demo.greenpath", "Shampoing solide 100g", 1.0, "Zéro plastique"),
    DemoConsumption("lea@demo.greenpath", "Yaourt nature bio x4", 1.0),
    DemoConsumption("lea@demo.greenpath", "Cahier recyclé A5 96 pages", 2.0, "Pour le travail"),
    # Tom : moins d'items
    DemoConsumption("tom@demo.greenpath", "Vin rouge bio Bordeaux 75cl", 1.0, "Dîner samedi"),
    DemoConsumption("tom@demo.greenpath", "Chocolat noir 70% Équateur", 2.0),
    DemoConsumption("tom@demo.greenpath", "Café arabica Éthiopie 250g", 1.0),
    DemoConsumption("tom@demo.greenpath", "Smartphone reconditionné", 1.0, "Mon nouveau tel"),
    DemoConsumption("tom@demo.greenpath", "Bananes Antilles 1kg", 1.0),
]


# ---------------------------------------------------------------- Logique

def _get_or_create_user(db, demo: DemoUser) -> models.User:
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
    role_tag = "" if demo.role == "entreprise" else f" ({demo.role})"
    print(f"  + Utilisateur : {demo.email}  →  {demo.company_name}{role_tag}")
    return user


def _get_or_create_product(db, demo: DemoProduct, owner: models.User) -> tuple[models.Product, bool]:
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
    print(f"  + Produit    : {demo.name} ({len(demo.steps)} étapes, {co2} kg CO₂)")
    return product, True


def _seed_consumptions_for(db, consumer: models.User, entries: List[DemoConsumption]) -> int:
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
    db = SessionLocal()
    try:
        print("Seed des données démo GreenPath...")
        print()
        print("Utilisateurs :")
        users_by_email = {u.email: _get_or_create_user(db, u) for u in DEMO_USERS}

        print()
        print("Produits :")
        created = 0
        for demo_product in DEMO_PRODUCTS:
            owner = users_by_email[demo_product.owner_email]
            _, was_created = _get_or_create_product(db, demo_product, owner)
            if was_created:
                created += 1
        skipped = len(DEMO_PRODUCTS) - created
        print(f"  → {created} produit(s) ajouté(s), {skipped} déjà présent(s).")

        print()
        print("Consommation :")
        for cuser in [u for u in DEMO_USERS if u.role == "consommateur"]:
            consumer = users_by_email[cuser.email]
            entries = [c for c in DEMO_CONSUMPTIONS if c.consumer_email == cuser.email]
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
