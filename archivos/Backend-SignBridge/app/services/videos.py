"""Videos de señas guardados en el servidor.

Hay dos carpetas dentro de Backend-SignBridge/media/:

- videos/   los videos del vocabulario inicial. Vienen en el repositorio y en
            la imagen de Docker; nunca se borran desde la aplicación.
- subidos/  los que sube el administrador desde la app. En Docker es un
            volumen, así que no se pierden al reconstruir la imagen.

Las dos se sirven en /media/... (ver app/main.py).

── Seguridad al subir archivos (OWASP A03 / A04) ─────────────────────────────
- Solo se aceptan tres tipos de video, y la extensión del archivo guardado sale
  del tipo aceptado, no del nombre que manda el usuario: así no se puede subir
  un "video.html" que el navegador ejecute.
- Se revisan los primeros bytes: un archivo que dice ser video pero no lo es
  se rechaza.
- El nombre en disco es un UUID: el usuario no elige rutas (nada de "../").
- Hay un tamaño máximo, y se corta apenas se pasa, sin leer el resto.
"""
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile

MEDIA_ROOT = Path(__file__).resolve().parents[2] / "media"
VIDEOS_REPO = MEDIA_ROOT / "videos"
VIDEOS_SUBIDOS = MEDIA_ROOT / "subidos"
URL_SUBIDOS = "/media/subidos/"

TAMANO_MAXIMO = 100 * 1024 * 1024  # 100 MB
BLOQUE = 1024 * 1024

# Tipo que declara el navegador → extensión con que se guarda.
TIPOS_ACEPTADOS = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}

# Primeros bytes de cada formato. MP4 y MOV tienen en los bytes 4 a 8 el
# nombre de su primera caja ("ftyp", o "moov"/"wide"/"mdat"/"free" en MOV
# viejos); WebM empieza con la cabecera EBML 1A 45 DF A3.
_CAJAS_ISO = {b"ftyp", b"moov", b"wide", b"mdat", b"free"}
_EBML = b"\x1a\x45\xdf\xa3"


def es_video(contenido: bytes, tipo: str) -> bool:
    if tipo == "video/webm":
        return contenido.startswith(_EBML)
    return len(contenido) >= 8 and contenido[4:8] in _CAJAS_ISO


async def guardar_video(archivo: UploadFile) -> str:
    """Valida y guarda el video. Devuelve la URL relativa (/media/subidos/x.mp4)."""
    extension = TIPOS_ACEPTADOS.get(archivo.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de archivo no soportado: {archivo.content_type}. Use MP4, WebM o MOV.",
        )

    partes, total = [], 0
    while bloque := await archivo.read(BLOQUE):
        total += len(bloque)
        if total > TAMANO_MAXIMO:
            raise HTTPException(status_code=413, detail="El archivo supera el límite de 100 MB.")
        partes.append(bloque)
    contenido = b"".join(partes)

    if not es_video(contenido, archivo.content_type):
        raise HTTPException(status_code=415, detail="El archivo no es un video válido.")

    VIDEOS_SUBIDOS.mkdir(parents=True, exist_ok=True)
    nombre = f"{uuid.uuid4()}{extension}"
    (VIDEOS_SUBIDOS / nombre).write_bytes(contenido)
    return URL_SUBIDOS + nombre


def borrar_video_subido(url: Optional[str]) -> None:
    """Borra del disco un video subido. Los del repositorio (/media/videos/)
    y los enlaces externos (YouTube) no se tocan."""
    if not url or not url.startswith(URL_SUBIDOS):
        return
    ruta = (VIDEOS_SUBIDOS / Path(url).name).resolve()
    if ruta.parent != VIDEOS_SUBIDOS.resolve():
        return  # nunca fuera de la carpeta de subidos
    ruta.unlink(missing_ok=True)
