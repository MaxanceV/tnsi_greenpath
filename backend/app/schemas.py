"""Schémas Pydantic exposés par l'API.

Convention : pour chaque entité, on définit
- *Base*   : champs communs partagés (validation),
- *Create* : payload de création (ce que le client envoie en POST),
- *Update* : payload de mise à jour (champs optionnels),
- *Read*   : représentation sortie (ce que l'API renvoie, incluant l'id,
             les timestamps et les champs calculés comme `co2_kg`).

Toutes les validations métier (types autorisés, contraintes de longueur,
unicité de positions, etc.) sont déclarées ici, jamais dans les routers.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

ALLOWED_STEP_TYPES = {"matiere_premiere", "fabrication", "transport", "distribution"}
ALLOWED_TRANSPORT_MODES = {"camion", "bateau", "avion", "train", "aucun"}
ALLOWED_ROLES = {"admin", "entreprise"}


# ---------------------------------------------------------------- Step / Product

class StepBase(BaseModel):
    position: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=120)
    step_type: str
    supplier: Optional[str] = Field(default=None, max_length=120)
    location: Optional[str] = Field(default=None, max_length=120)
    weight_kg: float = Field(..., gt=0)
    transport_mode: Optional[str] = None
    distance_km: Optional[float] = Field(default=None, ge=0)

    @field_validator("step_type")
    @classmethod
    def _check_type(cls, v: str) -> str:
        if v not in ALLOWED_STEP_TYPES:
            raise ValueError(f"step_type invalide: {v}. Valeurs autorisées: {sorted(ALLOWED_STEP_TYPES)}")
        return v

    @field_validator("transport_mode")
    @classmethod
    def _check_transport(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if v not in ALLOWED_TRANSPORT_MODES:
            raise ValueError(f"transport_mode invalide: {v}. Valeurs autorisées: {sorted(ALLOWED_TRANSPORT_MODES)}")
        return v


class StepCreate(StepBase):
    pass


class StepRead(StepBase):
    id: int
    product_id: int
    co2_kg: float = 0.0

    model_config = {"from_attributes": True}


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)


class ProductCreate(ProductBase):
    steps: List[StepCreate] = Field(default_factory=list)

    @field_validator("steps")
    @classmethod
    def _unique_positions(cls, steps: List[StepCreate]) -> List[StepCreate]:
        positions = [s.position for s in steps]
        if len(positions) != len(set(positions)):
            raise ValueError("Les positions des étapes doivent être uniques")
        return steps


class ProductUpdate(ProductBase):
    steps: Optional[List[StepCreate]] = None

    @field_validator("steps")
    @classmethod
    def _unique_positions(cls, steps: Optional[List[StepCreate]]) -> Optional[List[StepCreate]]:
        if steps is None:
            return None
        positions = [s.position for s in steps]
        if len(positions) != len(set(positions)):
            raise ValueError("Les positions des étapes doivent être uniques")
        return steps


class OwnerInfo(BaseModel):
    id: int
    company_name: str

    model_config = {"from_attributes": True}


class ProductRead(ProductBase):
    id: int
    created_at: datetime
    steps: List[StepRead] = []
    total_co2_kg: float = 0.0
    owner: Optional[OwnerInfo] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------- User / Auth

class UserBase(BaseModel):
    email: EmailStr
    company_name: str = Field(..., min_length=1, max_length=120)
    role: str = Field(default="entreprise")

    @field_validator("role")
    @classmethod
    def _check_role(cls, v: str) -> str:
        if v not in ALLOWED_ROLES:
            raise ValueError(f"Rôle invalide: {v}. Valeurs autorisées: {sorted(ALLOWED_ROLES)}")
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=120)


class UserUpdate(BaseModel):
    company_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    role: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=120)

    @field_validator("role")
    @classmethod
    def _check_role(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in ALLOWED_ROLES:
            raise ValueError(f"Rôle invalide: {v}")
        return v


class UserRead(UserBase):
    id: int
    created_at: datetime
    product_count: int = 0

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
