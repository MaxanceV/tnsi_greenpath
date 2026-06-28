"""Schémas Pydantic exposés par l'API.

Convention : pour chaque entité, on définit
- *Base*   : champs communs partagés (validation),
- *Create* : payload de création (ce que le client envoie en POST),
- *Update* : payload de mise à jour (champs optionnels),
- *Read*   : représentation sortie (ce que l'API renvoie, incluant l'id,
             les timestamps et les champs calculés comme `co2_kg`).

Toutes les validations métier (types autorisés, contraintes de longueur,
unicité de positions, etc.) sont déclarées ici, jamais dans les routers.

GS1 :
- GTIN-14 : 14 chiffres validés par chiffre de contrôle.
- GLN     : 13 chiffres validés par chiffre de contrôle.
- SSCC    : 18 chiffres validés par chiffre de contrôle.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from .services.gs1 import validate_gln, validate_gtin, validate_sscc

ALLOWED_STEP_TYPES = {"matiere_premiere", "fabrication", "transport", "distribution"}
ALLOWED_TRANSPORT_MODES = {"camion", "bateau", "avion", "train", "aucun"}
ALLOWED_ROLES = {"admin", "entreprise", "consommateur"}
ALLOWED_CONTRIBUTOR_SCOPES = {"read", "write"}


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
    # DAG : positions des étapes parentes (ex: [1, 2] = dépend des étapes 1 et 2)
    parent_positions: List[int] = Field(default_factory=list)
    # Multi-entreprise : référence à un produit GreenPath amont
    upstream_product_id: Optional[int] = Field(default=None)
    upstream_batch_id: Optional[int] = Field(default=None)

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


class ContributorInfo(BaseModel):
    """Vue allégée du contributeur d'une étape."""
    id: int
    company_name: str

    model_config = {"from_attributes": True}


class StepRead(StepBase):
    id: int
    product_id: int
    co2_kg: float = 0.0
    # Hash SHA-256 (chaîné) ancrant cette étape dans la pseudo-blockchain.
    hash: Optional[str] = None
    # Entreprise ayant saisi l'étape (None = owner du produit)
    contributor: Optional[ContributorInfo] = None
    # Nom du produit amont si upstream_product_id renseigné
    upstream_product_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    # GTIN-14 GS1 — optionnel, généré automatiquement si absent
    gtin: Optional[str] = Field(default=None)

    @field_validator("gtin")
    @classmethod
    def _check_gtin(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not validate_gtin(v):
            raise ValueError("GTIN invalide : doit être 14 chiffres avec chiffre de contrôle GS1 correct")
        return v


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
    # True si la chaîne de hashes des étapes est intègre (recalcul OK).
    chain_valid: bool = True
    # Nombre de contributeurs externes ayant accès en écriture
    contributor_count: int = 0

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------- Batch / Lot

class BatchBase(BaseModel):
    lot_number: str = Field(..., min_length=1, max_length=80)
    sscc: Optional[str] = Field(default=None)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    quantity: Optional[float] = Field(default=None, gt=0)
    unit: Optional[str] = Field(default=None, max_length=20)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("sscc")
    @classmethod
    def _check_sscc(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not validate_sscc(v):
            raise ValueError("SSCC invalide : doit être 18 chiffres avec chiffre de contrôle GS1 correct")
        return v


class BatchCreate(BatchBase):
    product_id: int
    # IDs des lots parents (matières premières utilisées pour ce lot)
    parent_batch_ids: List[int] = Field(default_factory=list)


class BatchUpdate(BatchBase):
    parent_batch_ids: Optional[List[int]] = None


class BatchParentInfo(BaseModel):
    """Vue allégée d'un lot parent/enfant."""
    id: int
    lot_number: str
    sscc: Optional[str] = None
    product_id: int
    product_name: Optional[str] = None

    model_config = {"from_attributes": True}


class BatchRead(BatchBase):
    id: int
    product_id: int
    product_name: Optional[str] = None
    created_at: datetime
    parents: List[BatchParentInfo] = []
    children: List[BatchParentInfo] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------- ProductContributor

class ContributorAdd(BaseModel):
    """Payload pour ajouter un contributeur à un produit (par email)."""
    user_email: EmailStr
    scope: str = Field(default="write")

    @field_validator("scope")
    @classmethod
    def _check_scope(cls, v: str) -> str:
        if v not in ALLOWED_CONTRIBUTOR_SCOPES:
            raise ValueError(f"scope invalide: {v}. Valeurs autorisées: {sorted(ALLOWED_CONTRIBUTOR_SCOPES)}")
        return v


class ContributorRead(BaseModel):
    user_id: int
    company_name: str
    email: str
    scope: str
    granted_at: datetime
    granted_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------- User / Auth

class UserBase(BaseModel):
    email: EmailStr
    company_name: str = Field(..., min_length=1, max_length=120)
    role: str = Field(default="entreprise")
    gln: Optional[str] = Field(default=None)

    @field_validator("role")
    @classmethod
    def _check_role(cls, v: str) -> str:
        if v not in ALLOWED_ROLES:
            raise ValueError(f"Rôle invalide: {v}. Valeurs autorisées: {sorted(ALLOWED_ROLES)}")
        return v

    @field_validator("gln")
    @classmethod
    def _check_gln(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not validate_gln(v):
            raise ValueError("GLN invalide : doit être 13 chiffres avec chiffre de contrôle GS1 correct")
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=120)


class UserUpdate(BaseModel):
    company_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    role: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=120)
    gln: Optional[str] = None

    @field_validator("role")
    @classmethod
    def _check_role(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in ALLOWED_ROLES:
            raise ValueError(f"Rôle invalide: {v}")
        return v

    @field_validator("gln")
    @classmethod
    def _check_gln(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not validate_gln(v):
            raise ValueError("GLN invalide : doit être 13 chiffres avec chiffre de contrôle GS1 correct")
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


class ConsumerRegister(BaseModel):
    """Auto-inscription d'un consommateur (rôle hard-codé côté serveur)."""
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=120)
    company_name: str = Field(..., min_length=1, max_length=120)


# ---------------------------------------------------------------- Consumption

class ConsumptionCreate(BaseModel):
    product_id: int
    quantity: float = Field(default=1.0, gt=0)
    notes: Optional[str] = Field(default=None, max_length=300)


class ConsumptionProductInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    total_co2_kg: float = 0.0
    owner_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ConsumptionRead(BaseModel):
    id: int
    quantity: float
    notes: Optional[str] = None
    consumed_at: datetime
    product: ConsumptionProductInfo
    co2_kg: float

    model_config = {"from_attributes": True}


class ConsumptionStats(BaseModel):
    item_count: int
    unique_product_count: int
    total_co2_kg: float
    avg_co2_per_item: float


# ---------------------------------------------------------------- Chat / RAG

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatMessage] = Field(default_factory=list)


class ChatSource(BaseModel):
    kind: str
    title: str
    snippet: str
    distance: float = 0.0


class ChatResponse(BaseModel):
    answer: str
    sources: List[ChatSource] = Field(default_factory=list)
