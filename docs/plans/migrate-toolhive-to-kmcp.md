---
title: "Migrate MCP hosting from ToolHive to kmcp"
status: active
found_at: 2026-07-24
updated_at: 2026-07-24
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

- All 18 ToolHive MCP servers under
  `flux/manifests/04-apps/artificial-intelligence/mcp-servers/`
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

- First migration (Phase 1 pilot) — **osv** — only true baseline: native
  `streamable-http`, dedicated image, no env/args/secrets/RBAC/PVC; LiteLLM-only
  (no `RemoteMCPServer`); probe via `query_vulnerability` / batch tools.
  Runner-up: `gofetch`. Do **not** pilot `searxng` / `firecrawl` / `a2a` first —
  they use ToolHive stdio+proxyMode and/or runtime package install.
- Cutover — **phased dual-run** — ToolHive and kmcp coexist until each server
  proves out; reverse by flipping LiteLLM / RemoteMCPServer URLs back.
- Target API — **`kagent.dev/v1alpha1` `MCPServer`** — controller is
  **kagent-bundled** (`kmcp.enabled: true` on kagent HelmRelease), not a
  standalone kmcp operator. Live: `kagent-kmcp-controller-manager` (kmcp 0.3.0).
- Dual-run naming — kmcp CR/Service name **must not** be
  `osv-vulnerability-scanner` (ToolHive already owns that Deployment). Prefer
  CR name `osv` → LiteLLM flip target
  `http://osv.mcp-osv.svc.cluster.local:8080/mcp`. Set `deployment.port` /
  `httpTransport` to **8080** + path `/mcp`; set `MCP_PORT` / `FASTMCP_PORT` /
  `MCP_TRANSPORT` env as needed (kmcp does not inject ToolHive defaults).
- Namespace layout — **keep `mcp-{name}` namespaces** — Cilium already keys off
  `mcp-server=true` NS labels; avoid mass re-labeling. kmcp CR must land in
  `mcp-{name}` (not the controller NS).
- Isolation — **kmcp has no `permissionProfile`** and **no
  `automountServiceAccountToken` field** on the CR (confirmed against
  `mcpservers.kagent.dev`). Compensate with `deployment.securityContext` /
  `podSecurityContext` (drop ALL caps, no privilege escalation, RuntimeDefault
  seccomp) + Cilium NS labels; verify SA token mount on the live pod before
  LiteLLM flip. Keep `toolhive-system` Cilium allow until Phase 8. Do not claim
  sandbox parity with ToolHive.
- Client model — **keep LiteLLM + RemoteMCPServer URL pointers** until a later
  lap evaluates kmcp-native discovery; do not invent a second registry mid-
  migration. _(Revisit after Phase 1 refine.)_
- ToolHive retain — **default none** — any server kmcp cannot host gets an
  explicit exception in Decisions + a follow-up issue. _(Confirm per-server in
  Phase 0.)_
- Phase 2 non-pilots — migrate **gofetch first** as SSRF/isolation canary after
  the hosting pattern is proven; then searxng → firecrawl → a2a. Do not promote
  gofetch/searxng into Phase 1.
- Grafana — **migrate `mcp-servers/grafana` independently** of kagent's
  built-in `grafana-mcp` subchart; document overlap in Phase 6 refine.
- Discord MCP — **migrate in its own late phase**; bridge A2A work can land
  before or after, but note coupling in Phase 7.

## Inventory (all 18)

