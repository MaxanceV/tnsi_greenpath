"""Sérialisation des entités SQLAlchemy en schémas Pydantic exposés par l'API.

Centraliser la conversion ORM → DTO ici garantit :
- DRY (un seul endroit où l'on construit un ProductRead, partagé par les routes
  privées et publiques) ;
- une cohérence d'affichage (CO2 toujours calculé via le même service) ;
- une extension facile (si l'on ajoute demain un champ « hash blockchain »
  par étape ou un « score global », un seul endroit à modifier).
"""

from .. import models, schemas
from .co2 import co2_for_step, total_co2_for_product


def step_to_read(step: models.Step) -> schemas.StepRead:
    """Convertit une étape ORM en schéma de lecture (avec CO2 calculé)."""
    return schemas.StepRead(
        id=step.id,
        product_id=step.product_id,
        position=step.position,
        name=step.name,
        step_type=step.step_type,
        supplier=step.supplier,
        location=step.location,
        weight_kg=step.weight_kg,
        transport_mode=step.transport_mode,
        distance_km=step.distance_km,
        co2_kg=co2_for_step(step),
    )


def product_to_read(product: models.Product) -> schemas.ProductRead:
    """Convertit un produit ORM en schéma de lecture (avec CO2 total et owner).

    Cette fonction est utilisée à la fois par les routes privées (dashboard
    interne) et publiques (page consommateur du QR code), garantissant que
    l'utilisateur final voit exactement les mêmes données calculées.
    """
    owner_info = None
    if product.owner is not None:
        owner_info = schemas.OwnerInfo(
            id=product.owner.id,
            company_name=product.owner.company_name,
        )

    return schemas.ProductRead(
        id=product.id,
        name=product.name,
        description=product.description,
        created_at=product.created_at,
        steps=[step_to_read(s) for s in product.steps],
        total_co2_kg=total_co2_for_product(product),
        owner=owner_info,
    )
