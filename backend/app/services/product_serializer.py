"""Sérialisation des entités SQLAlchemy en schémas Pydantic exposés par l'API.

Centraliser la conversion ORM → DTO ici garantit :
- DRY (un seul endroit où l'on construit un ProductRead, partagé par les routes
  privées et publiques) ;
- une cohérence d'affichage (CO2 toujours calculé via le même service) ;
- une extension facile (nouveaux champs, nouvelles entités).
"""

from .. import models, schemas
from .blockchain import verify_chain
from .co2 import co2_for_step, total_co2_for_product


def step_to_read(step: models.Step) -> schemas.StepRead:
    """Convertit une étape ORM en schéma de lecture (avec CO2, hash, contributor)."""
    contributor_info = None
    if step.contributor is not None:
        contributor_info = schemas.ContributorInfo(
            id=step.contributor.id,
            company_name=step.contributor.company_name,
        )

    # upstream_product_id est un entier brut (pas de relation ORM)
    upstream_product_name = None

    return schemas.StepRead(
        id=step.id,
        product_id=step.product_id,
        position=step.position,
        parent_positions=step.parent_positions or [],
        name=step.name,
        step_type=step.step_type,
        supplier=step.supplier,
        location=step.location,
        weight_kg=step.weight_kg,
        transport_mode=step.transport_mode,
        distance_km=step.distance_km,
        co2_kg=co2_for_step(step),
        hash=step.hash,
        contributor=contributor_info,
        upstream_product_id=step.upstream_product_id,
        upstream_batch_id=step.upstream_batch_id,
        upstream_product_name=upstream_product_name,
    )


def product_to_read(product: models.Product) -> schemas.ProductRead:
    """Convertit un produit ORM en schéma de lecture.

    Inclut CO2 total, owner, validité de la chaîne blockchain, et nombre
    de contributeurs. Utilisé par les routes privées et publiques.
    """
    owner_info = None
    if product.owner is not None:
        owner_info = schemas.OwnerInfo(
            id=product.owner.id,
            company_name=product.owner.company_name,
        )

    chain_valid = verify_chain(product.steps) if product.steps else True
    contributor_count = len([c for c in product.contributors if c.scope == "write"]) if product.contributors else 0

    return schemas.ProductRead(
        id=product.id,
        name=product.name,
        description=product.description,
        gtin=product.gtin,
        created_at=product.created_at,
        steps=[step_to_read(s) for s in product.steps],
        total_co2_kg=total_co2_for_product(product),
        owner=owner_info,
        chain_valid=chain_valid,
        contributor_count=contributor_count,
    )