| Server    | Complexity signals                                                         | Phase |
| --------- | -------------------------------------------------------------------------- | ----- |
| osv       | true baseline: streamable-http, dedicated image, no env/args; LiteLLM-only | 1     |
| gofetch   | near-baseline: streamable-http + user-agent arg; + search RemoteMCPServer  | 2     |
| searxng   | stdio + proxyMode; `SEARXNG_URL` dep; RemoteMCPServer                      | 2     |
| firecrawl | stdio + proxyMode; node/npx runtime; Firecrawl dep; RemoteMCPServer        | 2     |
| a2a       | stdio + proxyMode; python/pip runtime; A2A bridge role                     | 2     |
| unifi     | secret                                                                     | 3     |
| gitlab    | secret                                                                     | 3     |
| github    | auth (PAT / headers; no local secret.yaml)                                 | 3     |
| servarr   | secret                                                                     | 3     |
| plex      | secret                                                                     | 3     |
| truenas   | secret                                                                     | 3     |
| proxmox   | secret                                                                     | 3     |
| qdrant    | secret + external vector DB                                                | 3     |
| mkp       | cluster RBAC                                                               | 4     |
| flux      | cluster RBAC                                                               | 4     |
| openzim   | PVC/SMB + OnePasswordItem + pip runtime                                    | 5     |
| grafana   | header auth (no local secret.yaml) + kagent built-in overlap               | 6     |
| discord   | secret + Discord A2A coupling                                              | 7     |

Phase 2 order: **gofetch → searxng → firecrawl → a2a**.

## Steps

### Phase 0 — Foundations (before cutting any traffic)

- [x] Confirm kmcp controller/CRDs live — **kagent-bundled**
      (`kmcp.enabled: true`); API **`kagent.dev/v1alpha1`**; controller
      `kagent-kmcp-controller-manager` @ kmcp 0.3.0; zero `kagent.dev`
      MCPServers today. Use FQDN kinds
      (`mcpserver.kagent.dev` vs `mcpserver.toolhive.stacklok.dev`).
- [x] Diff ToolHive vs kmcp fields used here:
      `image` → `deployment.image`; `streamable-http` → `transportType: http`;
      ToolHive `mcp-{name}-proxy` Service vs kmcp Service **named as CR**;
      env `secretKeyRef` → kmcp `secretRefs` (volume mounts, not env inject);
      `serviceAccount` → `deployment.serviceAccountName`; volumes via
      `deployment.volumes` / `volumeMounts`; **no** `permissionProfile`.
- [x] Dual-run Service DNS shape — distinct CR/Service name (e.g. `osv`);
      LiteLLM one-URL flip to `http://osv.mcp-osv.svc.cluster.local:8080/mcp`;
      no temporary alias required if the name is intentional.
- [ ] Draft per-server cutover checklist (apply kmcp CR → Ready → probe tool →
      flip clients → delete ToolHive CR → refine plan); add “set
      `kagent.dev/discovery=disabled` if avoiding auto-discovery”
- [ ] Note Cilium: keep `mcp-server` / `mcp-client` NS labels; schedule
      `toolhive-system` ingress allow removal for Phase 8
- [ ] Phase 0 security gates (block client flip until done):
  - [ ] kmcp `MCPServer` deploys into `mcp-{name}` with `mcp-server=true`
  - [ ] Compensating isolation fields present (`automountServiceAccountToken:
false`, non-root / drop caps / seccomp where CR allows)
  - [ ] Distinct Services — no shared Endpoints mixing ToolHive proxy + kmcp
  - [ ] Assert kmcp does **not** create Gateway/HTTPRoute for MCP
  - [ ] Document secretRef pattern for Phase 3 (volume vs env) — dry-run from
        Phase 1 refine; do not learn it on live Phase 3 creds
- [ ] **Refine this plan:** fill remaining CRD gaps into later phases; mark
      servers kmcp cannot host; adjust phase order if needed

### Phase 1 — Pilot vertical slice: `osv`

- [x] Author kmcp `MCPServer` named `osv` in `mcp-osv` beside ToolHive CR
      (`mcpserver-kmcp.yaml`; port 8080, path `/mcp`, env as needed)
- [x] Dual-run applied: both Ready; Service `osv` + Deployment `osv` up;
      direct probe from `litellm` NS — `initialize` / `tools/list` /
      `query_vulnerability` (lodash npm 4.17.15) returned GHSA vulns on
      `http://osv.mcp-osv.svc.cluster.local:8080/mcp`. No auto
      `RemoteMCPServer` for osv observed.
