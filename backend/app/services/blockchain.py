"""Pseudo-blockchain locale pour la traçabilité des étapes.

Chaque étape d'un produit est « ancrée » via un hash SHA-256 qui inclut
le hash de l'étape précédente. Les étapes forment ainsi une **chaîne** :
toute modification d'une étape brise la chaîne et invalide toutes les
étapes suivantes — c'est ce qui donne la propriété d'intégrité sur
laquelle s'appuie l'idée de blockchain.

Architecture pensée pour le futur : la fonction `anchor()` est un
one-liner. En V2, la remplacer par un appel à Hyperledger Fabric (ou
toute autre L1) ne nécessitera aucune modification ailleurs dans le code.
"""

from __future__ import annotations

import hashlib
from typing import Iterable, List, Sequence

from .. import models

#: Hash arbitraire de la "racine" de la chaîne d'un produit (genesis block).
#: Permet à la première étape d'avoir un previous_hash bien défini.
GENESIS_HASH = "0" * 64


def _step_payload(step: models.Step) -> str:
    """Représentation canonique d'une étape utilisée pour le hash.

    Le format est volontairement stable et déterministe : si l'on change
    l'algorithme de sérialisation, toutes les chaînes existantes deviennent
    invalides — d'où l'importance de ne JAMAIS modifier cette fonction
    sans bumper une "version d'algorithme".
    """
    return "|".join(
        [
            str(step.position),
            step.name or "",
            step.step_type or "",
            step.supplier or "",
            step.location or "",
            f"{step.weight_kg:.6f}" if step.weight_kg is not None else "",
            step.transport_mode or "",
            f"{step.distance_km:.6f}" if step.distance_km is not None else "",
        ]
    )


def anchor(payload: str, previous_hash: str) -> str:
    """Ancre un bloc dans la pseudo-blockchain locale.

    À remplacer en V2 par un appel à `HyperledgerFabricClient.invoke(...)`
    ou équivalent. Le contrat reste : prendre un payload + un hash
    précédent → renvoyer un hash unique et déterministe.
    """
    return hashlib.sha256(f"{previous_hash}::{payload}".encode("utf-8")).hexdigest()


def compute_chain(steps: Iterable[models.Step]) -> List[str]:
    """Calcule la liste des hashes pour des étapes données, dans l'ordre
    croissant des positions.

    Renvoie autant de hashes qu'il y a d'étapes. Chaque hash dépend du
    précédent : modifier la 2e étape changera son hash ET ceux des étapes 3,
    4, etc. (effet domino classique des blockchains).
    """
    ordered = sorted(steps, key=lambda s: s.position)
    hashes: List[str] = []
    prev = GENESIS_HASH
    for step in ordered:
        h = anchor(_step_payload(step), prev)
        hashes.append(h)
        prev = h
    return hashes


def verify_chain(steps: Sequence[models.Step]) -> bool:
    """Vérifie que les hashes stockés dans les étapes correspondent au
    recalcul. Renvoie True si la chaîne est cohérente, False sinon.

    Utile pour le badge « Données vérifiées » côté front : on ne le
    montre que si la chaîne tient.
    """
    expected = compute_chain(steps)
    ordered = sorted(steps, key=lambda s: s.position)
    return all(s.hash == e for s, e in zip(ordered, expected))


def assign_hashes(steps: Sequence[models.Step]) -> None:
    """Calcule et écrit le hash de chaque étape (mutation en place).

    À appeler après création / mise à jour d'un produit, avant le commit
    SQLAlchemy : les hashes sont alors flushés en même temps que les
    autres modifications.
    """
    hashes = compute_chain(steps)
    ordered = sorted(steps, key=lambda s: s.position)
    for step, h in zip(ordered, hashes):
        step.hash = h
