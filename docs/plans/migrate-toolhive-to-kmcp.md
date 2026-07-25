---
title: "Migrate MCP hosting from ToolHive to kmcp"
status: active
found_at: 2026-07-24
updated_at: 2026-07-25
related_issue: docs/issues/migrate-toolhive-to-kmcp.md
area: agents
---

# Migrate MCP hosting from ToolHive to kmcp

## Goal

Move all in-cluster MCP workloads from ToolHive `MCPServer` CRs to kmcp, keep
LiteLLM and kagent clients working, preserve Cilium isolation, then remove (or
explicitly retain) ToolHive. Phased dual-run; each phase ends by refining this
plan so the next migration is cheaper.

## Scope

**In scope:**

- Remaining ToolHive MCP servers under
  `flux/manifests/04-apps/artificial-intelligence/mcp-servers/`
  (`osv` / `gofetch` / `mkp` removed — Decommission lap)
- Client URL rewrites: LiteLLM `mcp_servers`, kagent `RemoteMCPServer`s
- Cilium CCNP `mcp-server-isolation` (drop `toolhive-system` allow when safe)
- ToolHive HelmRelease / CRDs teardown or documented retain + delete issue
- `.agents/skills/mcp-deployment/SKILL.md` and kagent README → kmcp-first

**Out of scope:**

- External-only MCP (context7, deepwiki, homeassistant) unless kmcp becomes a
  single registry later
- Discord bridge rewrite (`docs/issues/discord-integration-upstream-a2a.md`) —
  coordinate only; Discord MCP still migrates here
- Cluster mutate without operator ask; agent never commits

## Decisions

- Scope trim (2026-07-25) — **`osv`, `gofetch`, `mkp` decommissioned** —
  zero agent usage. Coverage: searxng `web_url_read` + firecrawl replace
  gofetch; flux MCP covers mkp's k8s reads. Git manifests removed 2026-07-25;
  on-cluster namespace/CR delete is the remaining apply step.
- First migration (Phase 1) — **osv** — client cutover **done**; pattern
  proven: native `http` transport, LiteLLM-only. osv itself was then
  decommissioned (both CRs gone from Git).
- Cutover — **phased dual-run** — ToolHive and kmcp coexist until each server
  proves out; reverse by flipping LiteLLM / RemoteMCPServer URLs back.
- Target API — **`kagent.dev/v1alpha1` `MCPServer`** — kagent-bundled
  (`kmcp.enabled: true`), not standalone. Controller
  `kagent-kmcp-controller-manager` (kmcp 0.3.0). Use FQDN kinds:
  `mcpserver.kagent.dev` vs `mcpserver.toolhive.stacklok.dev`.
- Dual-run naming — kmcp CR/Service name **≠** ToolHive Deployment name —
  **hard rule, proven the hard way**: kmcp names its Deployment after the CR,
  and the apply fails with immutable-selector `DeploymentFailed` when ToolHive
  already owns a Deployment of that name (hit on `gofetch`, whose ToolHive CR
  is the bare short name; `*-mcp`-named ToolHive CRs are safe). If the short
  name is taken, suffix the kmcp CR (e.g. `<name>-kmcp`) and rename after
  ToolHive delete. Prefer short CR name → Service DNS
  `http://{cr}.{ns}.svc.cluster.local:8080/mcp`.
- File naming — during dual-run: ToolHive stays `mcpserver.yaml`; kmcp is
  `mcpserver-kmcp.yaml` in the same directory. After ToolHive delete, rename
  kmcp file to `mcpserver.yaml` (optional cleanup lap).
- Namespace layout — **keep `mcp-{name}`** with `mcp-server=true`; kmcp CR
  lands in that NS (not `kagent`).
- Isolation — kmcp has **no** `permissionProfile` and **no**
  `automountServiceAccountToken` on the CR. **Accept mounted SA token**
  (Kyverno `audit-automount-sa-token` will fire). Compensate with
  `deployment.securityContext` / `podSecurityContext` (drop ALL caps, no
  privilege escalation, RuntimeDefault seccomp) + Cilium NS labels. Keep
  `toolhive-system` Cilium allow until Phase 8. Do not claim ToolHive sandbox
  parity.
