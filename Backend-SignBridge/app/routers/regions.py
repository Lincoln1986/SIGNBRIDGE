from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.user import Region
from app.schemas.regions import RegionOut

router = APIRouter(prefix="/regions", tags=["Regiones"])


@router.get("", response_model=List[RegionOut], summary="Listar regiones/ciudades")
def list_regions(db: Session = Depends(get_db)):
    """
    Devuelve todas las regiones activas ordenadas alfabéticamente por nombre.
    Público — no requiere autenticación.
    Reemplaza la lista hardcodeada del frontend.
    """
    regions = (
        db.query(Region)
        .filter(Region.deleted_at.is_(None))
        .order_by(Region.region_name)
        .all()
    )
    return regions
