# Prime Agent

[Prime Intellect](https://primeintellect.ai/) coding agent CLI (RLM-native,
IPython-backed tools) running as a persistent in-cluster agent box. Model
traffic goes through cluster LiteLLM.

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

This deployment includes:

- Stock `node` image + bootstrap (`generic-app`); no upstream OCI image exists,
  so the pinned npm tarball installs into the Longhorn-backed `HOME` on boot
- Pinned `uv` for the Python kernel installs to `~/.local/bin` on boot (the
  slim node image has no curl/wget, so node's own `fetch` pulls the GitHub
  release); `PRIME_AGENT_INSTALL_UV=1` arms prime-agent's uv fallback
- Longhorn-backed state at `/opt/data` (agent config, sessions, kernels, npm
  prefix, uv)
- Agent toolbox on the PVC, installed/healed at boot: rootless `git` and
  `glab` (conda-forge via micromamba prefixes), static `fd` + `curl`, with
  `SSL_CERT_FILE` pinned to the boot-materialized CA bundle (no system CA
  store in the slim image) and `GITLAB_HOST` preset for `glab`
- `agent/` payload (extensions, seeded settings) copied at pod start from
  the working-repo clone on the state PVC
  (`/opt/data/repos/homelab`) and reconciled onto `~/.prime/agent/`
  (the ConfigMap era ended at the API server's 1 MiB limit; the per-path
  archive pull that replaced it died on GitLab's anonymous per-IP rate
  limit); unchanged files are not rewritten (`cp -u`)
- The agent's working repo: a token-authenticated full clone of this
  repository at `/opt/data/repos/homelab`, fast-forward pulled on
  every pod start (never `reset --hard` — agents work in this clone and
  their local state survives boots); git installs rootless via conda-forge
  (`node:24-bookworm-slim` ships no git and the pod runs as uid 1000, so
  apt is not an option)
- PVC layout (operator, 2026-09-14): `/opt/data/repos/` carries the
  associated repos (homelab clone, prime-agent source snapshot);
  `/opt/data/workspace` is the agents' default cwd — scratch space,
  never a clone target. Session cwd is harness-owned (container
  workingDir never reaches spawned sessions), so the default is pinned
  at each spawn surface: webui `defaultCwd` (config.json),
  `DISCORD_DEFAULT_CWD` (discord extension), and `--cwd` on TUI attach
- `agent/extensions/litellm/index.ts` registers the in-cluster LiteLLM gateway as
  the model provider and discovers the catalog from it; auth via
  `LITELLM_API_KEY` (or `/login` interactively)
- `agent/extensions/a2a/index.ts` registers native `a2a_agents` /
  `a2a_send` / `a2a_task` tools for the kagent agents brokered by LiteLLM;
  configured via `A2A_BASE_URL` + `A2A_API_KEY` (same virtual key). Slow agent
  runs return early with a `task_id` to poll — the harness aborts tool calls
  at ~240s