- Client model — keep LiteLLM + RemoteMCPServer URL pointers mid-migration;
  no second registry.
- Phase 2 split — 2a (`gofetch`) dropped by scope trim; **2b stdio+proxy**
  (`searxng` → `firecrawl` → `a2a`). stdio pattern proven: kmcp
  `transportType: stdio` injects an agentgateway adapter that spawns
  `deployment.cmd`/`args` over stdio and serves streamable HTTP `/mcp` on
  `deployment.port` — same shape as ToolHive `proxyMode: streamable-http`.
  Caveat: agentgateway replaces the image ENTRYPOINT; restate it in `cmd`/
  `args`. It also **requires `mcp-session-id`** on non-initialize requests
  (LiteLLM handles sessions; raw curl probes must replay the header).
- agentgateway stdio gotchas (2026-07-25, hit on proxmox/a2a/plex) — the
  adapter is not a plain shell exec; three failure modes to design around:
  1. **Premature `$VAR` expansion** — agentgateway interpolates `$FOO` in its
     generated adapter config before the stdio shell runs, so `export
FOO="$(cat /secret)"` then referencing `$FOO` later yields empty. Fix:
     read the secret file **inline** where the value is used (proxmox writes
     `$(cat /var/run/secrets/mcp/...)` straight into its `config.json`
     heredoc).
  2. **Service-link env clash** — a kmcp Service named `<x>` makes kubelet
     inject `X_PORT=tcp://<ip>:8080`; agentgateway inherits it into the child.
     CR `deployment.env` does **not** win (CRD has no `enableServiceLinks`).
     Fix: `export X_PORT=<real>` in the startup command (a2a needed
     `A2A_PORT=41241`). Watch any app reading an env var named after its
     Service. Tracked: `docs/issues/kmcp-service-port-decoupling.md`.
  3. **Per-session respawn, persistent `/tmp`** — agentgateway respawns
     `cmd`/`args` per MCP session while the pod filesystem persists, so
     startup steps must be idempotent. `git clone` fails on the 2nd session
     with "destination path already exists"; guard it (plex uses
     `{ [ -d repo ] || git clone …; }`).
- Grafana / Discord — late phases; see inventory.
- ToolHive retain — default none; exceptions go in Decisions + follow-up issue.

## Proven pattern (copy for Phase 2+)

Reference implementations (stdio):
`flux/manifests/04-apps/artificial-intelligence/mcp-servers/searxng/mcpserver-kmcp.yaml`
and `…/firecrawl/mcpserver-kmcp.yaml`. Native `http` shape (from the osv
pilot):

```yaml
apiVersion: kagent.dev/v1alpha1
kind: MCPServer
metadata:
  name: <short-name> # ≠ ToolHive Deployment name
  namespace: mcp-<name>
spec:
  transportType: http # ToolHive streamable-http → http
  httpTransport:
    targetPort: 8080
    path: /mcp
  deployment:
    image: <same as ToolHive>
    port: 8080
    env:
      MCP_PORT: "8080"
      FASTMCP_PORT: "8080"
      MCP_TRANSPORT: streamable-http # when the image expects it
    # resources: match ToolHive
    podSecurityContext:
      seccompProfile:
        type: RuntimeDefault
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: [ALL]
```

LiteLLM / RemoteMCP flip target:
`http://<short-name>.mcp-<name>.svc.cluster.local:8080/mcp`

## Per-server cutover checklist

1. Add `mcpserver-kmcp.yaml` in the same `mcp-*` NS (dual-run); wire into
   `kustomization.yaml`
2. Local: `kustomize build` + prettier + Trivy on touched paths
3. Apply (operator): `kubectl apply -k …/mcp-servers/<name>`
4. Wait `mcpserver.kagent.dev/<cr>` Ready; confirm Service name = CR name
5. Probe **kmcp URL directly** from `litellm` NS (curl MCP initialize /
   tools/list / one tool) before touching clients