- [ ] Cilium gate: unlabeled NS cannot reach kmcp Service; `mcp-client` can
- [x] SA token is mounted (Kyverno `audit-automount-sa-token` PolicyViolation);
      accepted for kmcp because kagent is Kubernetes-integrated and the CRD
      cannot set `automountServiceAccountToken: false`. Container hardening
      remains required.
- [x] Flip **only**
      `flux/manifests/04-apps/artificial-intelligence/litellm/litellm.yml`
      `mcp_servers.osv.url` from
      `http://mcp-osv-vulnerability-scanner-proxy.mcp-osv.svc.cluster.local:8080/mcp`
      to `http://osv.mcp-osv.svc.cluster.local:8080/mcp` — no RemoteMCPServer
      refs for osv
- [x] Re-probe via LiteLLM after rollout; `osv-query_vulnerability` returned
      expected GHSA results through the kmcp endpoint
- [ ] After soak, delete ToolHive `MCPServer` for osv; confirm no orphaned proxy
      Service still serving
- [ ] Update `mcp-deployment` skill with the proven pattern (kmcp-first draft)
- [ ] **Refine this plan:** capture gotchas (labels, ports, paths, probes,
      renovate image pins, secretRef dry-run notes for Phase 3); tighten Phase
      2 checklist from what hurt

### Phase 2 — Stateless peers (ordered)

- [ ] `gofetch` — migrate + LiteLLM + `agents/search/remotemcpserver.yaml` flip + ToolHive CR delete (SSRF/isolation canary)
- [ ] `searxng` — same; normalize RemoteMCPServer short DNS to FQDN on flip
- [ ] `firecrawl` — migrate + client flip + ToolHive CR delete
- [ ] `a2a` — migrate + client flip + ToolHive CR delete (last: runtime install + bridge blast)
- [ ] **Refine this plan:** collapse repeated steps into a short playbook
      section; note any a2a-specific surprises for agents using A2A tools

### Phase 3 — Secret-backed servers

- [ ] `unifi`
- [ ] `gitlab`
- [ ] `github`
- [ ] `servarr`
- [ ] `plex`
- [ ] `truenas`
- [ ] `proxmox`
- [ ] `qdrant`
- [ ] For each: 1Password Item / kmcp `secretRefs` wiring matches ToolHive
      intent; probe one authenticated tool; flip LiteLLM + RemoteMCPServer;
      delete ToolHive CR
- [ ] **Refine this plan:** document canonical secretRef pattern for kmcp;
      call out any server that needed ToolHive-only permission profiles

### Phase 4 — Cluster RBAC servers

- [ ] `mkp` — port ServiceAccount / Role / RoleBinding (or ClusterRole) to
      kmcp serviceAccount model; least privilege preserved
- [ ] `flux` — same for Flux CR access
- [ ] Probe read-only list tools; flip clients; delete ToolHive CRs
- [ ] **Refine this plan:** RBAC checklist for future MCP with cluster access;
      flag if kmcp SA model forced a privilege change

### Phase 5 — Persistent storage: `openzim`

- [ ] Map ToolHive PVC / volume mounts to kmcp volumes + volumeMounts
- [ ] Confirm ZIM data path survives cutover (no silent empty volume)
- [ ] Flip clients; delete ToolHive CR
- [ ] **Refine this plan:** storage playbook snippet; note reclaim / mount
      gotchas for any future PVC-backed MCP

### Phase 6 — `grafana` (overlap with kagent built-in)

- [ ] Inventory callers: LiteLLM `grafana`, agent RemoteMCPServers, kagent
      `tools.grafana-mcp` / subchart
- [ ] Migrate `mcp-servers/grafana` to kmcp without assuming the built-in
      subchart replaces it
- [ ] Flip clients; delete ToolHive CR
- [ ] **Refine this plan:** decide whether kagent built-in grafana-mcp stays,
      consolidates, or gets a follow-up issue

### Phase 7 — `discord` (coordinate with A2A issue)

