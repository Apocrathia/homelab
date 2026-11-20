# Strix

Self-hosted autonomous AI pentesting: LLM-driven agents run a full recon and
attack toolkit inside a Kali-based sandbox, validate findings with working
proofs-of-concept, and write reports to disk.

> **Navigation**: [← Back to Security README](../README.md)

## Overview

- The OSS distribution is a pip package (`strix-agent`), not an image: an
  init container installs the CLI into a Longhorn-backed venv (artex
  runtime-assembly pattern) and the main container runs a small wrapper that
  serves the built-in web viewer of the latest run
- Scans run inside sandbox containers
  (`ghcr.io/usestrix/strix-sandbox`, upstream's official image) spawned
  through a Docker daemon: `strix-dockerd`, a raw privileged Deployment
  (docker.io `dind`) next to the app release, since the generic-app chart
  cannot render privileged containers (openaev raw-manifest pattern)
- The sandbox image is deliberately not pinned in the manifests: the pinned
  `strix-agent` version carries its own compatible default (1.3.0 for
  1.7.0) and pulls it into the daemon on first scan
- No database: every run is a directory under `strix_runs/` (`run.json` +
  `events.jsonl` + transcripts) on the durable `data` volume
- Longhorn volumes for `runtime/` (venv, rebuildable) and `data/` (runs,
  kopia-backed); the daemon's image cache rides a third, unbacked claim
- Authentik proxy fronts the viewer (the OSS version has no OIDC/SSO —
  local token auth only); telemetry (PostHog/Scarf/OTEL) is off via
  `STRIX_TELEMETRY=0`, and the viewer's email-verification relay to
  app.strix.ai is never used

## Running scans

Scans are CLI-first: exec into the app pod and point strix at a target
(`cd /data` is unnecessary — the wrapper symlinks `/strix_runs` to the
durable volume, and `HOME` is already `/data`):

```bash
kubectl exec -n strix deploy/strix -c strix -- strix --target https://example.com
```

First scan pulls the ~4 GB sandbox image into `strix-dockerd` (10-15 min);
later scans start immediately. Results land under `/data/strix_runs/`.

The web viewer follows the newest run automatically; it restarts (with a
new session token) whenever a newer run appears:

```bash
kubectl logs -n strix deploy/strix -c strix | grep 'http://'
```

Open the printed tokened URL through the Authentik-fronted host. Steering a
live scan needs the in-process TUI (interactive exec session), not the
standalone viewer — the web dashboard is read-only.

## Secrets

1Password item `vaults/Secrets/items/strix-secrets` (see `helmrelease.yaml`)
with two fields:

- `llm` — `STRIX_LLM` model string (e.g. `openrouter/z-ai/glm-5.3`;
  any LiteLLM-supported provider id)
- `llm-api-key` — `LLM_API_KEY`, the provider key

The pod stays pending until the item exists. An interactive
`strix config` inside the pod would write `~/.strix/cli-config.json`
(plaintext on the data volume) — prefer the env vars.

## Security notes

- The dockerd Deployment is privileged and its 2375 port is plain HTTP;
  a CiliumNetworkPolicy restricts ingress to the strix app pod only
  (docker-API access is root-equivalent on that pod)
- Sandbox containers get `NET_ADMIN`/`NET_RAW` (nmap -sS and friends) and a
  generated testing CA for the built-in Caido MITM proxy — upstream design
  for a pentest sandbox
- Egress from this namespace is deliberately unrestricted — scanning
  arbitrary in-scope targets is the application's function
- **Authorized targets only.** Apache-2.0, but running offensive tooling
  against systems you do not own or have written permission to test is on
  you
- `data/` loss = all run history; the volume is in the kopia backup set
  (`runtime/` and the docker image cache are not — they rebuild/re-pull)

## Troubleshooting

```bash
# App pod (init installs the venv on first boot, then serves the viewer)
kubectl get pods -n strix
kubectl logs -n strix deploy/strix -c fetch-strix
kubectl logs -n strix deploy/strix -c strix -f

# Docker daemon (sandbox containers run here; `docker ps` lists them)
kubectl get pods -n strix -l app=strix-dockerd
kubectl exec -n strix deploy/strix-dockerd -- docker ps

# Viewer session URL
kubectl logs -n strix deploy/strix -c strix | grep 'http://'

# Authentik outpost
kubectl get pods -n authentik | grep strix
```

If scans hang on large HTTP responses, check MTU: the cluster runs Cilium
native routing (pod MTU 1500) so the daemon needs no `--mtu` override, but
a future switch to an overlay would require one.