6. Edit `litellm/litellm.yml` URL; for iterative apply also patch ConfigMap
   `litellm-config` key `models.yaml` and
   `kubectl rollout restart deployment/litellm -n litellm` (Flux alone is slow
   for lap feedback)
7. If the server has agent RemoteMCPServers: flip those URLs too (FQDN). Files
   under `flux/.../agents/*/remotemcpserver.yaml`
8. Re-probe via LiteLLM MCP tool
9. Soak (see exit criteria), then delete ToolHive `MCPServer`; confirm no
   orphaned `*-proxy` Service
10. Tick plan checkbox; refine Notes if anything hurt

**Cilium:** keep `mcp-server` / `mcp-client` labels. Negative probe (unlabeled
NS deny) — once per phase or when networking changes; not a per-server gate.

## Inventory

| Server    | Complexity signals                                     | Phase | kmcp probe (2026-07-25) |
| --------- | ------------------------------------------------------ | ----- | ----------------------- |
| searxng   | LiteLLM + RemoteMCP on kmcp; ToolHive CR removed       | 2b    | OK                      |
| firecrawl | LiteLLM + RemoteMCP on kmcp; ToolHive CR removed       | 2b    | OK                      |
| a2a       | CR `a2a`; `A2A_PORT` export; ToolHive CR removed       | 2b    | 7 tools                 |
| unifi     | CR `unifi` (was `unifi-kmcp`); secret volume map       | 3     | 185 tools               |
| gitlab    | CR `gitlab`; secret volume map                         | 3     | 50 tools                |
| github    | CR `github`; header auth only                          | 3     | 401 (header auth)       |
| servarr   | CR `servarr`; secret volume map                        | 3     | 14 tools                |
| truenas   | CR `truenas` (was `truenas-kmcp`); secret volume map   | 3     | 27 tools                |
| proxmox   | CR `proxmox` (was `proxmox-kmcp`); inline secret reads | 3     | 42 tools                |
| qdrant    | CR `qdrant`; install/`cc` still broken                 | 3     | flaky                   |
| flux      | CR `flux` (was `flux-kmcp`); SA `flux-mcp-sa`          | 4     | 15 tools                |
| openzim   | CR `openzim`; PVC `/data` + `/tmp`                     | 5     | 8 tools                 |
| grafana   | CR `grafana`; header auth                              | 6     | 403 (header auth)       |
| discord   | CR `discord`; secret volume map; bridge untouched      | 7     | 75 tools                |

Retired (decommission lap): `osv`, `gofetch`, `mkp`, `plex` (OOM under
agentgateway per-session `pip install`; removed 2026-07-25).

**Rollout status (2026-07-25 evening):** ToolHive MCPServer CRs deleted
on-cluster; kmcp is sole intended host. Short-name rename done for
`flux`/`proxmox`/`truenas`/`unifi` (was `*-kmcp`); LiteLLM + RemoteMCP
URLs updated to match. Git promotes each `mcpserver-kmcp.yaml` →
`mcpserver.yaml` and drops ToolHive manifests. **Push required:** `apps-ai`
went Ready mid-lap and re-applied `main`, resurrecting ToolHive CRs +
`flux-kmcp` until this branch lands on `main`. Then Phase 8 (ToolHive
HelmRelease / Cilium allow / skill docs).

**Apply-order hard rule (2026-07-25):** all remaining LiteLLM + RemoteMCP
URLs already point at kmcp Services in Git. **Do not push/apply client flips
until the matching `mcpserver.kagent.dev` is Ready** (or apply kmcp CRs first
in the same lap). Cross-checked: every client URL matches its CR name
(short CR names after rename).

**Secret mapping note:** kmcp `secretRefs` is `envFrom`-shaped and cannot
rename hyphenated OnePassword keys. Drafts mount the existing Secret as a
read-only volume and export env vars to preserve ToolHive names.

## Steps

### Phase 0 — Foundations

- [x] kmcp live via kagent-bundled; API `kagent.dev/v1alpha1`
- [x] Field diff ToolHive ↔ kmcp (image, transport, Service naming, secrets,
      SA, volumes; no permissionProfile / no automountSA on CR)
