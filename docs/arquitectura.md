# Arquitectura — SignBridge

Ficha 3228973 B · Cómo se conectan las partes del sistema en la instalación con
Docker Compose y en el CI.

## 1. Contenedores y redes

```mermaid
flowchart LR
    U(["Navegador<br/>del usuario"])

    subgraph web["web_network"]
        F["frontend<br/>nginx sin root · puerto 8080<br/>sirve dist/ (pnpm build)"]
        B["backend<br/>FastAPI + uvicorn · puerto 8000<br/>Python 3.12 · usuario appuser"]
    end

    subgraph db["db_network (interna, sin internet)"]
        P[("postgres<br/>PostgreSQL 17")]
    end

    M["Mailtrap<br/>(SMTP)"]

    U -- "http://localhost:5173" --> F
    U -- "API REST · http://localhost:8000" --> B
    B -- "SQLAlchemy" --> P
    B -. "correos" .-> M
    B -. "al arrancar:<br/>alembic upgrade head" .-> P
```

| Servicio | Imagen | Puerto en el equipo | Espera a |
|---|---|---|---|
| `postgres` | `postgres:17` | 127.0.0.1:5432 | — |
| `backend` | `Backend-SignBridge/Dockerfile` | 8000 | `postgres` sano (`pg_isready`) |
| `frontend` | `Frontend-SignBridge/Dockerfile` | 5173 → 8080 | `backend` sano (`/health`) |
| `postgres-test` | `postgres:17` (perfil `test`) | 127.0.0.1:5433 | — (solo para pruebas de integración) |

La base de datos **no** está en `web_network`: el frontend no puede llegar a
ella, y `db_network` no tiene salida a internet.

## 2. Arranque

```mermaid
sequenceDiagram
    participant C as docker compose
    participant P as postgres
    participant B as backend
    participant F as frontend

    C->>P: iniciar
    P-->>C: sano (pg_isready)
    C->>B: iniciar
    B->>P: alembic upgrade head (crea o actualiza el esquema)
    B->>B: uvicorn en :8000
    B-->>C: sano (GET /health → 200)
    C->>F: iniciar nginx en :8080
```

## 3. Capas del backend

```mermaid
flowchart TB
    R["routers/<br/>endpoints por dominio"] --> S["schemas/<br/>validación con Pydantic"]
    R --> SV["services/<br/>traducción, MediaPipe, correo, notificaciones"]
    R --> MD["models/<br/>SQLAlchemy"]
    SV --> MD
    MD --> AL["alembic/versions/<br/>migraciones"]
    R --> SEC["core/security<br/>JWT + roles"]
```

## 4. Pipeline de CI

```mermaid
flowchart LR
    PR["Pull request<br/>a develop o main"] --> CI{{"tests.yml<br/>7 jobs en paralelo"}}
    CI --> J1["Frontend Tests"]
    CI --> J2["Backend Tests"]
    CI --> J3["Code Quality"]
    CI --> J4["Database Integration<br/>+ Newman"]
    CI --> J5["End-to-End Tests"]
    CI --> J6["Security Audit"]
    CI --> J7["Evidencia individual"]
    J1 & J2 & J3 & J4 & J5 & J6 & J7 --> OK{"¿todo verde<br/>+ 1 aprobación?"}
    OK -- sí --> MG["Merge"]
    OK -- no --> FX["Corregir en la<br/>misma rama"]
```
