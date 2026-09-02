"""Clasificación del abecedario dactilológico de la LSC.

HU-25 — Detección de manos con MediaPipe.

Traduce los 21 puntos de MediaPipe Hands a una letra usando **reglas
geométricas** en lugar de un modelo entrenado. Las letras son poses estáticas
que se distinguen por qué dedos están extendidos y dónde queda el pulgar, así
que se pueden describir con reglas y no necesitan datos de entrenamiento.

── Marco de referencia de la mano ───────────────────────────────────────────

Las mediciones NO usan las coordenadas de la imagen directamente, porque
dependerían de cómo esté inclinada la mano frente a la cámara. En su lugar se
construye un sistema de ejes propio de la mano:

    eje LARGO   muñeca (0) → nudillo del medio (9)
    eje ANCHO   nudillo del índice (5) → nudillo del meñique (17)

Cada punto se proyecta sobre esos ejes y se normaliza por el tamaño de la
palma. Así "el pulgar está arriba y hacia afuera" significa lo mismo con la
mano derecha, la izquierda, vertical o inclinada.

── Índices de MediaPipe Hands ───────────────────────────────────────────────

     0  muñeca
     1-4    pulgar   (4  = punta)
     5-8    índice   (8  = punta)
     9-12   medio    (12 = punta)
     13-16  anular   (16 = punta)
     17-20  meñique  (20 = punta)
"""

import math
from typing import Dict, List, Optional, Tuple

MUNECA = 0
PUNTAS = {"pulgar": 4, "indice": 8, "medio": 12, "anular": 16, "menique": 20}
MEDIAS = {"pulgar": 3, "indice": 6, "medio": 10, "anular": 14, "menique": 18}
BASES  = {"pulgar": 2, "indice": 5, "medio": 9, "anular": 13, "menique": 17}


def _dist(a, b) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


class MarcoMano:
    """Sistema de coordenadas propio de la mano.

    Permite medir posiciones sin depender de la orientación de la mano frente
    a la cámara.
    """

    def __init__(self, lm):
        muneca = lm[MUNECA]
        nudillo_medio = lm[BASES["medio"]]
        nudillo_indice = lm[BASES["indice"]]
        nudillo_menique = lm[BASES["menique"]]

        # Eje largo: de la muñeca hacia los nudillos (el "arriba" de la mano)
        lx = nudillo_medio.x - muneca.x
        ly = nudillo_medio.y - muneca.y
        self.palma = math.hypot(lx, ly) or 1e-6
        self.ux, self.uy = lx / self.palma, ly / self.palma

        # Eje ancho: del índice hacia el meñique (el "hacia adentro")
        ax = nudillo_menique.x - nudillo_indice.x
        ay = nudillo_menique.y - nudillo_indice.y
        ancho = math.hypot(ax, ay) or 1e-6
        self.vx, self.vy = ax / ancho, ay / ancho

        self.origen = muneca

    def proyectar(self, punto) -> Tuple[float, float]:
        """Devuelve (largo, ancho) del punto en el marco de la mano.

        largo → 0 en la muñeca, 1 en los nudillos, >1 más allá.
        ancho → negativo del lado del pulgar, positivo del lado del meñique.
        """
        dx = punto.x - self.origen.x
        dy = punto.y - self.origen.y
        largo = (dx * self.ux + dy * self.uy) / self.palma
        ancho = (dx * self.vx + dy * self.vy) / self.palma
        return largo, ancho

    def normalizar(self, distancia: float) -> float:
        """Convierte una distancia a unidades de palma."""
        return distancia / self.palma


def _extendido(lm, marco: MarcoMano, dedo: str) -> bool:
    """¿El dedo está extendido?"""
    if dedo == "pulgar":
        # El pulgar no se dobla hacia la palma sino de lado, así que se mide
        # su separación respecto del nudillo del índice.
        return marco.normalizar(_dist(lm[PUNTAS["pulgar"]], lm[BASES["indice"]])) > 0.62

    largo_punta, _ = marco.proyectar(lm[PUNTAS[dedo]])
    largo_media, _ = marco.proyectar(lm[MEDIAS[dedo]])
    return largo_punta > largo_media + 0.10


