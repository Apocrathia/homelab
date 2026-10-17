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

The 24 gcx workflow skills (dashboards, alerting, SLO, synthetic
monitoring, …) are vendored byte-identical into
[`.agents/skills/`](./.agents/skills/README.md) from gcx v1.6.0 — agents
working this folder read them there. Any live gcx install can also read
them from the binary (`gcx agent skills get <name>`), and machine-wide
installation (`gcx agent skills install --all`) is optional for other
hosts. Vendoring refresh procedure lives in the skills README.

Connect (self-hosted; token from the 1Password item `homelab-gcx-token`, see
the skill for the credential architecture):

```sh
gcx login homelab --server https://grafana.gateway.services.apocrathia.com
```

Agent mode: set `GCX_AGENT_MODE=1` for JSON output. Docs:
[gcx in Grafana docs](https://grafana.com/docs/grafana-cloud/as-code/observability-as-code/grafana-cli/).
