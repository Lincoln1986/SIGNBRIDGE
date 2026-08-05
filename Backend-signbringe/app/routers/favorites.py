import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import FavoriteWords, LexicalUnit, User
from app.schemas.favorites import FavoriteWordOut, FavoriteWordToggle

router = APIRouter(prefix="/favorites", tags=["Palabras Favoritas"])


def _build_out(fav: FavoriteWords) -> FavoriteWordOut:
    return FavoriteWordOut(
        id_favorite    = fav.id_favorite,
        id_lexicalunit = fav.id_lexicalunit,
        word_text      = fav.lexical_unit.text if fav.lexical_unit else "",
        video_url      = fav.lexical_unit.video_url if fav.lexical_unit else None,
        times_used     = fav.times_used or 0,
        created_at     = fav.created_at,
    )


@router.post("/{id_lexicalunit}", response_model=FavoriteWordToggle, status_code=200,
             summary="Marcar / desmarcar una palabra como favorita")
def toggle_favorite(
    id_lexicalunit: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Si la palabra ya es favorita la elimina (soft delete); si no, la agrega.
    Devuelve `action: "added"` o `action: "removed"`.
    """
    unit = db.query(LexicalUnit).filter(
        LexicalUnit.id_lexicalunit == id_lexicalunit,
        LexicalUnit.deleted_at.is_(None),
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unidad léxica no encontrada")

    existing = db.query(FavoriteWords).filter(
        FavoriteWords.id_user       == current_user.id_user,
        FavoriteWords.id_lexicalunit == id_lexicalunit,
        FavoriteWords.deleted_at.is_(None),
    ).first()

    if existing:
        existing.deleted_at = datetime.now(timezone.utc)
        db.commit()
        return FavoriteWordToggle(action="removed", id_lexicalunit=id_lexicalunit)

    fav = FavoriteWords(
        id_favorite    = str(uuid.uuid4()),
        id_user        = current_user.id_user,
        id_lexicalunit = id_lexicalunit,
        times_used     = 0,
    )
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return FavoriteWordToggle(
        action         = "added",
        id_favorite    = fav.id_favorite,
        id_lexicalunit = id_lexicalunit,
    )


@router.get("/my", response_model=List[FavoriteWordOut],
            summary="Listar palabras favoritas del usuario autenticado")
def my_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve todas las palabras favoritas del usuario, ordenadas por las más usadas."""
    favs = (
        db.query(FavoriteWords)
        .filter(
            FavoriteWords.id_user    == current_user.id_user,
            FavoriteWords.deleted_at.is_(None),
        )
        .order_by(FavoriteWords.times_used.desc())
        .all()
    )
    return [_build_out(f) for f in favs]


@router.post("/{id_lexicalunit}/use", status_code=200,
             summary="Incrementar contador de uso de una palabra favorita")
def increment_usage(
    id_lexicalunit: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Incrementa `times_used` de la palabra favorita del usuario autenticado.
    Llamar cada vez que el usuario utilice esa seña en una traducción.
    """
    fav = db.query(FavoriteWords).filter(
        FavoriteWords.id_user        == current_user.id_user,
        FavoriteWords.id_lexicalunit == id_lexicalunit,
        FavoriteWords.deleted_at.is_(None),
    ).first()
    if not fav:
        raise HTTPException(
            status_code=404,
            detail="Esta palabra no está en tus favoritos",
        )

    fav.times_used    = (fav.times_used or 0) + 1
    fav.updated_at    = datetime.now(timezone.utc)
    db.commit()
    return {"id_lexicalunit": id_lexicalunit, "times_used": fav.times_used}
