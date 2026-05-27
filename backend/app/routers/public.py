"""Endpoints publics, sans authentification.

Ces routes sont consommées par la page consommateur ouverte depuis un QR code
(`/p/{id}` côté front). Elles ne renvoient que les informations destinées à
être visibles par le grand public — aucune donnée sensible (email, hash, etc.).
"""

import io

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.product_serializer import product_to_read

router = APIRouter(prefix="/public", tags=["public"])

# URL du front utilisée en dernier recours (cas où l'on n'arrive pas à déduire
# l'origine depuis la requête, p.ex. cURL direct).
DEFAULT_FRONT_BASE_URL = "http://localhost:4200"


def _detect_front_base_url(request: Request) -> str:
    """Détermine l'URL du front à encoder dans le QR code.

    Cet endpoint backend peut être appelé sur l'IP localhost ou sur l'IP LAN
    (192.168.x.x) selon comment l'admin a ouvert le dashboard. Le QR doit
    contenir une URL atteignable depuis l'appareil qui le scannera (un
    téléphone sur le même Wi-Fi), donc on ne peut pas hard-coder localhost.

    Priorité :
      1. En-tête HTTP `Origin` (envoyé automatiquement par le navigateur)
      2. En-tête `Host` avec substitution du port (8000 → 4200)
      3. Fallback `DEFAULT_FRONT_BASE_URL`
    """
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")

    host_header = request.headers.get("host", "")
    if host_header:
        host_only = host_header.split(":")[0]
        return f"http://{host_only}:4200"

    return DEFAULT_FRONT_BASE_URL


@router.get("/products/{product_id}", response_model=schemas.ProductRead)
def public_product(product_id: int, db: Session = Depends(get_db)):
    """Détail public d'un produit (utilisé par la page consommateur)."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return product_to_read(product)


@router.get("/products/{product_id}/qrcode")
def public_qrcode(product_id: int, request: Request, db: Session = Depends(get_db)):
    """Génère un PNG du QR code pointant vers la page publique du produit.

    L'URL encodée est calculée dynamiquement (cf. `_detect_front_base_url`)
    pour qu'un QR généré depuis le LAN soit scannable par un téléphone sur
    le même Wi-Fi.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    front_base = _detect_front_base_url(request)
    url = f"{front_base}/p/{product_id}"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f5132", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-Public-URL": url,
        },
    )
