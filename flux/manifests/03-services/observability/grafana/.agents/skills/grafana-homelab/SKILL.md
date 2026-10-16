---
name: grafana-homelab
description: >
  State and tooling for the homelab Grafana instance (kube-prometheus-stack,
  v13, ns prometheus-system, managed by grafana-operator CRs) and the gcx CLI
  that reads/writes its live state. Use for any task touching this folder's
  Grafana CRs, service accounts, token-to-1Password sync, alerting, or live
  Grafana operations via gcx. Install gcx and its 24 workflow skills first if
  not present (see ../AGENTS.md).
---

# Homelab Grafana + gcx

## The instance

- kube-prometheus-stack Grafana **v13**, namespace `prometheus-system`,
  managed by grafana-operator via the CRs in this folder (dashboards,
  datasources, folders, alert rule groups, service accounts).
- URLs: gateway `https://grafana.gateway.services.apocrathia.com` (Authentik
  fronted; `/api*` path regex is exempt from interception, which is what lets
  gcx's Kubernetes-style API probes at `/apis` through); in-cluster
  `http://kube-prometheus-stack-grafana.prometheus-system.svc.cluster.local:80`.
- **GitOps constraint:** the CRs here are the source of truth. gcx reads live
  state freely; anything that writes live Grafana state needs operator
  approval, and reconciling live state back toward the manifests is the normal
  repair path.

## gcx usage

- Agent mode: `GCX_AGENT_MODE=1` (or `--agent`) for compact JSON, no color, no
  truncation. Discovery: `gcx help-tree --depth 1 -o text` → drill →
  `gcx <group> <sub> --help`. Never guess commands.
- Outputs >100 KiB spill to `$TMPDIR/gcx-results-*.json` with a
  `gcx.spill_reference` receipt on stdout (`spilled_to`, `preview_sample`); the
  hint banner goes to stderr.
- Destructive commands fail in agent mode unless `--force` (or
  `GCX_AUTO_APPROVE`); `resources push` is idempotent.
- gcx bundles 24 workflow skills (dashboards, alerting, SLO, synthetic
  monitoring); consult the matching one before non-trivial live Grafana work —
  read on demand with `gcx agent skills get <name>` (installation details in
  [../AGENTS.md](../../../AGENTS.md)).

## Service accounts and token architecture

- Credentials resolve from the runtime environment — no single prescribed
  source. Valid shapes: `GRAFANA_TOKEN` (+ `GRAFANA_SERVER`) env vars; a saved
  gcx context (macOS: `gcx login` stores the token in the OS keychain, config
  holds only a reference); in-cluster, a k8s Secret's token in env vars.
- Two GrafanaServiceAccounts exist here: `mcp-server` (Admin, for the Grafana
  MCP server) and `gcx` (Editor — least privilege; the paste source for
  `gcx login` on laptops). grafana-operator writes each token to a k8s Secret
  in `prometheus-system` (`mcp-server-token`, `gcx-token`).
- ESO PushSecrets mirror both tokens to 1Password: `push-secret-mcp.yaml`
  (Secret `mcp-server-token` → item `grafana-mcp-service-account`) and
  `push-secret-gcx.yaml` (Secret `gcx-token` → item `homelab-gcx-token`),
  vault `Secrets`, field `token`, refresh `168h`. The gcx item is pre-created
  `API_CREDENTIAL` (the PushSecret create path would hardcode `SERVER`; the
  update path preserves category).
- **Bump mechanics (why 168h):** ESO v2.12 PushSecret PUTs the provider item
  on every reconcile even when the value is unchanged, which bumps the item
  `updatedAt` in 1Password — the refresh interval IS the bump frequency.
  Tokens rotate rarely; convergence is ≤7 days and a stale vault token fails
  closed (401 in gcx) and heals on the next tick. Diagnostic: 401s from a
  previously-working credential usually mean rotation staleness, not an ACL
  problem.
