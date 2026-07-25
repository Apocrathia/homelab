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

- Scope trim (2026-07-25) — **`osv`, `gofetch`, `mkp` will be decommissioned,
  not migrated** — operator has observed zero agent usage. Coverage: searxng
  `web_url_read` + firecrawl replace gofetch; flux MCP covers mkp's k8s reads.
  Decommission is a dedicated later lap (see Decommission lap below); until
  then they keep running as-is.
- First migration (Phase 1) — **osv** — client cutover **done**; pattern
  proven: native `http` transport, LiteLLM-only. osv itself is now slated for
  decommission; no soak/ToolHive-delete lap needed.
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
- Grafana / Discord — late phases; see inventory.
- ToolHive retain — default none; exceptions go in Decisions + follow-up issue.

## Proven pattern (copy for Phase 2+)

Reference implementation:
`flux/manifests/04-apps/artificial-intelligence/mcp-servers/osv/mcpserver-kmcp.yaml`

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

LiteLLM flip target: `http://<short-name>.mcp-<name>.svc.cluster.local:8080/mcp`

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
8. Re-probe via LiteLLM MCP tool (e.g. `osv-query_vulnerability`)
9. Soak (see exit criteria), then delete ToolHive `MCPServer`; confirm no
   orphaned `*-proxy` Service
10. Tick plan checkbox; refine Notes if anything hurt

**Cilium:** keep `mcp-server` / `mcp-client` labels. Negative probe (unlabeled
NS deny) — once per phase or when networking changes; not a per-server gate.

## Inventory (all 18)

| Server    | Complexity signals                                                  | Phase  |
| --------- | ------------------------------------------------------------------- | ------ |
| osv       | pilot done (kmcp cutover live); unused → retire both CRs            | decomm |
| gofetch   | unused; redundant w/ searxng `web_url_read` + firecrawl; name clash | decomm |
| mkp       | unused; flux MCP covers k8s reads                                   | decomm |
| searxng   | dual-run Ready + probed (4 tools); client flip pending              | 2b     |
| firecrawl | dual-run Ready + probed (26 tools); client flip pending             | 2b     |
| a2a       | stdio + proxyMode; pip runtime; A2A bridge                          | 2b     |
| unifi     | secret                                                              | 3      |
| gitlab    | secret                                                              | 3      |
| github    | auth (PAT / headers; no local secret.yaml)                          | 3      |
| servarr   | secret                                                              | 3      |
| plex      | secret                                                              | 3      |
| truenas   | secret                                                              | 3      |
| proxmox   | secret                                                              | 3      |
| qdrant    | secret + external vector DB                                         | 3      |
| flux      | cluster RBAC                                                        | 4      |
| openzim   | PVC/SMB + OnePasswordItem + pip runtime                             | 5      |
| grafana   | header auth + kagent built-in overlap                               | 6      |
| discord   | secret + Discord A2A coupling                                       | 7      |

## Steps

### Phase 0 — Foundations

- [x] kmcp live via kagent-bundled; API `kagent.dev/v1alpha1`
- [x] Field diff ToolHive ↔ kmcp (image, transport, Service naming, secrets,
      SA, volumes; no permissionProfile / no automountSA on CR)
- [x] Dual-run DNS shape (CR-named Service; LiteLLM one-URL flip)
- [x] Isolation Decision: accept mounted SA; require container hardening
- [x] Cutover checklist + proven pattern captured (this refine)
- [ ] Optional once: Cilium negative probe unlabeled NS → `osv` Service deny;
      `litellm` allow
- [ ] Before Phase 3: dry-run / document kmcp `secretRefs` (volume) vs ToolHive
      `secretKeyRef` (env) — do not learn on live Phase 3 creds

### Phase 1 — Pilot: `osv` (client cutover done)

- [x] Author `mcpserver-kmcp.yaml`; dual-run Ready; direct + LiteLLM probes
- [x] Flip LiteLLM `mcp_servers.osv.url` →
      `http://osv.mcp-osv.svc.cluster.local:8080/mcp`
- [x] Re-probe after push (`osv-query_vulnerability` / lodash npm 4.17.15)
- ~~Soak exit / ToolHive CR delete~~ — superseded: osv moves to the
  Decommission lap (both CRs go)
