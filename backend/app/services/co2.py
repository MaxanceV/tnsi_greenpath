"""
Calcul de l'empreinte carbone (CO2) par étape de supply chain.

Facteurs ADEME mockés (ordres de grandeur réalistes). Source : Base Empreinte ADEME.
Unités :
- Transport : kg CO2eq / (tonne · km)
- Production / matière / distribution : kg CO2eq / kg de produit
"""

from .. import models

# Transport: kg CO2 par tonne-kilomètre
TRANSPORT_FACTORS_KG_CO2_PER_TKM: dict[str, float] = {
    "camion": 0.10,
    "bateau": 0.015,
    "avion": 1.50,
    "train": 0.025,
    "aucun": 0.0,
}

# Étape (hors transport pur) : kg CO2 par kg de produit
STEP_BASE_FACTORS_KG_CO2_PER_KG: dict[str, float] = {
    "matiere_premiere": 4.0,
    "fabrication": 5.0,
    "distribution": 0.2,
    # Si une étape "transport" n'a pas de distance, on retombe sur ce facteur
    "transport": 0.0,
}


def co2_for_step(step: "models.Step") -> float:
    """
    Renvoie l'empreinte CO2 (en kg) pour une étape donnée.

    Logique :
    - Si l'étape déclare une distance ET un mode de transport (≠ aucun),
      on calcule un CO2 de transport : weight_t × distance × facteur_mode.
    - Sinon on applique le facteur de base lié au step_type.
    """
    weight_kg = step.weight_kg or 0.0
    distance = step.distance_km or 0.0
    mode = (step.transport_mode or "").lower()

    if distance > 0 and mode and mode != "aucun":
        weight_tonnes = weight_kg / 1000.0
        factor = TRANSPORT_FACTORS_KG_CO2_PER_TKM.get(mode, 0.0)
        return round(weight_tonnes * distance * factor, 3)

    base_factor = STEP_BASE_FACTORS_KG_CO2_PER_KG.get(step.step_type, 0.0)
    return round(weight_kg * base_factor, 3)


def total_co2_for_product(product: "models.Product") -> float:
    """Somme des CO2 de toutes les étapes du produit."""
    return round(sum(co2_for_step(s) for s in product.steps), 3)