- `agent/extensions/a2a/server.mjs` is the inbound side of the same wire: a
  standalone A2A server (message/send + tasks/get) on the declared port 8080,
  ClusterIP-only, so kagent agents can call prime-agent back through the
  broker (see [Inbound A2A](#inbound-a2a))
- `agent/extensions/name-sessions/index.ts` names every session (operator rule):
  registers the `name_session` tool and appends a naming directive to every
  turn while the session is unnamed (26-character limit, picker column truncates)
- `agent/settings.json` seeded once (delete from the PVC to re-seed); runtime
  keys accumulate afterwards
- `agent/extensions/webui/` payload (dashboard + collector + beacon): the
  collector starts from the boot script and serves the dashboard on 8788;
  the `index.ts` beacon auto-loads inside every agent process (TUI and
  spawned) and registers it with the collector
- `networkpolicy.yaml`: Cilium ingress — 8788 from gateway Envoy, the
  tailscale operator, and the node only; 8080 (inbound A2A webhook) from the
  LiteLLM broker only — plus egress allowlist (DNS, LiteLLM, HTTPS 443 for
  the boot installs)

## Access

Two doors:

- **Webui**: `https://prime.gateway.services.apocrathia.com` over the LAN
  (main-gateway) or the tailnet (tailnet-gateway). Append `?token=<webui
token>` — the token from the 1Password `webui-token` field — and the browser
  stores it for the session. The SSE stream keeps it in the URL (EventSource
  cannot send headers); rotate the token on suspicion.
- **TUI**: `kubectl exec -it deploy/prime-agent -n prime-agent -- prime-agent --cwd /opt/data/workspace`

The daemon supervisor and session workers spawn in-pod on first attach and
keep running after you detach (close the TUI; the worker persists). Reconnect
with the same command; `prime-agent list` shows active agents.

### Webui semantics

- **The token is root.** It reads every session transcript and steers/spawns
  agents with an arbitrary cwd (`POST /api/new` accepts any absolute path).
  Treat it like a private SSH key: never in git, never in the shared tier.
- **Never enable the Authentik shared/friends tier on this app** — a single
  token with no per-session authz would expose every transcript to every
  shared-tier user.
- **Webui-spawned conversations are collector-lifetime.** Pod restarts (deploy,
  node drain, crash) kill them; the transcripts persist on the PVC and reappear
  as non-live sessions in the sidebar. TUI-side sessions survive collector
  restarts — their beacons re-register within ~15s.
- **New sessions default to `/opt/data/workspace`** — pinned at each
  harness spawn surface: the webui `config.json` `defaultCwd` (spawned
  conversations) and `DISCORD_DEFAULT_CWD` (discord conversations). TUI
  attach passes `--cwd` (the exec process cwd is `/`; the harness ignores
  it). Drop working code there; agents can still be handed any absolute
  cwd per request.
- Single replica, pinned (`replicas: 1`): the beacon registry is in-memory
  per collector and the state PVC is Longhorn RWO. A second replica would
  double-mount the PVC and split the registry.

## Inbound A2A

`a2a/server.mjs` is a standalone inbound A2A server (JSON-RPC 2.0 over HTTP,
A2A 1.0 shapes: `message/send` + `tasks/get`, no streaming). It owns port
8080, carried by the Service as an extra port next to the webui primary
(8788) — ClusterIP-only with **no Gateway route**, so only in-cluster callers
(the LiteLLM broker) can reach it. The boot script starts it under `nohup`
(logs at
`/opt/data/.prime/agent/logs/a2a-webhook.log`), and the `a2a` extension's
`session_start` handler respawns it if the health probe fails. The dispatch
accepts both the v0.3 JSON-RPC names and the a2a-sdk 1.x PascalCase names
(`SendMessage`/`GetTask`) that the broker's litellm client uses. Text parts
are accepted in either wire dialect — kind-tagged, type-tagged, or the
SDK's flat proto-JSON `{"text": ...}` shape — and PascalCase calls are
answered in that same strict proto JSON (flat parts, `TASK_STATE_*`
states, send result wrapped as `{"task": ...}` because the SDK's
`ParseDict` rejects unknown keys); lowercase calls keep the A2A 1.0 JSON
task shape.

Every `message/send` spawns a stateless one-shot `prime-agent -p "<prompt>"`
run: a fresh session each time, so `contextId` groups tasks in the store but
does **not** resume a conversation — send full context in each message. Runs
past 120s keep running and are polled via `tasks/get`; at most 2 runs
concurrently (excess queue FIFO).

Bearer auth, fail-closed (server rejects every POST without the token):

- Server side: `prime-agent-secrets` / `a2a-webhook-token` → env
  `A2A_WEBHOOK_TOKEN` on this pod
- Broker side: `litellm-secrets` / `prime-a2a-authorization` → env
  `PRIME_A2A_AUTHORIZATION` on the LiteLLM pod — the same token with the
  `Bearer ` prefix in front
- Broker registration: the `agents:` entry `prime-agent` in
  [`litellm.yml`](../litellm/litellm.yml) points at
  `http://prime-agent.prime-agent.svc.cluster.local:8080` and sends that
  `Authorization` header — kagent agents reach this box via
  `a2a_send`/`a2a_task` like any other brokered agent

## Configuration

- **Upgrade**: Renovate tracks `PRIME_AGENT_VERSION` in `helmrelease.yaml`
  (upstream git tags, semver); the new tarball installs on pod restart
- **Models**: `/model` inside the TUI. Default is seeded in
  `agent/settings.json`; the extension re-reads the gateway catalog on start
  (`/litellm-refresh` to re-poll)
- **Inject more agent files**: one folder per extension under
  `agent/extensions/` — `index.ts` (+ resources, README). Commit it to
  `main`; the next pod restart pulls the clone (`git pull --ff-only`)
  and the boot script copies it into `~/.prime/agent/extensions/<extension>/`.
  No manifest MR, no `configMapGenerator` entry — the payload CM era ended
  at the API server's 1 MiB limit. READMEs stay repo/local-only — the
  boot copies just the payload files it knows
- **Skills/MCP servers**: not shipped in git — install into the PVC at runtime
  (`~/.prime/agent/`) per upstream docs

### Secrets

Create the 1Password item at `vaults/Secrets/items/prime-agent-secrets`:

- `litellm-api-key` — LiteLLM virtual key for the custom provider endpoint
- `a2a-webhook-token` — bearer token for the inbound A2A webhook (same token
  as `litellm-secrets`/`prime-a2a-authorization`, which adds the `Bearer `
  prefix)
- `webui-token` — dashboard token (mint once, 32+ random chars). Never
  commit it anywhere; the boot script copies it from the synced secret to
  `~/.prime/agent/extensions/webui/webui-token` (mode 0400) and the pod
  fails to boot on an empty field. Rotation is one field edit + one pod
  restart.
- `gitlab-token` — GitLab PAT for the workspace clone/pull (and so the
  payload source: the boot copies `agent/` from that checkout). Optional
  in manifest semantics — the repo is public and an unset token still
  clones/pulls — but practically required: GitLab rate-limits anonymous
  traffic per IP, the whole homelab shares one egress IP, and the
  token's authenticated budget is the reliable lane.

## Initial setup

1. Mint a LiteLLM virtual key for prime-agent
2. Mint a bearer token for the inbound A2A webhook; put it in the 1Password
   item above as `a2a-webhook-token` and in `litellm-secrets` as
   `prime-a2a-authorization` (value `Bearer <token>`)
3. Mint a webui token (32+ chars) and add it as `webui-token` in the
   1Password item above
4. Wait for the secrets to sync; reconcile Flux (or apply locally)
5. `kubectl exec -it deploy/prime-agent -n prime-agent -- prime-agent --cwd /opt/data/workspace`
   and confirm the default model with `/model`
6. Open `https://prime.gateway.services.apocrathia.com?token=<webui token>`
   and confirm the collector banner in the logs (`prime-webui collector
started (8788)`)

## Troubleshooting

```bash
kubectl logs -n prime-agent deploy/prime-agent        # bootstrap output
kubectl exec -it deploy/prime-agent -n prime-agent -- bash
prime-agent status                                    # daemon/worker state (inside pod)
```

- Pod crashloops on bootstrap: check egress to the R2 release bucket and npm
- Extensions stale after a failed clone/pull (GitLab outage, or the
  anonymous rate limit — the whole homelab shares one egress IP): the
  boot clones the repo when missing and `git pull --ff-only` every start;
  any failure WARNs in `kubectl logs` and boots the last good copy from
  the PVC (check egress to gitlab.com and restart the pod to re-sync)
- Repo clone missing on the PVC: `/opt/data/repos/homelab` holds a
  full clone of this repository; if it exists with stray files and no
  `.git`, the boot skips the clone with a WARN — clean the dir once and
  restart
- `/model` shows only `login-required`: the `prime-agent-secrets` item is
  missing or the key lacks model access on the gateway
- Kernel bootstrap fails on first tool call: uv installs on boot (check egress
  to github.com), then downloads the Python runtime; `~/.prime/agent/logs/`
  has details
- Webui dead (401 everywhere): the `webui-token` field is missing/empty or
  was rotated — the boot log prints `FATAL: prime-agent-secrets/webui-token
is missing or empty` on boot failure. The collector stream is in
  `kubectl logs` (the boot script backgrounded it into the container log).
- @-picker says fd missing: the boot fd install failed (check egress to
  github.com); `/opt/data/bin/fd --version` should print the pinned version
- Dashboard slow first paint: `/api/sessions` walks the sessions + artifacts
  tree on the Longhorn PVC per refresh; a multi-second cold pass is expected
  today (TTL cache is a queued follow-up)
