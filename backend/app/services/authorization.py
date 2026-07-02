"""Règles d'autorisation sur un Product, partagées entre les routers
products/batches/contributors (ces trois fichiers réimplémentaient chacun
leur propre variante, avec un risque de divergence entre elles).

Deux règles distinctes existent dans le projet :
- has_write_access  : admin, owner du produit, ou contributeur scope="write".
                       Utilisée pour créer/modifier des étapes ou des lots.
- is_owner_or_admin : admin ou owner du produit uniquement (pas de bypass
                       contributeur). Utilisée pour la gestion des
                       contributeurs et le remplacement complet des étapes.
"""

from .. import models


def has_write_access(product: "models.Product", user: "models.User") -> bool:
    if user.role == "admin":
        return True
    if product.owner_id == user.id:
        return True
    contrib = next(
        (c for c in product.contributors if c.user_id == user.id and c.scope == "write"),
        None,
    )
    return contrib is not None


def is_owner_or_admin(product: "models.Product", user: "models.User") -> bool:
    return user.role == "admin" or product.owner_id == user.id
