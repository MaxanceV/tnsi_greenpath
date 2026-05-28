"""Modèles SQLAlchemy : tables User, Product, Step.

Schéma (cf. diagramme Mermaid du README) :
    User 1 --< Product 1 --< Step

Règles de cascade :
- Supprimer un Product supprime ses Steps (cascade="all, delete-orphan").
- Supprimer un User met owner_id à NULL sur ses Products (ON DELETE SET NULL),
  pour ne pas perdre les données historiques en cas de désactivation d'un compte.
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
    # Rôles : admin | entreprise | consommateur
    # Pour un consommateur, `company_name` contient le nom de la personne.
    role = Column(String, nullable=False, default="entreprise")
    company_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    products = relationship("Product", back_populates="owner")
    consumptions = relationship(
        "Consumption",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    owner = relationship("User", back_populates="products")
    steps = relationship(
        "Step",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="Step.position",
    )


class Step(Base):
    __tablename__ = "steps"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    step_type = Column(String, nullable=False)
    supplier = Column(String, nullable=True)
    location = Column(String, nullable=True)
    weight_kg = Column(Float, nullable=False)
    transport_mode = Column(String, nullable=True)
    distance_km = Column(Float, nullable=True)
    # Hash SHA-256 calculé via services/blockchain.py. Chaîné : dépend
    # du hash de l'étape précédente du même produit. Nullable pour la
    # rétro-compat avec d'anciens enregistrements (auto-rempli au démarrage).
    hash = Column(String, nullable=True)

    product = relationship("Product", back_populates="steps")


class Consumption(Base):
    """Un produit ajouté par un consommateur à son suivi personnel.

    Plusieurs entrées sont possibles pour le même produit (l'utilisateur
    peut scanner et ajouter à plusieurs reprises — chaque scan = une entrée).
    """

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
