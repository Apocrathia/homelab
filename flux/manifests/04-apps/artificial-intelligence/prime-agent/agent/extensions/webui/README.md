# prime-agent webui

Web dashboard mirroring the prime-agent TUI: session list, live feeds,
steering, resume, settings. The operator drives agents from it — on the
cluster it is the only door besides `kubectl exec`. Zero build, zero
dependencies: one collector process, a per-session beacon, a single
inline-JS page (`/static` serves only the vendored `marked`/`purify`).
PI-congruent by design: dark canvas, hairlines, lime for live, system
mono, square corners, no animations, no vendored fonts.

## Run

```sh
node server.mjs
```

- **8788** — dashboard, API, SSE, `/send`/`/abort` proxy. Browsers,
  token-gated.
- **8789** — beacon register/heartbeat/event/unregister. Loopback +
  token only; never expose it (the Service and NetworkPolicy don't).

## Configuration

`config.json` is the live local config: gitignored, credentials inside.
Start from `config.example.json` (token-free) and paste real values into
`config.json`, never into the example. This payload's copy is the
token-free GitOps shape — never put a token in it
([below](#local-vs-cluster-credentials)).

| field          | default                           | purpose |
| -------------- | --------------------------------- | ------- |
| `host`         | `"127.0.0.1"`                     | Collector bind host. The GitOps copy ships `"0.0.0.0"` (behind the NetworkPolicy). |
| `port`         | `8788`                            | Dashboard/API/SSE port. The internal beacon port is `port+1` (8789) — no separate key. |
| `defaultCwd`   | `~`                               | Working directory for spawned sessions (absolute path or `~`; relative paths are rejected). The GitOps copy ships `/opt/data/workspace`. |
| `trustedCidrs` | `["127.0.0.0/8"]`                 | Token-bypass list checked before the token. `[]` is strictest (token for everyone), an absent key trusts loopback only — loopback is the default trust domain, same machine = same trust. Never pin a CIDR behind a proxy — the peer IP is the proxy, so a pin is dead config or fail-open. The cluster ships `[]`. |
| `sessionsDir`  | `~/.prime/agent/sessions`         | Session tree root (also a file-viewer root). |
| `artifactsDir` | `~/.prime/agent/session-artifacts` | RLM subagent artifacts root (also a file-viewer root). |
| `token`        | absent                            | Auth token — tier 3 of the resolution chain below. Locally it can hold the token; the GitOps copy never carries one. |

The token itself is the auto-generated 0600 beacon↔server credential
(`webui-token`). Resolution, identical on collector and beacon:

1. `PRIME_WEBUI_TOKEN` env
2. token file — `PRIME_WEBUI_TOKEN_FILE`, default `webui-token` here
3. `config.json` `token`
4. auto-generate + persist `webui-token` (0600)

The token-file default lives in this directory so a k8s Secret mount
(`webui-token`) or a hand-placed file works with zero config; fresh
installs need no token in `config.json`. The token is never logged
(only the resolution source is).

### Env overrides

Env outranks `config.json` — the cluster shape. `PRIME_WEBUI_HOST`,
`PRIME_WEBUI_PORT`, `PRIME_WEBUI_INTERNAL_PORT`,
`PRIME_WEBUI_SESSIONS_DIR`, `PRIME_WEBUI_ARTIFACTS`,
`PRIME_WEBUI_TOKEN`, `PRIME_WEBUI_TOKEN_FILE`. Config-only fields (no
env override): `defaultCwd`, `trustedCidrs`. Env-only tunables:
`PRIME_WEBUI_PRUNE_SECS` (stale-beacon prune), `PRIME_WEBUI_STALE_HOURS`
(ledger-row staleness threshold), `PRIME_WEBUI_IDLE_REAP_MS` /
`PRIME_WEBUI_REAP_SWEEP_MS` (idle spawned-agent reap),
`PRIME_WEBUI_FILE_REPO_ROOT` (file-viewer repo root),
`PRIME_WEBUI_RL_MAX` / `PRIME_WEBUI_RL_WINDOW_SECS` (auth-failure
limiter), `PRIME_WEBUI_MODELS` (context-window cache source).

## Local vs cluster credentials

- **Local (this Mac):** the installed extension's `config.json` holds
  the real token; it is gitignored. `config.example.json` documents the
  shape and stays token-free.
- **Cluster:** the boot script reconciles this directory from the
  ConfigMap on every boot, copies the 1Password-synced secret (the
  `prime-agent-secrets` item's `webui-token` field) to the token-file
  path (`0400`, FATAL on empty — otherwise collector and beacons mint
  different tokens), and starts the collector. The token is
  deliberately not env-shaped in-cluster, so `PRIME_WEBUI_TOKEN` and
  the config key stay unset; the env pins that are set
  (`PRIME_WEBUI_HOST`, `PRIME_WEBUI_PORT`, `PRIME_WEBUI_SESSIONS_DIR`,
  `PRIME_WEBUI_FILE_REPO_ROOT`) outrank the config file — same
  precedent as the a2a `A2A_WEBHOOK_TOKEN` mount. The GitOps
  `config.json` copy stays token-free. Cluster semantics (doors,
  replica pinning, secrets): see
  [`../../../README.md`](../../../README.md).

## Architecture

- **Collector** (`server.mjs`, plain ESM node process): statics + API +
  SSE; owns the beacon registry (15s heartbeats, 30s stale-prune) and the
  spawned-agent farm (`POST /api/new`, `POST /api/resume`,
  `spawned-agents.log`). The page's CSS/JS are read from
  `dashboard.css`/`dashboard.js` **at module load** — restart the
  collector after editing them.
- **Beacon** (`index.ts`, auto-loads in every agent session): binds an
  ephemeral loopback control port, registers with the collector on 8789,
  forwards live events (items, deltas, tool, busy, queue), serves
  `/snapshot` `/send` `/abort` `/healthz` plus the settings endpoints
  (`/models`, `/set-model`, `/set-thinking-level`, `/rename`,
  `/compact`, `/shutdown`, `/context-usage`). Respawns the collector if
  it is down.
- **Dashboard**: one page, hash router (`#/` list, `#/s/<id>` session),
  SSE per live session.
- **Data model**: disk is truth. Sessions are tree-branched JSONL under
  `~/.prime/agent/sessions/` (active branch = walk from the last entry);
  RLM children under `session-artifacts/<parent>/sub-*/` build the
  hierarchy. Live state is an SSE overlay on the disk rows; an
  mtime-keyed cache enriches both (name, model, recap, usage and
  cost totals).

## Security

- Auth is a shared header token (`x-prime-token`); the query param
  survives only on `/events` — `EventSource` cannot send headers.
  Gateway/proxy logs may see that one; rotate on suspicion.
- Constant-time compare (`timingSafeEqual`, length-checked) and a
  per-IP auth-failure limiter: 30 failures / 60s → `429` +
  `Retry-After`, checked **before** the compare so a throttled peer
  gets no oracle. Env-tunable (`PRIME_WEBUI_RL_MAX`,
  `PRIME_WEBUI_RL_WINDOW_SECS`); trusted peers skip it.
- Exactly three pre-auth routes, each because the client cannot set
  headers: `/healthz` (kubelet probe), `/mark.svg` (favicon), `/static/*`
  (vendored scripts — allow-listed names, traversal-proof, resolved
  under this directory).
- Fail-closed on an empty token: no token, no service.
- `/api/file` (path-link viewer): realpath containment on both sides
  plus a basename deny-list (`config.json`, `*token*`, `auth*`,
  `settings*`, `*secret*`) — secret-bearing files never serve, even
  inside allowed roots.
- The token is root: it reads every transcript and spawns agents with an
  arbitrary cwd. Treat it like a private SSH key.

## Using it

- **Feed**: timestamps, `USER` labels, thinking + tool cards as
  collapsed `<details>` (a Collapsed/Details/Expanded cycler), refinement
  notices/outcomes in their own accented boxes, absolute and `~/` paths
  linkified to an in-page file viewer.
- **Sidebar**: search-as-you-type filter, live badges (working/idle),
  subs breakdown (running/idle/inactive), cost, age; model + context
  live in the row tooltip.
- **Resume**: dead root sessions offer Resume (row context menu or the
  pane) — the collector respawns the session as an rpc child and the row
  goes live. Webui-spawned conversations are collector-lifetime; the
  transcripts persist on disk regardless.
- **Settings** (hamburger, live rows): model, thinking level, rename,
  stop, manual compact, context usage. Deliberately sparse — only what
  the beacon can act on; the harness configures itself.
- **Context menu**: right-click rows and feed items (rename/stop/resume;
  Copy text on items); one menu at a time, Escape or outside-click
  closes.
- **Sysmeter**: CPU + memory bars in the header from a 2s-cached
  `/api/system` sample (macOS memory reads `vm_stat`, Linux
  `/proc/meminfo`).

## Runtime artifacts

`webui-token` (auto-generated 0600 beacon↔server token), `server.log`
(collector stderr — the beacon's respawn redirect), `spawned-agents.log`
(plus `.1` rotation at 10MB — spawned-agent stdout/stderr) — all
gitignored.

## Dev

- Source of truth: `.scratch/prime-webui/` — `STATE.md` is the project
  ledger; tests and `config.example.json` live there. This directory is
  the synced payload: hash-verified copies only, never hand-edit one
  side. `.prettierignore` exempts it so formatting never churns the
  sync.
- Tests (run from the scratch tree): `test_v3.py` end-to-end,
  `test_auth_v3.py` auth semantics, `test_dashboard.py`, `test_new.py`,
  `test_settings.py` — random ports via `PRIME_WEBUI_PORT`, shared
  token via `PRIME_WEBUI_TOKEN`.
- Local deploy: copy named files to `~/.prime/agent/extensions/webui/`
  and restart the collector by port (`kill $(lsof -t -i :8788)`, never
  pkill by name); beacons re-register within 15s.
- K8s payload (ConfigMap `prime-agent-config`, flat `webui_*` keys):
  `index.ts`, `server.mjs`, `dashboard.js`, `dashboard.css`, `mark.svg`,
  `config.json`, `marked.min.js`, `purify.min.js` — the boot script installs
  them under `extensions/webui/` (the vendored pair feeds `/static/*`).
  Adding a file = one `configMapGenerator` entry in
  [`../../../kustomization.yaml`](../../../kustomization.yaml).