def _juntos(lm, marco: MarcoMano, a: str, b: str, umbral: float = 0.40) -> bool:
    return marco.normalizar(_dist(lm[PUNTAS[a]], lm[PUNTAS[b]])) < umbral


def _patron(lm, marco: MarcoMano) -> Tuple[bool, bool, bool, bool, bool]:
    return (
        _extendido(lm, marco, "pulgar"),
        _extendido(lm, marco, "indice"),
        _extendido(lm, marco, "medio"),
        _extendido(lm, marco, "anular"),
        _extendido(lm, marco, "menique"),
    )


# ── Patrones de dedos extendidos → letras candidatas ─────────────────────────

PATRONES: Dict[Tuple[bool, bool, bool, bool, bool], List[str]] = {
    # Los cuatro dedos largos doblados: A, E y S se distinguen SOLO por dónde
    # queda el pulgar, así que ambos patrones van al mismo desempate. Antes
    # "solo pulgar" mapeaba directo a A y la E nunca se podía detectar.
    (False, False, False, False, False): ["A", "E", "C"],
    (True,  False, False, False, False): ["A", "E", "C"],
    (False, True,  False, False, False): ["D", "X", "Z"],
    (False, True,  True,  False, False): ["U", "V"],
    (False, True,  True,  True,  False): ["W", "F"],
    (False, True,  True,  True,  True):  ["B"],
    (True,  True,  True,  True,  True):  ["B"],
    (True,  False, False, False, True):  ["Y"],
    (False, True,  False, False, True):  ["Y"],
    (True,  True,  False, False, False): ["L"],
    (True,  True,  True,  False, False): ["K"],
    (False, False, False, False, True):  ["I", "J"],
}


def _desempatar_puno(lm, marco: MarcoMano) -> Tuple[str, float]:
    """Distingue A, E y C — las tres con los dedos largos recogidos.

    Los umbrales salen de una calibración con manos reales (21 letras, 8
    muestras por letra, mediana de cada medición). Los valores medidos:

        letra   pulgar_largo   pulgar_ancho   pulgar→nudillo
        A           1.052         -0.922          0.523
        C           0.777         -0.670          0.573
        E           0.737         -0.492          0.289

    La A se separa porque el pulgar sube alto Y queda muy hacia afuera; usar
    solo uno de los dos ejes dejaba a la C en el medio. Entre C y E decide la
    distancia del pulgar al nudillo del índice, que es la que mejor las separa.
    """
    largo, ancho = marco.proyectar(lm[PUNTAS["pulgar"]])
    d_nudillo = marco.normalizar(_dist(lm[PUNTAS["pulgar"]], lm[BASES["indice"]]))

    # A: pulgar arriba y bien afuera (medido 1.05 / -0.92)
    if largo > 0.90 and ancho < -0.70:
        return "A", 0.85

    # C: mano curvada, el pulgar queda separado del nudillo (medido 0.57)
    if d_nudillo > 0.43:
        return "C", 0.70

    # E: pulgar recogido, pegado al nudillo (medido 0.29)
    return "E", 0.80


def _desempatar(letras: List[str], lm, marco: MarcoMano) -> Tuple[str, float]:
    """Elige entre letras que comparten el mismo patrón de dedos."""
    if len(letras) == 1:
        return letras[0], 0.88

    conjunto = set(letras)

    if conjunto == {"A", "E", "C"}:
        return _desempatar_puno(lm, marco)

    if conjunto == {"U", "V"}:
        # Calibrado: U = 0.478, V = 0.716. Corte en el punto medio.
        separacion = marco.normalizar(_dist(lm[PUNTAS["indice"]], lm[PUNTAS["medio"]]))
        return ("V", 0.86) if separacion > 0.60 else ("U", 0.78)

    if conjunto == {"W", "F"}:
        # En la F el pulgar y el índice forman un círculo tocándose.
        if _juntos(lm, marco, "pulgar", "indice", umbral=0.40):
            return "F", 0.80
        return "W", 0.82

    if conjunto == {"D", "X", "Z"}:
        # La X tiene el índice en gancho: la punta no avanza mucho más allá de
        # su articulación media. La Z requiere movimiento, imposible de
        # determinar con un solo frame.
        largo_punta, _ = marco.proyectar(lm[PUNTAS["indice"]])
        largo_media, _ = marco.proyectar(lm[MEDIAS["indice"]])
        return ("X", 0.70) if largo_punta - largo_media < 0.35 else ("D", 0.76)

    if conjunto == {"I", "J"}:
        # La J requiere trazar un movimiento; con un frame se asume I.
        return "I", 0.76

    return letras[0], 0.50