- [ ] Draft kmcp-first update to `.agents/skills/mcp-deployment/SKILL.md`
      (do not wait for Phase 8)

### Phase 2a — `gofetch` (dropped)

Skipped by scope trim. The 2026-07-25 apply attempt also proved the naming
hard rule (kmcp Deployment `gofetch` vs ToolHive-owned Deployment `gofetch`,
immutable selector). Draft reverted from the repo; failed kmcp CR
`mcpserver.kagent.dev/gofetch` still needs deleting on-cluster (Decommission
lap). ToolHive gofetch keeps serving clients until decommission.

### Phase 2b — Stdio + proxyMode peers

- [x] `searxng` — dual-run applied 2026-07-25; Ready; direct probe from
      `litellm` NS OK (initialize + 4 tools via `mcp-session-id` replay)
- [x] `firecrawl` — dual-run applied 2026-07-25; Ready; direct probe OK
      (26 tools)
- [ ] Flip clients for both: LiteLLM `litellm.yml` **and**
      `flux/.../agents/search/remotemcpserver.yaml` (`searxng-mcp`,
      `firecrawl-mcp`); normalize short DNS to FQDN; re-probe via LiteLLM
- [ ] Delete ToolHive CRs (`searxng-mcp`, `firecrawl-mcp`) after soak;
      confirm no orphaned `*-proxy` Services
- [ ] `a2a` — last; pip runtime + bridge blast; LiteLLM-only URL count but
      higher operational risk
- [ ] **Refine:** stdio playbook snippet; a2a surprises

### Phase 3 — Secret-backed servers

- [ ] `unifi`, `gitlab`, `github`, `servarr`, `plex`, `truenas`, `proxmox`,
      `qdrant`
- [ ] For each: 1Password Item + kmcp `secretRefs` matches ToolHive intent;
      probe one authenticated tool; flip clients; delete ToolHive CR
- [ ] **Refine:** canonical secretRef pattern

### Phase 4 — Cluster RBAC servers

- [ ] `flux` — port SA / Role(Binding) / ClusterRole to kmcp
      `serviceAccountName`; least privilege (`mkp` dropped by scope trim)
- [ ] Probe list tools; flip; delete ToolHive CR
- [ ] **Refine:** RBAC checklist

### Phase 5 — `openzim` (PVC)

- [ ] Map volumes/mounts; confirm ZIM path survives; flip; delete ToolHive CR
- [ ] **Refine:** storage playbook

### Phase 6 — `grafana`

- [ ] Inventory LiteLLM / agent remotes / kagent `grafana-mcp` subchart
- [ ] Migrate without assuming built-in replaces it; flip; delete ToolHive CR
- [ ] **Refine:** keep / consolidate / follow-up issue for built-in

### Phase 7 — `discord`

- [ ] Coordinate with `docs/issues/discord-integration-upstream-a2a.md`
- [ ] Migrate; flip; delete ToolHive CR
- [ ] **Refine:** bridge coupling notes only (no bridge rewrite in this plan)

### Decommission lap — `osv`, `gofetch`, `mkp` (scheduled, before Phase 8)

Dedicated cleanup lap; servers keep running as-is until then.

- [ ] `gofetch` — delete failed kmcp CR `mcpserver.kagent.dev/gofetch`
      (mcp-gofetch); remove LiteLLM `mcp_servers.gofetch`, `gofetch-mcp`
      RemoteMCPServer (agent-search), manifests dir + parent kustomization
      entry; delete ToolHive CR + namespace
- [ ] `mkp` — remove LiteLLM `mcp_servers.mkp`; manifests dir + parent
      kustomization; delete ToolHive CR + namespace (+ its RBAC)
- [ ] `osv` — remove LiteLLM `mcp_servers.osv`; delete kmcp CR `osv` and
      ToolHive CR `osv-vulnerability-scanner`; manifests dir + parent
      kustomization; delete namespace
- [ ] Verify no agent/LiteLLM references remain (grep litellm.yml,
      remotemcpserver.yaml, kagent agent configs)
- [ ] **Refine:** none expected; this shrinks Phases 3–8 surface

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
- Next lap: flip searxng + firecrawl clients (LiteLLM + RemoteMCPServers),
  or run the Decommission lap (osv / gofetch / mkp)
