# Odysseus

[Odysseus](https://github.com/pewdiepie-archdaemon/odysseus) is a self-hosted AI workspace: chat, agents, memory, documents, and research — local-first with built-in auth.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

This deployment includes:

- **Odysseus UI** — `generic-app` on `python:3.12-slim` (upstream Dockerfile base), bootstrapped at pod start (git clone + pip + `setup.py`)
- **PostgreSQL** — CloudNative-PG via `postgres.enabled` (`odysseus-postgres-rw`); SQLAlchemy `DATABASE_URL` built at runtime
- **ChromaDB** — dedicated `odysseus-chromadb` release in this namespace for vector memory
- **SearXNG** — cluster instance at `searxng.searxng.svc.cluster.local:8080` (not bundled here)
- **Authentik proxy** in front of Odysseus local login

Cookbook GPU serving, bundled ntfy, and MCP browser tooling are not wired in this scaffold.

## Access

- **URL**: `https://odysseus.gateway.services.apocrathia.com`
- **Internal**: `http://odysseus.odysseus.svc.cluster.local:80`

## Authentication

Authentik **proxy** provider sits in front. Odysseus keeps its own user accounts (`AUTH_ENABLED=true`); you still log into the app after passing Authentik. There is no native OIDC in upstream — proxy mode only.

First-boot admin user is `admin` (upstream default). Password comes from 1Password field `admin-password` via `ODYSSEUS_ADMIN_PASSWORD` in the init container. `setup.py` only creates the user when `/data/auth.json` is missing — it does not rotate an existing password on pod restart.

## Configuration

Most setup is in the **Settings** UI after login. Manifest env vars cover cluster wiring only:

| Variable                          | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `SEARXNG_INSTANCE`                | In-cluster SearXNG base URL                          |
| `CHROMADB_HOST` / `CHROMADB_PORT` | `odysseus-chromadb` service                          |
| `DB_USERNAME` / `DB_PASSWORD`     | CNPG credentials; app builds `DATABASE_URL` at start |
| `ALLOWED_ORIGINS`                 | Gateway hostname for CORS                            |

Point LLM providers at LiteLLM (`http://litellm.litellm.svc.cluster.local:4000`) from Settings — same as OpenWebUI/Hermes.

See `helmrelease.yaml` and `chromadb.yaml` for deployment values.

### Secrets

Create the 1Password item at `vaults/Secrets/items/odysseus-secrets`:

| Field            | Purpose                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `username`       | PostgreSQL owner (CNPG bootstrap); use `odysseus` unless you prefer otherwise |
| `password`       | PostgreSQL password (CNPG bootstrap)                                          |
| `admin-password` | Odysseus local admin (`admin`) on first `setup.py` only                       |

CNPG reads `username` / `password` for cluster bootstrap. The init container waits for `odysseus-postgres-rw` before `setup.py`.

To apply a new `admin-password` after the app has already created `auth.json`, delete `auth.json` on the PVC and restart the pod (or change the password in the Odysseus UI). Upstream `setup.py` still prints the password line to init logs on create — treat those logs as sensitive.

Some upstream features still use on-disk SQLite for ancillary caches (email scheduler, etc.); the main app schema is PostgreSQL.

## Storage layout

| Mount                | Volume       | Purpose                                              |
| -------------------- | ------------ | ---------------------------------------------------- |
| `/opt/odysseus`      | `emptyDir`   | App code + venv (rebuilt each pod); `data` → `/data` |
| `/data`              | Longhorn PVC | Uploads, auth.json, Cookbook caches (not the SQL DB) |
| `/opt/odysseus/logs` | `emptyDir`   | Application logs                                     |

## Bootstrap (init container)

Each pod restart reclones `pewdiepie-archdaemon/odysseus` (pinned ref in `helmrelease.yaml`), installs Python deps into `/opt/odysseus/venv`, and runs `setup.py`. Expect several minutes cold start; Flux and the startup probe allow for that.

```bash
kubectl logs -n odysseus deploy/odysseus -c install
```

## Troubleshooting

```bash
kubectl get pods -n odysseus
kubectl get cluster -n odysseus
kubectl logs -n odysseus deploy/odysseus -f
kubectl logs -n odysseus deploy/odysseus-chromadb -f

kubectl run -n odysseus --rm -it --image=curlimages/curl debug -- \
  curl -s http://odysseus.odysseus.svc.cluster.local/api/health

kubectl get pods -n authentik -l app.kubernetes.io/name=ak-outpost-odysseus
```

If memory/RAG fails, confirm Chroma is reachable:

```bash
kubectl run -n odysseus --rm -it --image=curlimages/curl debug -- \
  curl -s http://odysseus-chromadb.odysseus.svc.cluster.local:8000/api/v2/heartbeat
```

## References

- **[Odysseus repository](https://github.com/pewdiepie-archdaemon/odysseus)** — Source, Docker Compose reference, security notes
- **[Promptfoo deployment](../promptfoo/README.md)** — Stock-image bootstrap pattern used here
