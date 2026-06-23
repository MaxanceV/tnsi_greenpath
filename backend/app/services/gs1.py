"""Service GS1 — génération et validation des identifiants GS1.

GS1 est le standard mondial d'identification des produits dans les supply chains.
Trois types d'identifiants sont utilisés dans GreenPath :

- **GTIN-14** (Global Trade Item Number) : identifie un produit commercialisé.
  C'est le numéro encodé dans le code-barres du pot de confiture.
  Format : 14 chiffres dont le dernier est un chiffre de contrôle.

- **GLN** (Global Location Number) : identifie une entreprise ou un lieu.
  Format : 13 chiffres dont le dernier est un chiffre de contrôle.

- **SSCC** (Serial Shipping Container Code) : identifie un lot physique (palette, carton).
  Format : 18 chiffres dont le dernier est un chiffre de contrôle.

Les trois utilisent le même algorithme de chiffre de contrôle GS1.

**GS1 Digital Link** : format d'URL normalisé pour les QR codes modernes.
  Exemple : https://greenpath.io/01/03614512000001/10/LOT-2026-042
  - `/01/` suivi du GTIN-14
  - `/10/` suivi du numéro de lot (lot number)

Architecture : ce module est pur Python (pas de dépendances externes).
Les identifiants générés sont valides selon le standard GS1 mais utilisent
un GS1 Company Prefix fictif (360 = France, préfixe démo).
"""

from __future__ import annotations

import hashlib
import re

# Préfixe entreprise GS1 utilisé pour les données démo.
# En production, chaque entreprise aurait son propre préfixe acheté auprès de GS1 France.
_DEMO_COMPANY_PREFIX = "3614512"


def _gs1_check_digit(digits: str) -> int:
    """Calcule le chiffre de contrôle GS1 pour une séquence de chiffres.

    Algorithme :
    - Partir de la droite (hors chiffre de contrôle)
    - Multiplier alternativement par 3 et 1
    - Sommer tous les produits
    - Chiffre de contrôle = (10 - (somme mod 10)) mod 10

    Valide pour GTIN-8/12/13/14, GLN (13), SSCC (18).
    """
    total = 0
    for i, ch in enumerate(reversed(digits)):
        multiplier = 3 if i % 2 == 0 else 1
        total += int(ch) * multiplier
    return (10 - (total % 10)) % 10


def generate_gtin(product_id: int) -> str:
    """Génère un GTIN-14 valide à partir de l'ID produit.

    Structure : [prefixe_7][item_6][checkdigit_1]
    Le numéro d'article (item ref) est dérivé de l'ID produit.
    """
    item_ref = str(product_id % 1_000_000).zfill(6)
    payload = _DEMO_COMPANY_PREFIX + item_ref  # 13 chiffres
    check = _gs1_check_digit(payload)
    return payload + str(check)


def generate_gln(user_id: int) -> str:
    """Génère un GLN (13 chiffres) à partir de l'ID utilisateur.

    Structure : [prefixe_7][location_5][checkdigit_1]
    """
    location_ref = str(user_id % 100_000).zfill(5)
    payload = _DEMO_COMPANY_PREFIX + location_ref  # 12 chiffres
    check = _gs1_check_digit(payload)
    return payload + str(check)


def generate_sscc(batch_id: int) -> str:
    """Génère un SSCC (18 chiffres) à partir de l'ID lot.

    Structure : [extension_1][prefixe_7][serial_9][checkdigit_1]
    """
    extension = "0"
    serial = str(batch_id % 1_000_000_000).zfill(9)
    payload = extension + _DEMO_COMPANY_PREFIX + serial  # 17 chiffres
    check = _gs1_check_digit(payload)
    return payload + str(check)


def validate_gtin(gtin: str) -> bool:
    """Vérifie qu'un GTIN-14 est valide (format + chiffre de contrôle)."""
    if not gtin or not re.fullmatch(r"\d{14}", gtin):
        return False
    expected = _gs1_check_digit(gtin[:-1])
    return int(gtin[-1]) == expected


def validate_gln(gln: str) -> bool:
    """Vérifie qu'un GLN est valide (format + chiffre de contrôle)."""
    if not gln or not re.fullmatch(r"\d{13}", gln):
        return False
    expected = _gs1_check_digit(gln[:-1])
    return int(gln[-1]) == expected


def validate_sscc(sscc: str) -> bool:
    """Vérifie qu'un SSCC est valide (format + chiffre de contrôle)."""
    if not sscc or not re.fullmatch(r"\d{18}", sscc):
        return False
    expected = _gs1_check_digit(sscc[:-1])
    return int(sscc[-1]) == expected


def build_gs1_digital_link(gtin: str, lot_number: str | None = None, base_url: str = "https://greenpath.io") -> str:
    """Construit un GS1 Digital Link pour un produit / lot.

    Format : {base_url}/01/{gtin}[/10/{lot_number}]

    Ce format est le standard GS1 pour les QR codes modernes (GS1 Digital Link v1.2).
    Le scan donne directement une URL lisible par le navigateur.

    Args:
        gtin: GTIN-14 du produit.
        lot_number: Numéro de lot optionnel (Batch/Lot Number, AI 10).
        base_url: Base URL du resolver — en démo c'est localhost:4200.
    """
    url = f"{base_url}/01/{gtin}"
    if lot_number:
        url += f"/10/{lot_number}"
    return url