- [x] Dual-run DNS shape (CR-named Service; LiteLLM one-URL flip)
- [x] Isolation Decision: accept mounted SA; require container hardening
- [x] Cutover checklist + proven pattern captured (this refine)
- [ ] Optional once: Cilium negative probe unlabeled NS → kmcp Service deny;
      `litellm` allow
- [ ] Before Phase 3 apply: confirm secret volume+export pattern on one live
      server (unifi recommended) before flipping its clients

### Phase 1 — Pilot: `osv` (done; later decommissioned)

- [x] Author `mcpserver-kmcp.yaml`; dual-run Ready; direct + LiteLLM probes
- [x] Flip LiteLLM `mcp_servers.osv.url` → kmcp Service
- [x] Re-probe after push
- [x] Decommissioned (Git + on-cluster) — see Decommission lap
- [ ] Draft kmcp-first update to `.agents/skills/mcp-deployment/SKILL.md`
      (do not wait for Phase 8)

### Phase 2a — `gofetch` (dropped)

Skipped by scope trim. Naming hard rule proven on apply (kmcp Deployment
`gofetch` vs ToolHive-owned Deployment). Server retired in Decommission lap.

### Phase 2b — Stdio + proxyMode peers

- [x] `searxng` — dual-run applied; Ready; direct + LiteLLM probes OK
- [x] `firecrawl` — dual-run applied; Ready; direct + LiteLLM probes OK
- [x] Flip clients: LiteLLM `litellm.yml` **and**
      `agents/search/remotemcpserver.yaml` (`searxng-mcp`, `firecrawl-mcp`)
      → kmcp FQDN; `gofetch-mcp` removed from agent-search
- [x] Delete ToolHive CRs (`searxng-mcp`, `firecrawl-mcp`); no orphaned
      MCP `*-proxy` Services after delete
- [x] `a2a` — applied; Ready; 7 tools via LiteLLM. Needed an `A2A_PORT` export
      in the startup command (service-link clash, see Decisions)
- [x] Delete ToolHive CR `a2a-mcp-server`
- [x] **Refine:** stdio playbook snippet; a2a surprises → agentgateway
      service-link gotcha captured in Decisions

### Phase 3 — Secret-backed servers

- [x] Git drafts for `unifi-kmcp`, `gitlab`, `github`, `servarr`, `plex-kmcp`,
      `truenas-kmcp`, `proxmox-kmcp`, `qdrant` + LiteLLM/RemoteMCP URL drafts
- [x] Apply/probe each kmcp CR — all Ready; tool counts in Inventory. `github`
      401 (header auth, expected). `proxmox-kmcp` needed inline secret reads
      (agentgateway var-expand, see Decisions). `plex-kmcp` needed idempotent
      git clone.
- [x] Delete ToolHive CRs (`unifi-network-mcp`, `gitlab-mcp-server`,
      `github-mcp-server`, `servarr-mcp`, `plex-mcp-server`,
      `truenas-mcp-server`, `proxmox-mcp-plus`, `qdrant-mcp`)
- [x] Rename `unifi`/`plex`/`proxmox`/`truenas` off `*-kmcp` suffix; client
      URLs updated
- [x] **Refine:** hyphenated keys need volume mount + export (not bare
      `secretRefs`/`envFrom`)

### Phase 4 — Cluster RBAC servers

- [x] `flux` — CR renamed `flux-kmcp` → `flux`; SA `flux-mcp-sa`
- [x] Applied; Ready; clients on short DNS
- [x] Delete ToolHive CR `flux-mcp`
- [ ] **Refine:** RBAC checklist (SA mount worked; no extra steps hit)

### Phase 5 — `openzim` (PVC)

- [x] Git draft — CR `openzim`; PVC `/data` RO + `/tmp` emptyDir
- [x] Applied; Ready; 8 tools via LiteLLM; clients on kmcp
- [x] Delete ToolHive CR after soak
- [ ] **Refine:** storage playbook (RO PVC mount worked as drafted)

