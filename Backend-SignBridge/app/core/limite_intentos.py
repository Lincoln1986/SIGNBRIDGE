"""Límite de intentos fallidos de inicio de sesión (OWASP A04 / A07).

Sin un límite, alguien puede probar miles de contraseñas contra una cuenta
(fuerza bruta) o una misma contraseña contra muchas cuentas. Aquí se cuentan
los intentos fallidos por dos claves:

- **Por correo:** 5 fallos en 15 minutos bloquean ese correo 15 minutos.
  Se cuenta igual si el correo existe o no, para que la respuesta 429 no
  revele qué correos están registrados.
- **Por IP:** 20 fallos en 15 minutos bloquean esa dirección, aunque vaya
  cambiando de correo.

Un inicio de sesión correcto borra el contador de ese correo.

Los contadores viven en memoria del proceso. Con un solo proceso de uvicorn
(como en el Dockerfile) es suficiente; si se reinicia el backend, se
reinician. Con varios procesos o servidores habría que guardarlos en un
almacén compartido como Redis.
"""
import math
import time
from collections import defaultdict, deque
from threading import Lock
from typing import Callable, Deque, Dict


class LimiteIntentos:
    """Ventana deslizante: cuenta los fallos de los últimos `ventana` segundos."""

    def __init__(self, max_intentos: int, ventana_segundos: int,
                 reloj: Callable[[], float] = time.monotonic):
        self.max_intentos = max_intentos
        self.ventana = ventana_segundos
        self._reloj = reloj
        self._fallos: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _purgar(self, clave: str, ahora: float) -> Deque[float]:
        fallos = self._fallos[clave]
        while fallos and ahora - fallos[0] >= self.ventana:
            fallos.popleft()
        return fallos

    def segundos_bloqueado(self, clave: str) -> int:
        """0 si la clave puede intentar; si no, cuántos segundos le faltan."""
        with self._lock:
            ahora = self._reloj()
            fallos = self._purgar(clave, ahora)
            if len(fallos) < self.max_intentos:
                return 0
            # Se desbloquea cuando el fallo más viejo sale de la ventana.
            return max(1, math.ceil(fallos[0] + self.ventana - ahora))

    def registrar_fallo(self, clave: str) -> None:
        with self._lock:
            ahora = self._reloj()
            self._purgar(clave, ahora).append(ahora)

    def limpiar(self, clave: str) -> None:
        with self._lock:
            self._fallos.pop(clave, None)

    def reiniciar(self) -> None:
        with self._lock:
            self._fallos.clear()
