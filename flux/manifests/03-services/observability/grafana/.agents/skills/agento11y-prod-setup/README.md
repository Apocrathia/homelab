# agento11y-prod-setup — production eval and guardrails setup

Sets up production evaluation and guardrails for a deployed AI agent in Grafana
Agent Observability. Reads the agent's source and samples its live traffic via
gcx, then recommends only the missing online eval rules and guards. Entry point:
[`SKILL.md`](./SKILL.md).

Vendored byte-identical from
[github.com/grafana/gcx](https://github.com/grafana/gcx) v1.6.0 (commit
`9a29e9e0`); full pin and refresh procedure in [`../README.md`](../README.md).
Never edit — re-copy on refresh.

> **Navigation**: [← Back to Vendored gcx skills](../README.md)
