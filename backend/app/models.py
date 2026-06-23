"""Modeles SQLAlchemy : tables User, Product, Step, Batch, BatchParent,
ProductContributor, Consumption.

Schema general :
    User 1 --< Product 1 --< Step
    Product 1 --< Batch >--< Batch (BatchParent : relation parent/enfant)
    Product >--< User (ProductContributor : acces multi-entreprise)

Regles de cascade :
- Supprimer un Product supprime ses Steps et ses Batches (cascade all, delete-orphan).
- Supprimer un User met owner_id a NULL sur ses Products (ON DELETE SET NULL).
- Les ProductContributors sont supprimes avec le Product (CASCADE).

GS1 :
- User.gln     : Global Location Number (13 chiffres).
- Product.gtin : Global Trade Item Number (14 chiffres).
- Batch.sscc   : Serial Shipping Container Code (18 chiffres).
Tous nullable pour la retro-compatibilite avec les donnees existantes.

Note sur upstream_product_id et upstream_batch_id dans Step :
Ces colonnes sont des entiers bruts SANS ForeignKey declare. Cela evite
l'ambiguite ORM sur Product.steps : si upstream_product_id avait une FK vers
products.id, SQLAlchemy verrait deux chemins FK entre steps et products
(product_id + upstream_product_id) et ne saurait pas lequel utiliser pour
Product.steps. L'integrite referentielle est garantie cote application.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="entreprise")
    company_name = Column(String, nullable=False)
    gln = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    products = relationship("Product", back_populates="owner")
    consumptions = relationship(
        "Consumption",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    contributed_products = relationship(
        "ProductContributor",
        foreign_keys="[ProductContributor.user_id]",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    gtin = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    owner = relationship("User", back_populates="products")
    steps = relationship(
        "Step",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="Step.position",
    )
    batches = relationship(
        "Batch",
        back_populates="product",
        cascade="all, delete-orphan",
    )
    contributors = relationship(
        "ProductContributor",
        back_populates="product",
        cascade="all, delete-orphan",
    )


class Step(Base):
    __tablename__ = "steps"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    position = Column(Integer, nullable=False)
    parallel_group = Column(Integer, nullable=True)
    name = Column(String, nullable=False)
    step_type = Column(String, nullable=False)
    supplier = Column(String, nullable=True)
    location = Column(String, nullable=True)
    weight_kg = Column(Float, nullable=False)
    transport_mode = Column(String, nullable=True)
    distance_km = Column(Float, nullable=True)
    hash = Column(String, nullable=True)
    contributor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Entiers bruts sans FK declaree : evite l'ambiguite ORM avec product_id
    upstream_product_id = Column(Integer, nullable=True)
    upstream_batch_id = Column(Integer, nullable=True)

    product = relationship("Product", back_populates="steps")
    contributor = relationship("User", foreign_keys=[contributor_id])


class Batch(Base):
    """Lot de production (Batch/Lot Number, AI 10 GS1)."""

    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    lot_number = Column(String, nullable=False)
    sscc = Column(String, nullable=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    quantity = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="batches")
    parents = relationship(
        "Batch",
        secondary="batch_parents",
        primaryjoin="Batch.id == BatchParent.child_id",
        secondaryjoin="Batch.id == BatchParent.parent_id",
        back_populates="children",
    )
    children = relationship(
        "Batch",
        secondary="batch_parents",
        primaryjoin="Batch.id == BatchParent.parent_id",
        secondaryjoin="Batch.id == BatchParent.child_id",
        back_populates="parents",
    )


class BatchParent(Base):
    """Table d'association pour la relation parent/enfant entre lots."""

    __tablename__ = "batch_parents"

    parent_id = Column(
        Integer,
        ForeignKey("batches.id", ondelete="CASCADE"),
        primary_key=True,
    )
    child_id = Column(
        Integer,
        ForeignKey("batches.id", ondelete="CASCADE"),
        primary_key=True,
    )


class ProductContributor(Base):
    """Acces delegue a un produit pour une entreprise tierce."""

    __tablename__ = "product_contributors"

    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    granted_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    scope = Column(String, nullable=False, default="write")

    product = relationship("Product", back_populates="contributors")
    user = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="contributed_products",
    )
    granter = relationship("User", foreign_keys=[granted_by])


class Consumption(Base):
    """Un produit ajoute par un consommateur a son suivi personnel."""

    __tablename__ = "consumptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity = Column(Float, nullable=False, default=1.0)
    notes = Column(String, nullable=True)
    consumed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="consumptions")
    product = relationship("Product")
