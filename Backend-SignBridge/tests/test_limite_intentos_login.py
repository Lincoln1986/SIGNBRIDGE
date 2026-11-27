"""Límite de intentos de inicio de sesión (OWASP A04 / A07).

Primero la clase sola, con un reloj falso para no esperar 15 minutos de
verdad; después el endpoint /auth/login completo.
"""
from app.core.limite_intentos import LimiteIntentos
from app.routers.auth import limite_por_correo

CORREO = "nuevo@example.com"
BUENA = "Password1!"
MALA = "Equivocada1!"


class RelojFalso:
    def __init__(self):
        self.ahora = 1000.0

    def __call__(self):
        return self.ahora


# ── La clase LimiteIntentos ──────────────────────────────────────────────────

def test_bloquea_al_llegar_al_maximo():
    limite = LimiteIntentos(max_intentos=3, ventana_segundos=60, reloj=RelojFalso())
    for _ in range(2):
        limite.registrar_fallo("a")
    assert limite.segundos_bloqueado("a") == 0
    limite.registrar_fallo("a")
    assert limite.segundos_bloqueado("a") == 60


def test_se_desbloquea_cuando_pasa_la_ventana():
    reloj = RelojFalso()
    limite = LimiteIntentos(max_intentos=2, ventana_segundos=60, reloj=reloj)
    limite.registrar_fallo("a")
    limite.registrar_fallo("a")
    reloj.ahora += 59
    assert limite.segundos_bloqueado("a") == 1
    reloj.ahora += 1
    assert limite.segundos_bloqueado("a") == 0


def test_las_claves_no_se_mezclan():
    limite = LimiteIntentos(max_intentos=1, ventana_segundos=60, reloj=RelojFalso())
    limite.registrar_fallo("a")
    assert limite.segundos_bloqueado("a") > 0
    assert limite.segundos_bloqueado("b") == 0


def test_limpiar_borra_el_contador():
    limite = LimiteIntentos(max_intentos=1, ventana_segundos=60, reloj=RelojFalso())
    limite.registrar_fallo("a")
    limite.limpiar("a")
    assert limite.segundos_bloqueado("a") == 0


# ── El endpoint /auth/login ──────────────────────────────────────────────────

def _registrar(client):
    client.post("/auth/register", json={
        "first_name": "ana", "last_name": "torres", "phone": "3001234567",
        "city": "Bogotá", "address": "Calle 1 #2-3",
        "email": CORREO, "password": BUENA,
    })


def _login(client, password, email=CORREO):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_cinco_fallos_bloquean_el_correo_con_429(client, seed_data):
    _registrar(client)
    for _ in range(5):
        assert _login(client, MALA).status_code == 401
    res = _login(client, MALA)
    assert res.status_code == 429
    assert "Demasiados intentos" in res.json()["detail"]
    assert int(res.headers["Retry-After"]) > 0


def test_bloqueado_ni_la_contrasena_correcta_entra(client, seed_data):
    """Si entrara, el atacante sabría cuál contraseña acertó."""
    _registrar(client)
    for _ in range(5):
        _login(client, MALA)
    assert _login(client, BUENA).status_code == 429


def test_login_correcto_reinicia_el_contador(client, seed_data):
    _registrar(client)
    for _ in range(4):
        _login(client, MALA)
    assert _login(client, BUENA).status_code == 200
    for _ in range(4):
        assert _login(client, MALA).status_code == 401


def test_correo_inexistente_tambien_se_bloquea(client, seed_data):
    """Igual que uno registrado: el 429 no revela qué correos existen."""
    for _ in range(5):
        assert _login(client, MALA, email="nadie@example.com").status_code == 401
    assert _login(client, MALA, email="nadie@example.com").status_code == 429


def test_el_bloqueo_no_distingue_mayusculas(client, seed_data):
    _registrar(client)
    for _ in range(5):
        _login(client, MALA, email="NUEVO@Example.com")
    assert _login(client, BUENA).status_code == 429


def test_otra_cuenta_no_queda_bloqueada(client, seed_data):
    _registrar(client)
    for _ in range(5):
        _login(client, MALA, email="otro@example.com")
    assert _login(client, BUENA).status_code == 200


def test_ip_bloqueada_aunque_cambie_de_correo(client, seed_data):
    """Probar una contraseña contra muchas cuentas (password spraying)."""
    for i in range(20):
        _login(client, MALA, email=f"victima{i}@example.com")
    assert _login(client, MALA, email="victima99@example.com").status_code == 429


def test_cuando_pasa_el_bloqueo_vuelve_a_entrar(client, seed_data, monkeypatch):
    _registrar(client)
    reloj = RelojFalso()
    monkeypatch.setattr(limite_por_correo, "_reloj", reloj)
    for _ in range(5):
        _login(client, MALA)
    assert _login(client, BUENA).status_code == 429
    reloj.ahora += 15 * 60
    assert _login(client, BUENA).status_code == 200