### Phase 6 — `grafana`

- [x] Git draft — CR `grafana`; built-in overlap documented in README
- [x] Applied; Ready; server-side probe 403 (header auth, expected — validates
      only with caller `X-Grafana-API-Key`); clients on kmcp
- [x] Delete ToolHive CR after soak
- [ ] **Refine:** keep / consolidate / follow-up issue for built-in

### Phase 7 — `discord`

- [x] Git draft — CR `discord`; secret volume map; bridge untouched
- [x] Applied; Ready; 75 tools via LiteLLM; clients on kmcp
- [x] Delete ToolHive CR after soak
- [ ] **Refine:** bridge coupling notes only (no bridge rewrite in this plan)

### Decommission lap — `osv`, `gofetch`, `mkp`

- [x] Git: remove LiteLLM entries (`gofetch`, `mkp`, `osv`); remove
      `gofetch-mcp` RemoteMCPServer + agent tool binding; drop
      `mcp-servers/{osv,gofetch,mkp}/` and parent kustomization entries;
      trim mcpo `config.json` + READMEs
- [x] On-cluster (verified 2026-07-25): namespaces `mcp-osv`, `mcp-gofetch`,
      `mcp-mkp` already gone; no leftover kmcp/ToolHive CRs; no mkp
      ClusterRole/Binding; LiteLLM config clean of all three
- [x] Verify no live refs remain
- [x] **Refine:** decommission shrinks Phase inventory; proven-pattern ref
      retargeted to searxng/firecrawl

### Phase 8 — ToolHive teardown and docs

- [ ] Zero ToolHive MCPServers (or listed exceptions)
- [ ] Remove / suspend ToolHive HelmRelease under `03-services/toolhive/`
- [ ] Drop Cilium `toolhive-system` allow from `mcp-server-isolation`
- [ ] Finish skill + `mcp-servers/README.md` + `kagent/README.md` (kmcp-first)
- [ ] Follow-up issue only if CRDs must linger
- [ ] **Done:** tick issue acceptance; delete this plan on ship

## Feedback loop

- `kustomize build` on touched `mcp-servers/<name>` and (when flipping)
  `litellm/`
- prettier / yamllint on changed manifests
- Trivy on changed paths (`user-trivy`)
- Read-only: `mcpserver.kagent.dev` + `mcpserver.toolhive.stacklok.dev`;
  HelmRelease kagent / toolhive
- Functional: one LiteLLM MCP tool call per migrated server; agent RemoteMCP
  path when applicable
- Security (per migrate, not fantasy SA-off):
  - Caps / seccomp present on kmcp Deployment
  - No Gateway/HTTPRoute for the MCP Service
  - Cilium labels intact; optional unlabeled-NS deny probe per phase

## Notes

- Paths: `flux/.../mcp-servers/`, `03-services/toolhive/`,
  `.agents/skills/mcp-deployment/SKILL.md`,
  `agents/*/remotemcpserver.yaml`, `litellm/litellm.yml`
- Related: `docs/issues/discord-integration-upstream-a2a.md`
- Upstream: [kmcp / kagent docs](https://kagent.dev/docs/)
- Implement via `implement-change` / `manifest-implementer` +
  `manifest-verifier`; HITL for apply
- Ship commits to **`main`**, not a feature branch — Flux tracks `main`, so a
  cutover commit on another branch is invisible on-cluster and a later
  `main`-reconcile silently reverts a direct `kubectl apply` back to the old
  spec. (Hit 2026-07-25: a2a/plex fix landed on `feat/…` first and got
  clobbered; cherry-picked to `main` to stick.)
- Next lap: **push this teardown/rename to `main`** so Flux stops
  resurrecting ToolHive CRs, then Phase 8 (ToolHive HelmRelease, Cilium
  `toolhive-system` allow, kmcp-first skill/README). Fix `qdrant` kmcp image
  (`cc`/pydantic-core build) as a follow-up. `hello-substrate` /
  openclaw AgentHarness Ready=False is unrelated to this migration.