- [ ] Check status of `docs/issues/discord-integration-upstream-a2a.md`; note
      shared bot token / bridge assumptions
- [ ] Migrate Discord MCP to kmcp; keep outbound tools working for homelab
      agent
- [ ] Flip clients; delete ToolHive CR
- [ ] **Refine this plan:** record bridge coupling; open follow-ups on the
      Discord A2A issue if needed (do not expand this plan into bridge rewrite)

### Phase 8 — ToolHive teardown and docs

- [ ] Confirm zero ToolHive `MCPServer` CRs remain (or listed exceptions)
- [ ] Remove / suspend ToolHive HelmRelease under `03-services/toolhive/`
- [ ] Drop Cilium allow for `toolhive-system` from `mcp-server-isolation`
- [ ] Finish `mcp-deployment` skill + `mcp-servers/README.md` +
      `kagent/README.md` (kmcp-first; no ToolHive-first guidance)
- [ ] File delete-follow-up issue only if CRDs/operator must linger briefly
- [ ] **Refine this plan → done:** tick related issue acceptance; delete this
      plan file on ship (ledger delete-on-ship)

## Per-server cutover checklist (living)

Copy for each server; amend in Phase refine steps:

1. Add kmcp CR in same `mcp-*` namespace (dual-run with ToolHive); CR name ≠
   ToolHive Deployment name
2. Wait Ready; `kustomize build` + yamllint + Trivy on touched paths
3. Probe one tool via LiteLLM (and kagent RemoteMCPServer if applicable)
4. Flip LiteLLM URL; flip RemoteMCPServer URL(s) when present
5. Re-probe; Cilium negative probe still holds
6. Delete ToolHive `MCPServer` for that server; confirm no orphaned proxy
7. Update this plan checkbox + refine notes

## Feedback loop

- `kustomize build flux/manifests/04-apps/artificial-intelligence/mcp-servers`
- `yamllint` on changed manifests
- Trivy on changed paths (`user-trivy` / project scanner)
- Read-only: list kmcp + ToolHive MCP CRs (`mcpserver.kagent.dev` /
  `mcpserver.toolhive.stacklok.dev`); HelmRelease status for kagent /
  toolhive
- Functional: one tool call per migrated server via LiteLLM (and critical
  agent paths); no cluster mutate without ask
- Security probes:
  - Unauthorized ingress deny (unlabeled NS → MCP Service)
  - Authorized ingress allow (`litellm` / `kagent`)
  - No Gateway/HTTPRoute owned by osv/kmcp in `mcp-osv`
  - Pod inspect: no automounted SA token; no unexpected secret volumes on osv

## Notes

- Likely paths: `flux/.../mcp-servers/`, `03-services/toolhive/`,
  `.agents/skills/mcp-deployment/SKILL.md`, agent `remotemcpserver.yaml`s,
  `litellm/litellm.yml`
- Related: `docs/issues/discord-integration-upstream-a2a.md`
- Upstream: [kmcp / kagent docs](https://kagent.dev/docs/)
- Implement via `implement-change` / `manifest-implementer` +
  `manifest-verifier` per phase; HITL throughout
- Skill + kagent README still ToolHive-first until Phase 1 refine lands

### Director refine (2026-07-24)

Fan-out locked Phase 1 on **osv**: inventory (complexity rank), kmcp
foundations (API + dual-run DNS), client wiring (LiteLLM-only flip), security
(isolation gap + Cilium gates).

Apply (2026-07-24): kmcp `osv` Ready in ~10s; env/`port`/`path` worked first
try; LiteLLM-NS curl tool call succeeded; no osv `RemoteMCPServer` auto-
created. Kyverno audit fail: SA token mounted via SA `osv` — CRD gap remains.
Follow-ups before LiteLLM flip: Cilium negative probe; decide SA-token
compensation (upstream kmcp field, Kyverno mutate, or accept + document).
`runAsNonRoot` / `readOnlyRootFilesystem` still deferred.