def _es_letra_d(lm, marco: MarcoMano) -> bool:
    """La D tiene una firma inconfundible: el pulgar toca la yema del índice.

    Calibrado: pulgar_a_yema_indice = 0.12, mientras que en el resto de las
    letras esa distancia va de 0.21 para arriba. Se comprueba antes que el
    patrón de dedos porque MediaPipe interpreta esta pose de forma
    inconsistente según el ángulo de la mano.
    """
    return marco.normalizar(_dist(lm[PUNTAS["pulgar"]], lm[PUNTAS["indice"]])) < 0.18


def clasificar_letra(landmarks) -> Tuple[Optional[str], Optional[float]]:
    """Traduce los 21 landmarks de una mano a una letra del abecedario.

    Returns:
        (letra, confianza). Ambos None si la pose no coincide con ninguna letra
        conocida. Es preferible no responder a inventar una letra: el usuario
        prefiere reintentar antes que leer algo que no señó.
    """
    if landmarks is None or len(landmarks) < 21:
        return None, None

    marco = MarcoMano(landmarks)

    # La D se comprueba primero: su firma geométrica es más confiable que el
    # patrón de dedos extendidos para esa pose.
    if _es_letra_d(landmarks, marco):
        return "D", 0.84

    candidatas = PATRONES.get(_patron(landmarks, marco))

    if not candidatas:
        return None, None

    return _desempatar(candidatas, landmarks, marco)


def medir_pose(landmarks) -> dict:
    """Mediciones crudas de la pose, para calibrar los umbrales.

    Las reglas de este módulo usan umbrales que dependen de la anatomía de
    cada persona y de cómo hace la seña. Este diccionario permite ver los
    valores reales con manos de verdad, en lugar de adivinarlos.
    """
    if landmarks is None or len(landmarks) < 21:
        return {"error": "sin datos de mano"}

    marco = MarcoMano(landmarks)
    largo_pulgar, ancho_pulgar = marco.proyectar(landmarks[PUNTAS["pulgar"]])

    return {
        "dedos_extendidos": {
            nombre: bool(valor)
            for nombre, valor in zip(
                ("pulgar", "indice", "medio", "anular", "menique"),
                _patron(landmarks, marco),
            )
        },
        "pulgar_largo": round(largo_pulgar, 3),
        "pulgar_ancho": round(ancho_pulgar, 3),
        "pulgar_a_yema_indice": round(
            marco.normalizar(_dist(landmarks[PUNTAS["pulgar"]], landmarks[PUNTAS["indice"]])), 3
        ),
        # Es la medida que decide si el pulgar cuenta como extendido
        "pulgar_a_nudillo_indice": round(
            marco.normalizar(_dist(landmarks[PUNTAS["pulgar"]], landmarks[BASES["indice"]])), 3
        ),
        "pulgar_a_yema_medio": round(
            marco.normalizar(_dist(landmarks[PUNTAS["pulgar"]], landmarks[PUNTAS["medio"]])), 3
        ),
        "separacion_indice_medio": round(
            marco.normalizar(_dist(landmarks[PUNTAS["indice"]], landmarks[PUNTAS["medio"]])), 3
        ),
    }


def describir_pose(landmarks) -> str:
    """Descripción legible de qué dedos están extendidos."""
    if landmarks is None or len(landmarks) < 21:
        return "sin datos de mano"

    marco = MarcoMano(landmarks)
    nombres = ["pulgar", "índice", "medio", "anular", "meñique"]
    extendidos = [n for n, e in zip(nombres, _patron(landmarks, marco)) if e]

    if not extendidos:
        return "puño cerrado"
    if len(extendidos) == 5:
        return "mano abierta"
    return "dedos extendidos: " + ", ".join(extendidos)
