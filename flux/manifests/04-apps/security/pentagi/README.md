# PentAGI

PentAGI is an open-source (MIT) autonomous AI penetration-testing platform:
multi-agent pentester, coder, installer, and assistant roles that plan,
execute, and verify real attack workflows inside docker sandboxes, with
search, scraper, and knowledge-base tooling wired in.

> **Navigation**: [← Back to Security README](../README.md)

## Overview

- One generic-app workload running the official upstream image
  (`vxcontrol/pentagi`, digest-pinned) — no in-pod assembly needed
- Agent sandboxes run on a dedicated privileged docker-in-docker daemon
  (`dind.yaml`), reached over TCP; the app Fatals without a reachable
  daemon. A CiliumNetworkPolicy pins the unauthenticated 2375 port to the
  app pod and kubelet probes
- CloudNativePG PostgreSQL 17 (`postgres.yaml`, standalone cluster because
  pgvector must be created by a superuser via `postInitApplicationSQL`;
  the CNPG system image ships the extension files) with nightly barman
  backups to the NAS rustfs bucket
- Longhorn volume for `data/` (flow data, files, knowledge uploads); kopia
  snapshots nightly. The dind image cache (30Gi PVC) is deliberately not
  backed up — it re-pulls
- Authentik proxy provider fronts the UI (the open-source version has only
  Google/GitHub OAuth, no generic OIDC, so proxy mode is the fit); the app
  keeps its own local accounts
- The update phone-home to update.pentagi.com is disabled
  (`UPDATE_CHECK_INTERVAL=0`)

## Access

- **URL**: `https://pentagi.gateway.services.apocrathia.com` (Authentik
  proxy)
- First login: `admin@pentagi.com` / `admin` (upstream-seeded local admin,
  forced password change) — change it immediately

## Secrets

1Password item `vaults/Secrets/items/pentagi-secrets`:

- `username` / `password` — bootstrap the CNPG cluster (database owner)
- `dsn` — full `DATABASE_URL`:
  `postgres://pentagi:<password>@pentagi-postgres-rw.pentagi.svc.cluster.local:5432/pentagi?sslmode=disable`
- `cookie-signing-salt` (optional but recommended) — cookie signing;
  without it API-token minting is disabled
- `openai-key` / `anthropic-api-key` / `gemini-api-key` (optional) — LLM
  provider keys; the app boots with zero providers and flows fail until
  one is set (these are env-only in PentAGI)

The pod stays pending until the item exists (the DSN key is required).

## Configuration

- **Web UI**: prompts, provider profiles (per-agent model/runtime),
  API tokens, user preferences
- **Env**: DSN, cookie salt, provider keys, docker endpoint, public URL,
  trusted proxies — everything else is upstream default

## Limitations / notes

- Published sandbox ports (`DOCKER_PORTS_BASE` 28000+) bind inside the
  dind pod, not through the gateway; compose-style browser access to
  agent-spawned services needs a follow-up (NodePort or `DOCKER_NETWORK`
  tuning)
- The optional scraper service (`vxcontrol/scraper`) is not deployed; the
  browser tool self-disables without `SCRAPER_*` URLs
- Graphiti/Neo4j knowledge graph and Langfuse/OTel observability stacks
  are not deployed (all optional, off by default)
- **Authorized targets only** — the EULA limits use to systems you own or
  have written permission to test

## Troubleshooting

```bash
# App + sandbox daemon + database
kubectl get pods -n pentagi

# App logs (migrations run at startup; provider warnings are expected
# until keys are set)
kubectl logs -n pentagi deployment/pentagi -f

# Sandbox daemon (first flow pulls the kali image, minutes on first run)
kubectl logs -n pentagi deployment/pentagi-dind -f

# Health endpoint
kubectl exec -n pentagi deploy/pentagi -- wget -qO- http://localhost:8443/api/v1/info

# Database
kubectl get cluster -n pentagi pentagi-postgres
```

## References

- [Upstream repository](https://github.com/vxcontrol/pentagi) — README
  (install/config), `backend/docs/config.md` (every env var)
- [Docker Hub](https://hub.docker.com/r/vxcontrol/pentagi) — official image
