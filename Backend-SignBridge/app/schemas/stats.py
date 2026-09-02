"""Schemas de las estadísticas de interacción con el software.

Responden al punto de corrección "Estadística de frases más usadas: implementar
estadísticas relacionadas con cómo el usuario interactúa con el software".
"""

from typing import Optional
from pydantic import BaseModel


class TopWordRow(BaseModel):
    """Una palabra/seña dentro del ranking de más traducidas."""
    id_lexicalunit:   str
    word:             str
    times_translated: int
    video_url:        Optional[str] = None
    # Promedio de estrellas de la traducción de esta palabra (None si nadie la
    # ha calificado). Cruzar "muy usada" con "mal calificada" es lo que indica
    # qué contenido conviene revisar primero.
    average_rating:   Optional[float] = None
    total_ratings:    int = 0


class TranslationTypeRow(BaseModel):
    """Cuántas traducciones se hicieron por cada canal (texto, voz, seña)."""
    translation_type: str
    total:            int


class ActivityRow(BaseModel):
    """Traducciones por día, para ver la evolución del uso."""
    day:   str   # ISO: YYYY-MM-DD
    total: int


class InteractionSummary(BaseModel):
    """Resumen de cómo se está usando la aplicación."""
    total_sessions:         int
    total_words_translated: int
    distinct_words_used:    int
    words_not_found:        int    # señas del diccionario que nadie ha usado aún
    active_users:           int    # usuarios con al menos una traducción
    avg_words_per_session:  float


class HistorySign(BaseModel):
    """Una seña dentro de una traducción del historial."""
    word:      str
    video_url: Optional[str] = None


class HistorySession(BaseModel):
    """Una traducción concreta: cuándo, por qué canal y qué señas tuvo."""
    id_session:       str
    date_time:        Optional[str] = None   # ISO
    translation_type: Optional[str] = None
    signs:            list[HistorySign] = []


class HistoryDay(BaseModel):
    """Las traducciones de un día, agrupadas."""
    day:      str          # YYYY-MM-DD
    total:    int
    sessions: list[HistorySession] = []


class UnusedSign(BaseModel):
    """Una seña del diccionario que nadie tradujo todavía."""
    id_lexicalunit: str
    word:           str
    video_url:      Optional[str] = None


class GoalMilestone(BaseModel):
    """Una meta de traducciones alcanzada."""
    numero: int          # meta 1, 2, 3...
    fecha:  Optional[str] = None   # ISO — cuándo se alcanzó


class GoalProgress(BaseModel):
    """Progreso del usuario hacia su próxima meta de traducciones.

    No hay tabla de rachas: todo se deriva del historial de sesiones, así que
    funciona también para las traducciones que ya existían.
    """
    meta:                int    # cuántas traducciones son una meta
    total_traducciones:  int
    en_ciclo_actual:     int    # llevadas en la meta en curso
    metas_completadas:   int
    historial:           list[GoalMilestone] = []


class TicketStatusRow(BaseModel):
    """Cuántos tickets hay en cada estado."""
    status: str
    total:  int


class OldestPendingTicket(BaseModel):
    """El ticket sin resolver que más tiempo lleva esperando."""
    id_support: str
    subject:    str
    status:     str
    fecha:      Optional[str] = None   # ISO
    dias:       int


class TicketSummary(BaseModel):
    """Panorama de los tickets de soporte.

    Un número suelto de "9 tickets" no dice nada accionable; lo útil es cuántos
    están esperando respuesta y cuál se está quedando atrás.
    """
    total:                 int
    por_estado:            list[TicketStatusRow] = []
    sin_resolver:          int
    mas_viejo_pendiente:   Optional[OldestPendingTicket] = None
    # Promedio en días entre creación y resolución. None si todavía no hay
    # ningún ticket resuelto.
    dias_promedio_resolucion: Optional[float] = None
    resueltos_medidos:     int = 0

