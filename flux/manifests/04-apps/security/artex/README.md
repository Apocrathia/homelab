# ARTEX

Self-hosted, LLM-driven autonomous penetration testing: a planner/worker loop
runs real recon and attack tools and binds every finding to captured traffic
evidence.

> **Navigation**: [← Back to Security README](../README.md)

## Overview

- One Go binary with the Next.js UI embedded, backed by CloudNativePG
  (generic-app `postgres.enabled`)
- No image is built or pulled for the app — upstream publishes none (their
  Dockerfile is a local-build path, and third-party `artex` tags on Docker
  Hub are a namespace-hijack risk upstream explicitly warns about), so four
  init containers assemble the runtime onto a Longhorn volume (jetkvm
  pattern)
- Longhorn volumes for `runtime/` (assembled toolbox, rebuildable),
  `data/` (traffic index, task files, transcripts, executor home), and
  `keys/` (JWT signing key + AES-256-GCM secret key)
- Authentik proxy provider fronts the UI; ARTEX keeps its own local accounts
- The traffic-recording MITM proxy binds pod loopback only — agent tools use
  it in-pod, the browser extension ingests via the main app URL
  (`/api/traffic/ingest` with a bearer token), so no extra port is exposed

## In-pod runtime assembly

Upstream's `install.sh` is an interactive docker-compose/local-build
installer and their Dockerfile's toolbox is `RUN` fragments (with a broken
katana asset name, since their image-publish job is CI-gated off), so there
is no upstream script worth reusing. Instead each init installs its slice
onto the persistent `/rt` volume with the ecosystem's own installer, which
also owns integrity verification:

| Init           | Image               | Installs                                                                                                                                       |
| -------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetch-artex`  | python:3.14-slim    | ARTEX release binary + skills, sha256-verified against the release `SHA256SUMS`                                                                |
| `go-tools`     | golang:1.26-trixie  | nuclei, httpx, subfinder, katana, ffuf, dalfox via `go install` (Go module proxy sums)                                                         |
| `node-tools`   | node:22-trixie-slim | Playwright MCP + CLI + both Chromium revisions via `npm`, plus the `node` binary for the main container                                        |
| `system-tools` | python:3.14-slim    | bbot + sqlmap via `pip` into a venv; nmap/dig/nc/rg/jq/vim + Chromium runtime libs via `apt-get download` + `dpkg-deb -x` into a volume prefix |

Each init writes a stamp file under `/rt/.stamps/` and skips when it
matches, so a version bump rebuilds only its own slice; `data/` and `keys/`
are never touched. First boot downloads a few GiB and takes 10-20 minutes
(`PodInitializing`); later boots skip. The main container runs the release
binary directly (k8s owns crash restarts) with `PATH`, `LD_LIBRARY_PATH`,
and `PLAYWRIGHT_BROWSERS_PATH` pointed at `/rt`.

### Version pins and Renovate

Every pin carries a `# renovate:` comment directly above its assignment,
matching the repo's regex-manager contract. Tracked: the ARTEX release
(github-releases), the six Go tools (go), bbot + sqlmap (pypi), the three
Playwright packages (npm), all five images incl. the CNPG PostgreSQL image
(docker, tag + digest), and the generic-app chart. A merged Renovate MR
changes the pin, which changes that init's stamp, which rebuilds the slice
on the next pod start.

The whole stack runs on Debian trixie (upstream's image is bookworm):
newer glibc, and python 3.14 is the newest release bbot 3.0.2 supports
(`Requires-Python <3.15`); a `renovate.json` packageRule caps the python
image at `<=3.14` for this file so Renovate cannot drift it past that
ceiling — lift the cap when a bbot bump raises it.

Hand-maintained bits (no upstream source of truth): the Debian tool +
Chromium library list in `system-tools`, and bbot's module dependencies,
which self-install on first use (upstream preinstalls them for offline
images; cluster egress is open).

## Access

- **URL**: `https://artex.gateway.services.apocrathia.com` (Authentik proxy)

## Secrets

1Password item `vaults/Secrets/items/artex-secrets` (see `helmrelease.yaml`)
with three fields that must stay in sync:

- `username` / `password` — bootstrap the CNPG cluster (database owner)
- `dsn` — full `ARTEX_PG_DSN`:
  `postgres://artex:<password>@artex-postgres-rw.artex.svc.cluster.local:5432/artex?sslmode=disable`

## Configuration

- **Web UI only**: LLM providers (System → LLM; Anthropic, OpenAI-compatible
  gateways, or Ollama), worker concurrency, noise/budget policies, users,
  notification settings — all runtime settings live in the database
- **Env**: only the DSN, key directory, trusted-proxy CIDR, and toolbox
  paths are set in the manifest; no LLM keys are baked in

## Initial setup

1. Wait for first-boot assembly (`kubectl get pods -n artex -w`; the init
   containers run before the app starts)
2. Get the one-time setup token:
   `kubectl logs -n artex deployment/artex | grep "Setup token"`
3. Open the URL, complete `/setup` with the token, set the admin password
4. System → LLM: add a provider profile (the in-cluster LiteLLM endpoint
   works as an OpenAI-format gateway)
5. System → Settings: raise concurrent workers (default 3) if desired

## Security notes

- The pod runs as root with `CHOWN/SETUID/SETGID` only: the server chowns an
  executor home under `data/` and drops every agent subprocess (Bash, tools,
  MCP stdio) to unprivileged uid 10001; no setuid binaries are introduced,
  and `allowPrivilegeEscalation: false` matches upstream compose's
  `no-new-privileges`
- Integrity: the ARTEX release is sha256-verified, Go/npm/pip/apt installs
  are verified by their own registries
- Egress from this namespace is deliberately unrestricted — scanning
  arbitrary in-scope targets is the application's function
- **Authorized targets only.** The upstream license permits use against
  systems you own or have written permission to test
- `keys/` loss = all sessions and sealed secrets unrecoverable; the volume is
  in the kopia backup set alongside `data/` (runtime is not — it rebuilds)

## Troubleshooting

```bash
# Pod status (first boot: long PodInitializing while tools install)
kubectl get pods -n artex

# Assembler output, per slice
kubectl logs -n artex deployment/artex -c fetch-artex
kubectl logs -n artex deployment/artex -c go-tools
kubectl logs -n artex deployment/artex -c node-tools
kubectl logs -n artex deployment/artex -c system-tools

# Application logs (setup token, config snapshot, worker activity)
kubectl logs -n artex deployment/artex -c artex -f

# Health endpoint
kubectl exec -n artex deploy/artex -c artex -- curl -s localhost:8787/api/health

# Authentik outpost
kubectl get pods -n authentik | grep artex
```

If the UI loads but live activity never updates, suspect SSE buffering on
the proxy path; the upstream reverse-proxy guide requires unbuffered
streaming with long read timeouts.

## References

- [Upstream repository](https://github.com/BaaRai/ARTEX) (English
  continuation of Autumn-27/ARTEX, AGPL-3.0) — source, README,
  `docs/OPS.md` (operations), SECURITY.md
- [CHANGELOG](https://github.com/BaaRai/ARTEX/blob/main/CHANGELOG.md) —
  release notes
