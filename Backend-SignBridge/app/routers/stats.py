"""Estadísticas de interacción con el software.

Responde al punto de corrección: "Estadística de frases más usadas — implementar
estadísticas relacionadas con cómo el usuario interactúa con el software".

Todo sale de datos que ya genera la aplicación:
  - TranslationSession   → cuándo y por qué canal (texto / voz / seña) se tradujo
  - TranslationDetail    → qué palabras concretas se tradujeron
  - Feedback             → cómo se calificó cada palabra

Cada endpoint tiene dos alcances:
  - `/stats/mias/...`   → solo la actividad del usuario autenticado
  - `/stats/globales/...` → todo el sistema (rol Administrador)
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.user import (
    Feedback,
    LexicalUnit,
    SignInput,
    Support,
    TranslationDetail,
    TranslationSession,
    User,
)
from app.schemas.stats import (
    ActivityRow,
    GoalMilestone,
    GoalProgress,
    HistoryDay,
    HistorySession,
    HistorySign,
    InteractionSummary,
    OldestPendingTicket,
    TicketStatusRow,
    TicketSummary,
    TopWordRow,
    TranslationTypeRow,
    UnusedSign,
)

router = APIRouter(prefix="/stats", tags=["Estadísticas"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _consulta_palabras(db: Session, id_user: Optional[str], limite: int) -> List[TopWordRow]:
    """Ranking de palabras más traducidas, opcionalmente filtrado por usuario.

    El promedio de estrellas se calcula en una consulta aparte y no con un
    segundo JOIN: si se unieran Feedback y TranslationDetail en la misma
    consulta, cada calificación multiplicaría el conteo de traducciones.
    """
    q = (
        db.query(
            LexicalUnit.id_lexicalunit.label("id_lexicalunit"),
            LexicalUnit.text.label("word"),
            LexicalUnit.video_url.label("video_url"),
            func.count(TranslationDetail.id_detail).label("times_translated"),
        )
        .join(TranslationDetail, TranslationDetail.id_lexicalunit == LexicalUnit.id_lexicalunit)
        .join(TranslationSession, TranslationSession.id_session == TranslationDetail.id_session)
        .filter(
            LexicalUnit.deleted_at.is_(None),
            TranslationDetail.deleted_at.is_(None),
            TranslationSession.deleted_at.is_(None),
        )
    )
    if id_user:
        q = q.filter(TranslationSession.id_user == id_user)

    filas = (
        q.group_by(LexicalUnit.id_lexicalunit, LexicalUnit.text, LexicalUnit.video_url)
        .order_by(func.count(TranslationDetail.id_detail).desc(), LexicalUnit.text)
        .limit(limite)
        .all()
    )
    if not filas:
        return []

    ids = [f.id_lexicalunit for f in filas]
    calificaciones = dict()
    for id_lu, promedio, total in (
        db.query(
            Feedback.id_lexicalunit,
            func.avg(Feedback.rating),
            func.count(Feedback.id_feedback),
        )
        .filter(
            Feedback.id_lexicalunit.in_(ids),
            Feedback.deleted_at.is_(None),
        )
        .group_by(Feedback.id_lexicalunit)
        .all()
    ):
        calificaciones[id_lu] = (promedio, total)

    resultado = []
    for f in filas:
        promedio, total = calificaciones.get(f.id_lexicalunit, (None, 0))
        resultado.append(
            TopWordRow(
                id_lexicalunit   = f.id_lexicalunit,
                word             = f.word,
                times_translated = f.times_translated,
                video_url        = f.video_url,
                average_rating   = round(float(promedio), 2) if promedio is not None else None,
                total_ratings    = total or 0,
            )
        )
    return resultado


def _consulta_actividad(db: Session, id_user: Optional[str], dias: int) -> List[ActivityRow]:
    """Traducciones por día en los últimos `dias` días."""
    desde = datetime.now(timezone.utc) - timedelta(days=dias)
    dia = func.date(TranslationSession.date_time)

    q = (
        db.query(dia.label("day"), func.count(TranslationSession.id_session).label("total"))
        .filter(
            TranslationSession.deleted_at.is_(None),
            TranslationSession.date_time >= desde,
        )
    )
    if id_user:
        q = q.filter(TranslationSession.id_user == id_user)

    filas = q.group_by(dia).order_by(dia).all()
    return [ActivityRow(day=str(f.day), total=f.total) for f in filas]


def _consulta_por_canal(db: Session, id_user: Optional[str]) -> List[TranslationTypeRow]:
    """Cuántas traducciones se hicieron por cada canal (texto, voz, seña)."""
    q = (
        db.query(
            TranslationSession.translation_type.label("tipo"),
            func.count(TranslationSession.id_session).label("total"),
        )
        .filter(TranslationSession.deleted_at.is_(None))
    )
    if id_user:
        q = q.filter(TranslationSession.id_user == id_user)

    filas = q.group_by(TranslationSession.translation_type).all()
    return [
        TranslationTypeRow(translation_type=f.tipo or "sin especificar", total=f.total)
        for f in filas
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Estadísticas del propio usuario
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/mias/palabras", response_model=List[TopWordRow],
            summary="Tus palabras más traducidas")
def mis_palabras_mas_usadas(
    limite: int = Query(10, ge=1, le=50, description="Cuántas palabras devolver"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Las señas que más ha usado el usuario autenticado, de mayor a menor."""
    return _consulta_palabras(db, current_user.id_user, limite)


