"""Validaciones de los tickets de soporte (lo que llega a POST /support y PATCH /support/{id}/status).

Autor: @Lincoln1986 · S2 (capa E2E/CI + unitarias de la semana)

Pruebas unitarias: se crea el esquema de Pydantic directamente, sin levantar
FastAPI ni tocar la base de datos.
"""
import pytest
from pydantic import ValidationError

from app.schemas.support import SupportCreate, SupportStatusUpdate


def test_should_trim_the_subject_and_the_message():
    # Arrange
    datos = {"subject": "  No carga el video  ", "message": "  La seña de Hola no aparece  "}

    # Act
    ticket = SupportCreate(**datos)

    # Assert
    assert ticket.subject == "No carga el video"
    assert ticket.message == "La seña de Hola no aparece"


@pytest.mark.parametrize(("campo", "mensaje"), [
    ("subject", "El asunto es obligatorio"),
    ("message", "El mensaje es obligatorio"),
])
def test_should_reject_a_field_with_only_spaces(campo, mensaje):
    datos = {"subject": "Asunto", "message": "Mensaje", campo: "    "}

    with pytest.raises(ValidationError, match=mensaje):
        SupportCreate(**datos)


@pytest.mark.parametrize(("campo", "limite"), [("subject", 150), ("message", 3000)])
def test_should_accept_exactly_the_limit_and_reject_one_more(campo, limite):
    # Valores límite: el último que entra y el primero que no
    base = {"subject": "Asunto", "message": "Mensaje"}

    assert len(getattr(SupportCreate(**{**base, campo: "a" * limite}), campo)) == limite
    with pytest.raises(ValidationError, match=f"{limite} caracteres"):
        SupportCreate(**{**base, campo: "a" * (limite + 1)})


@pytest.mark.parametrize("estado", ["pending", "in_progress", "closed"])
def test_should_accept_the_ticket_states_that_need_no_solution(estado):
    assert SupportStatusUpdate(status=estado).status == estado


def test_should_resolve_a_ticket_only_with_a_solution():
    resuelto = SupportStatusUpdate(status="resolved", solution="  Se subió el video  ")

    assert resuelto.solution == "Se subió el video"
    with pytest.raises(ValidationError, match="debe escribir la solución"):
        SupportStatusUpdate(status="resolved", solution="   ")


@pytest.mark.parametrize("estado", ["abierto", "RESOLVED", ""])
def test_should_reject_an_unknown_state(estado):
    with pytest.raises(ValidationError):
        SupportStatusUpdate(status=estado)
