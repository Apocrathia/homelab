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
  through a Docker-compatible API served by `strix-podman`: a raw
  unprivileged rootless podman Deployment next to the app release. The
  generic-app chart hardwires `seccompProfile: RuntimeDefault` (pod-level
  and per container), and containerd's default profile blocks the
  `clone(CLONE_NEWUSER)`/`unshare` calls the nested user namespace needs —
  hence the raw manifest (openaev shape, not its privilege)
- The sandbox image is deliberately not pinned in the manifests: the pinned
  `strix-agent` version carries its own compatible default (1.3.0 for
  1.7.0) and pulls it into the daemon on first scan
- No database: every run is a directory under `strix_runs/` (`run.json` +
  `events.jsonl` + transcripts) on the durable `data` volume
- Longhorn volumes for `runtime/` (venv, rebuildable) and `data/` (runs,
  kopia-backed); the podman store rides a third, unbacked claim
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

First scan pulls the ~4 GB sandbox image into the podman store (10-15 min);
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

## The rootless podman daemon

`podman.yaml` runs the official `quay.io/podman/stable` image as the
image's own `podman` user (uid 1000, whose `/etc/subuid` + `/etc/subgid`
ranges the nested user namespace maps), serving the Docker-compatible
API with `podman system service --time=0 tcp://0.0.0.0:2375`. The pod
stays unprivileged:

- `privileged: false`, no `runAsUser: 0`, capabilities dropped except
  `SETGID`/`SETUID` — the bounding set `newuidmap`/`newgidmap` need to
  apply their `cap_setuid`/`cap_setgid` file capabilities (verified in
  the image layers; `rpm --setcaps shadow-utils` restores them)
- `seccompProfile: Unconfined` — containerd's RuntimeDefault profile
  (read from its source) allows `clone` only with no `CLONE_NEW*` flags
  and gates `unshare`/`clone3` behind `CAP_SYS_ADMIN`, so the nested
  user namespace is blocked there. Unconfined restores the same
  unprivileged syscall surface any plain host user has; DAC and the
  empty capability set still apply
- read-only rootfs with tmpfs `/run` + `/tmp`; the podman store
  (graphroot under `/home/podman/.local/share/containers`) is the
  Longhorn-backed `strix-podman` claim
- `podman-config.yaml` (a ConfigMap over the image's user-level config)
  resets the image's host-namespace tuning to isolated sandbox
  namespaces and switches storage from fuse-overlayfs (`/dev/fuse` is
  not passable to unprivileged pods) to native `overlay` with
  `userxattr` — if the store errors on first boot, fall back to
  `driver = "vfs"` in that ConfigMap

Sandbox containers get `NET_ADMIN`/`NET_RAW` (nmap -sS and friends)
inside their own nested namespace and a generated testing CA for the
built-in Caido MITM proxy — upstream design for a pentest sandbox.

The strix client speaks to the service over plain TCP
(`DOCKER_HOST=tcp://strix-podman.strix.svc.cluster.local:2375`,
`DOCKER_TLS_*` unset). Known upstream limitation carried over from the
dind shape: strix resolves the sandbox's Caido proxy as
`127.0.0.1:<ephemeral published port>` — the SDK assumes the daemon
shares the client's network namespace, which a separate daemon pod
cannot. The scan itself is unaffected (CaidoBootstrapHandle degrades
the host-side proxy tools instead of failing the run); agent-side
proxying still works in-sandbox.

## Security notes

- The podman API port 2375 is plain HTTP with no auth; a
  CiliumNetworkPolicy restricts ingress to the strix app pod only (API
  access is root-equivalent inside the rootless namespace)
- Egress from this namespace is deliberately unrestricted — scanning
  arbitrary in-scope targets is the application's function
- **Authorized targets only.** Apache-2.0, but running offensive tooling
  against systems you do not own or have written permission to test is on
  you
- `data/` loss = all run history; the volume is in the kopia backup set
  (`runtime/` and the podman image store are not — they rebuild/re-pull)

## Troubleshooting

```bash
# App pod (init installs the venv on first boot, then serves the viewer)
kubectl get pods -n strix
kubectl logs -n strix deploy/strix -c fetch-strix
kubectl logs -n strix deploy/strix -c strix -f

# Rootless podman (sandbox containers run here)
kubectl get pods -n strix -l app=strix-podman
kubectl logs -n strix deploy/strix-podman -f

# End-to-end check: run a scratch container through the service
kubectl exec -n strix deploy/strix-podman -- env CONTAINER_HOST=tcp://127.0.0.1:2375 podman run --rm quay.io/podman/alpine:latest true

# Viewer session URL
kubectl logs -n strix deploy/strix -c strix | grep 'http://'

# Authentik outpost
kubectl get pods -n authentik | grep strix
```

If scans hang on large HTTP responses, check MTU: the cluster runs Cilium
native routing (pod MTU 1500) and rootless podman's pasta networking
inherits it, but a future switch to an overlay would need attention.

If the store fails to initialize (`overlay` mount errors in the podman
pod logs), edit `driver = "vfs"` in the `strix-podman-config` ConfigMap;
if the daemon cannot create user namespaces at all (seccomp regression),
revert this deployment to the dind shape from git history.
