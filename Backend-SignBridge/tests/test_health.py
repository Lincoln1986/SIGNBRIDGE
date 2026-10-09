"""Endpoints públicos sin BD: raíz, healthcheck e info de la landing."""


def test_root(client):
    res = client.get("/")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["version"] == "1.0.0"


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}


def test_info(client):
    res = client.get("/info")
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "Sign Bridge"
    assert body["version"] == "1.0.0"
    assert len(body["features"]) > 0
