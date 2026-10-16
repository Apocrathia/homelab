# AGENTS.md — Grafana

Folder-scoped router for agents working on the homelab Grafana instance and
its surrounding tooling. Repo-wide routing starts at the root
[AGENTS.md](../../../../../AGENTS.md); this file scopes only this folder.
Module context lives under [`.agents/`](./.agents/README.md) — start at
[`.agents/skills/grafana-homelab/SKILL.md`](./.agents/skills/grafana-homelab/SKILL.md)
for non-trivial Grafana work.

## What lives here

The kube-prometheus-stack Grafana instance (v13, namespace `prometheus-system`)
managed by grafana-operator through CRs — `GrafanaDashboard`,
`GrafanaDatasource`, `GrafanaFolder`, `GrafanaAlertRuleGroup`,
`GrafanaServiceAccount` — plus ESO PushSecrets mirroring service-account tokens
to 1Password.

## Rules for agents working here

- **GitOps source of truth:** the CRs in this folder win. Live Grafana state is
  downstream of them; reconciling live state toward the manifests is normal,
  mutating live state away from them is not. Anything that changes live
  Grafana state needs operator approval.
- Dashboards/datasources as code go in their CRs here, not hand-edited through
  the Grafana UI (UI edits drift against this tree).
- Read the
  [`grafana-homelab` skill](./.agents/skills/grafana-homelab/SKILL.md)
  before touching service accounts, token sync, or alerting.

## gcx — the Grafana CLI

[gcx](https://github.com/grafana/gcx) is the sanctioned CLI for live Grafana
state (dashboards, alerting, SLO, metrics/logs/traces queries). It works with
any agentic harness.

Installation (once per machine):

```sh
brew install gcx   # or: curl -fsSL https://raw.githubusercontent.com/grafana/gcx/main/scripts/install.sh | sh
```

gcx bundles 24 workflow skills (dashboards, alerting, SLO, synthetic
monitoring, …). They live with the gcx binary, not this repo — read any
on demand with `gcx agent skills get <name>` (no installation needed).
Install them into `~/.agents/skills` (`gcx agent skills install --all`)
only if a machine wants them in every agent session.

Connect (self-hosted; token from the 1Password item `homelab-gcx-token`, see
the skill for the credential architecture):

```sh
gcx login homelab --server https://grafana.gateway.services.apocrathia.com
```

Agent mode: set `GCX_AGENT_MODE=1` for JSON output. Docs:
[gcx in Grafana docs](https://grafana.com/docs/grafana-cloud/as-code/observability-as-code/grafana-cli/).
