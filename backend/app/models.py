from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

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
    step_type = Column(String, nullable=False)  # matiere_premiere | fabrication | transport | distribution
    supplier = Column(String, nullable=True)
    location = Column(String, nullable=True)
    weight_kg = Column(Float, nullable=False)
    transport_mode = Column(String, nullable=True)  # camion | bateau | avion | train | aucun
    distance_km = Column(Float, nullable=True)

    product = relationship("Product", back_populates="steps")