@router.get("/mias/actividad", response_model=List[ActivityRow],
            summary="Tu actividad de traducción por día")
def mi_actividad(
    dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cuántas traducciones hizo el usuario cada día en el período indicado."""
    return _consulta_actividad(db, current_user.id_user, dias)


@router.get("/mias/canales", response_model=List[TranslationTypeRow],
            summary="Cómo traducís: texto, voz o seña")
def mis_canales(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Distribución de las traducciones del usuario por canal de entrada."""
    return _consulta_por_canal(db, current_user.id_user)


# ─────────────────────────────────────────────────────────────────────────────
# Estadísticas globales (Administrador)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/globales/palabras", response_model=List[TopWordRow],
            summary="Palabras más traducidas de todo el sistema (Admin)")
def palabras_mas_usadas(
    limite: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Ranking global de señas más usadas, con el promedio de estrellas de cada una.

    Cruzar "muy traducida" con "mal calificada" es lo que indica qué contenido
    conviene revisar primero.
    """
    return _consulta_palabras(db, None, limite)


@router.get("/globales/actividad", response_model=List[ActivityRow],
            summary="Traducciones por día de todo el sistema (Admin)")
def actividad_global(
    dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Evolución del uso de la plataforma en los últimos días."""
    return _consulta_actividad(db, None, dias)


@router.get("/globales/canales", response_model=List[TranslationTypeRow],
            summary="Uso por canal de entrada de todo el sistema (Admin)")
def canales_globales(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Qué canal usa más la gente: escribir, dictar o mostrar señas a la cámara."""
    return _consulta_por_canal(db, None)


@router.get("/globales/resumen", response_model=InteractionSummary,
            summary="Resumen de interacción con el software (Admin)")
def resumen_interaccion(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Indicadores de uso: cuánto se traduce, cuánta variedad de vocabulario se
    usa y cuántas palabras pide la gente que todavía no están en el diccionario.
    """
    total_sesiones = (
        db.query(func.count(TranslationSession.id_session))
        .filter(TranslationSession.deleted_at.is_(None))
        .scalar()
    ) or 0

    total_palabras = (
        db.query(func.count(TranslationDetail.id_detail))
        .filter(TranslationDetail.deleted_at.is_(None))
        .scalar()
    ) or 0

    palabras_distintas = (
        db.query(func.count(func.distinct(TranslationDetail.id_lexicalunit)))
        .filter(TranslationDetail.deleted_at.is_(None))
        .scalar()
    ) or 0

    usuarios_activos = (
        db.query(func.count(func.distinct(TranslationSession.id_user)))
        .filter(TranslationSession.deleted_at.is_(None))
        .scalar()
    ) or 0

    # Vocabulario disponible que nadie ha usado nunca: señala qué señas del
    # diccionario no le sirven a nadie todavía.
    vocabulario_total = (
        db.query(func.count(LexicalUnit.id_lexicalunit))
        .filter(LexicalUnit.deleted_at.is_(None))
        .scalar()
    ) or 0

    return InteractionSummary(
        total_sessions         = total_sesiones,
        total_words_translated = total_palabras,
        distinct_words_used    = palabras_distintas,
        words_not_found        = max(vocabulario_total - palabras_distintas, 0),
        active_users           = usuarios_activos,
        avg_words_per_session  = round(total_palabras / total_sesiones, 2) if total_sesiones else 0.0,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Historial de traducciones agrupado por fecha
# ─────────────────────────────────────────────────────────────────────────────

CANAL_LABEL = {
    "texto": "Texto -> Señas",
    "text_to_sign": "Texto -> Señas",
    "voz": "Voz -> Señas",
    "voice_to_sign": "Voz -> Señas",
    "sena": "Señas -> Texto",
    "seña": "Señas -> Texto",
    "sign_to_text": "Señas -> Texto",
}


def _obtener_mi_historial(
    db: Session, id_user: str, dias: int, q: Optional[str] = None
) -> List[HistoryDay]:
    """Arma el historial agrupado por día para un usuario, con búsqueda
    opcional por palabra. Compartido entre el endpoint JSON y el de PDF para
    no repetir la consulta dos veces.
    """
    desde = datetime.now(timezone.utc) - timedelta(days=dias)

    query = db.query(TranslationSession).filter(
        TranslationSession.id_user == id_user,
        TranslationSession.deleted_at.is_(None),
        TranslationSession.date_time >= desde,
    )

    if q:
        patron = f"%{q.strip()}%"

        ids_por_palabra = (
            db.query(TranslationDetail.id_session)
            .join(LexicalUnit, LexicalUnit.id_lexicalunit == TranslationDetail.id_lexicalunit)
            .filter(
                TranslationDetail.deleted_at.is_(None),
                LexicalUnit.text.ilike(patron),
            )
        )
        ids_por_texto_deletreado = (
            db.query(SignInput.id_session)
            .filter(
                SignInput.deleted_at.is_(None),
                SignInput.generated_text.ilike(patron),
            )
        )
        ids_coincidentes = ids_por_palabra.union(ids_por_texto_deletreado).subquery()

        query = query.filter(TranslationSession.id_session.in_(select(ids_coincidentes)))

    sesiones = query.order_by(TranslationSession.date_time.desc()).all()
    if not sesiones:
        return []

    ids = [s.id_session for s in sesiones]

    # Todas las señas de esas sesiones en una sola consulta, en orden.
    detalles = (
        db.query(TranslationDetail, LexicalUnit)
        .join(LexicalUnit, LexicalUnit.id_lexicalunit == TranslationDetail.id_lexicalunit)
        .filter(
            TranslationDetail.id_session.in_(ids),
            TranslationDetail.deleted_at.is_(None),
        )
        .order_by(TranslationDetail.id_session, TranslationDetail.order)
        .all()
    )

    por_sesion: dict = {}
    for detalle, palabra in detalles:
        por_sesion.setdefault(detalle.id_session, []).append(
            HistorySign(word=palabra.text or "", video_url=palabra.video_url)
        )

    # Palabra/frase completa que el usuario deletreó en H03 (seña → texto),
    # si la confirmó con /frame/palabra. Se prefiere sobre la lista de letras
    # sueltas al mostrar el historial — ver record_sign_input.
    textos_generados = (
        db.query(SignInput.id_session, SignInput.generated_text)
        .filter(
            SignInput.id_session.in_(ids),
            SignInput.deleted_at.is_(None),
        )
        .order_by(SignInput.created_at.desc())
        .all()
    )
    texto_por_sesion: dict = {}
    for id_session, generated_text in textos_generados:
        texto_por_sesion.setdefault(id_session, generated_text)  # el primero (más reciente) gana

    dias_map: dict = {}
    for s in sesiones:
        clave = s.date_time.date().isoformat() if s.date_time else "sin fecha"
        dias_map.setdefault(clave, []).append(
            HistorySession(
                id_session       = s.id_session,
                date_time        = s.date_time.isoformat() if s.date_time else None,
                translation_type = s.translation_type,
                signs            = por_sesion.get(s.id_session, []),
                generated_text   = texto_por_sesion.get(s.id_session),
            )
        )

    return [
        HistoryDay(day=dia, total=len(lista), sessions=lista)
        for dia, lista in dias_map.items()
    ]


@router.get("/mias/historial", response_model=List[HistoryDay],
            summary="Tu historial de traducciones, agrupado por día")
def mi_historial(
    dias: int = Query(30, ge=1, le=365, description="Cuántos días hacia atrás"),
    q: Optional[str] = Query(None, min_length=1, description="Buscar por palabra dentro del historial"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Las traducciones del usuario ordenadas por fecha, de la más reciente a
    la más antigua, con las señas que tuvo cada una.

    Si se pasa `q`, se filtra a las sesiones donde alguna de las señas
    traducidas coincide con el texto buscado, o donde el texto deletreado
    por seña (H03) contiene esa palabra.
    """
    return _obtener_mi_historial(db, current_user.id_user, dias, q)


@router.get("/mias/historial/pdf",
            summary="Exportar tu historial de traducciones en PDF")
def exportar_mi_historial_pdf(
    dias: int = Query(30, ge=1, le=365),
    q: Optional[str] = Query(None, min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera un PDF con el mismo historial que ve el usuario en pantalla
    (mismo filtro por días y búsqueda por palabra, si se envía).
    """
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from xml.sax.saxutils import escape

    dias_data = _obtener_mi_historial(db, current_user.id_user, dias, q)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=2 * cm, bottomMargin=2 * cm, leftMargin=2 * cm, rightMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    titulo_style = ParagraphStyle(
        "TituloSB", parent=styles["Heading1"], textColor=colors.HexColor("#2823BC"),
    )
    dia_style = ParagraphStyle(
        "DiaSB", parent=styles["Heading3"], spaceBefore=14, spaceAfter=6,
        textColor=colors.HexColor("#252440"),
    )

    nombre = getattr(current_user, "first_name", "") or ""
    apellido = getattr(current_user, "last_name", "") or ""
    nombre_completo = f"{nombre} {apellido}".strip() or current_user.email

    elementos = [
        Paragraph("SignBridge - Historial de traducciones", titulo_style),
        Paragraph(f"Usuario: {escape(nombre_completo)}", styles["Normal"]),
        Paragraph(
            f"Generado el {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}",
            styles["Normal"],
        ),
    ]
    if q:
        elementos.append(Paragraph(f'Filtro de busqueda: "{escape(q)}"', styles["Normal"]))
    elementos.append(Spacer(1, 0.6 * cm))

    if not dias_data:
        elementos.append(Paragraph("No hay traducciones para este periodo/busqueda.", styles["Normal"]))
    else:
        # Días de más reciente a más antiguo, igual que en la vista web.
        for dia in sorted(dias_data, key=lambda d: d.day, reverse=True):
            elementos.append(Paragraph(f"{dia.day} - {dia.total} traduccion(es)", dia_style))

            filas = [["Hora", "Canal", "Traduccion"]]
            for s in dia.sessions:
                hora = ""
                if s.date_time:
                    try:
                        hora = datetime.fromisoformat(s.date_time).strftime("%H:%M")
                    except ValueError:
                        hora = ""
                canal = CANAL_LABEL.get(s.translation_type or "", s.translation_type or "-")
                if s.generated_text:
                    contenido = s.generated_text
                elif s.signs:
                    contenido = ", ".join(sign.word for sign in s.signs)
                else:
                    contenido = "Sin señas registradas"
                filas.append([hora, canal, contenido])

            tabla = Table(filas, colWidths=[2.2 * cm, 3.5 * cm, 9.3 * cm])
            tabla.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2823BC")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            elementos.append(tabla)

    doc.build(elementos)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=historial-signbridge.pdf"},
    )


@router.delete("/mias/historial/{id_session}", status_code=204,
               summary="Eliminar una traducción de tu propio historial")
def eliminar_de_mi_historial(
    id_session: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Oculta (soft-delete) una sesión de traducción del historial del usuario
    dueño. No borra la fila físicamente — igual que al eliminar una
    valoración — y por eso mismo no afecta las estadísticas globales del
    Admin, que cuentan todo lo que pasó independientemente de si el usuario
    después lo ocultó de su propia vista.
    """
    sesion = (
        db.query(TranslationSession)
        .filter(
            TranslationSession.id_session == id_session,
            TranslationSession.id_user == current_user.id_user,
            TranslationSession.deleted_at.is_(None),
        )
        .first()
    )
    if not sesion:
        raise HTTPException(status_code=404, detail="Traducción no encontrada")

    sesion.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Señas del diccionario que nadie usó
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/globales/sin-usar", response_model=List[UnusedSign],
            summary="Señas que nadie tradujo todavía (Admin)")
def senas_sin_usar(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Vocabulario cargado que nunca apareció en una traducción.

    Antes la tarjeta "Señas que nadie usó" mostraba el mismo listado que las
    otras dos, porque solo existía el ranking de las MÁS usadas. Esta consulta
    devuelve justo lo contrario.
    """
    usadas = (
        select(TranslationDetail.id_lexicalunit)
        .where(TranslationDetail.deleted_at.is_(None))
        .distinct()
    )

    filas = (
        db.query(LexicalUnit)
        .filter(
            LexicalUnit.deleted_at.is_(None),
            ~LexicalUnit.id_lexicalunit.in_(usadas),
        )
        .order_by(LexicalUnit.text)
        .all()
    )
    return [
        UnusedSign(id_lexicalunit=f.id_lexicalunit, word=f.text or "", video_url=f.video_url)
        for f in filas
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Progreso hacia la meta de traducciones (racha)
# ─────────────────────────────────────────────────────────────────────────────

META_TRADUCCIONES = 10


@router.get("/mias/progreso", response_model=GoalProgress,
            summary="Tu progreso hacia la próxima meta de traducciones")
def mi_progreso(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cuántas traducciones llevás en la meta en curso y cuáles ya cumpliste.

    La barra se reinicia sola en cada meta: si llevás 23 traducciones y la meta
    es de 10, van 2 metas cumplidas y 3 en la actual.

    No hace falta una tabla de rachas. Las metas se derivan del historial de
    sesiones ordenado por fecha: la sesión número 10 marca la primera meta, la
    20 la segunda, y así. Como sale del historial, también cuenta lo que el
    usuario ya había traducido antes de que existiera esta función.
    """
    sesiones = (
        db.query(TranslationSession.date_time)
        .filter(
            TranslationSession.id_user == current_user.id_user,
            TranslationSession.deleted_at.is_(None),
        )
        .order_by(TranslationSession.date_time.asc())
        .all()
    )

    total = len(sesiones)
    completadas = total // META_TRADUCCIONES

    historial = []
    for n in range(1, completadas + 1):
        # La sesión que cerró esa meta (índice base 0)
        fecha = sesiones[n * META_TRADUCCIONES - 1][0]
        historial.append(
            GoalMilestone(numero=n, fecha=fecha.isoformat() if fecha else None)
        )

    return GoalProgress(
        meta               = META_TRADUCCIONES,
        total_traducciones = total,
        en_ciclo_actual    = total % META_TRADUCCIONES,
        metas_completadas  = completadas,
        historial          = historial,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Estado del soporte
# ─────────────────────────────────────────────────────────────────────────────

# Estados que cuentan como "todavía esperando" al usuario.
ESTADOS_ABIERTOS = ("pending", "in_progress")


@router.get("/globales/tickets", response_model=TicketSummary,
            summary="Desglose de los tickets de soporte (Admin)")
def resumen_tickets(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Cuántos tickets hay por estado, cuál lleva más tiempo sin resolver y
    cuánto se tarda en promedio en resolverlos.
    """
    ahora = datetime.now(timezone.utc)

    por_estado = [
        TicketStatusRow(status=estado or "sin estado", total=total)
        for estado, total in (
            db.query(Support.status, func.count(Support.id_support))
            .filter(Support.deleted_at.is_(None))
            .group_by(Support.status)
            .all()
        )
    ]
    total = sum(f.total for f in por_estado)
    sin_resolver = sum(f.total for f in por_estado if f.status in ESTADOS_ABIERTOS)

    # ── El más viejo todavía sin resolver ───────────────────────────────────
    viejo = (
        db.query(Support)
        .filter(
            Support.deleted_at.is_(None),
            Support.status.in_(ESTADOS_ABIERTOS),
        )
        .order_by(Support.date.asc())
        .first()
    )

    mas_viejo = None
    if viejo and viejo.date:
        creado = viejo.date
        # La columna es naive; se le asigna UTC para poder restarla.
        if creado.tzinfo is None:
            creado = creado.replace(tzinfo=timezone.utc)
        mas_viejo = OldestPendingTicket(
            id_support = viejo.id_support,
            subject    = viejo.subject or "Sin asunto",
            status     = viejo.status or "",
            fecha      = viejo.date.isoformat(),
            dias       = max((ahora - creado).days, 0),
        )

    # ── Tiempo promedio de resolución ───────────────────────────────────────
    # Se mide entre la creación y la última actualización de los resueltos.
    # Es una aproximación: no hay columna con la fecha exacta de resolución,
    # así que un ticket editado después de resolverse infla su tiempo.
    resueltos = (
        db.query(Support.date, Support.updated_at)
        .filter(
            Support.deleted_at.is_(None),
            Support.status == "resolved",
            Support.date.isnot(None),
            Support.updated_at.isnot(None),
        )
        .all()
    )

    duraciones = [
        (fin - ini).total_seconds() / 86400
        for ini, fin in resueltos
        if fin >= ini
    ]
    promedio = round(sum(duraciones) / len(duraciones), 1) if duraciones else None

    return TicketSummary(
        total                    = total,
        por_estado               = por_estado,
        sin_resolver             = sin_resolver,
        mas_viejo_pendiente      = mas_viejo,
        dias_promedio_resolucion = promedio,
        resueltos_medidos        = len(duraciones),
    )
