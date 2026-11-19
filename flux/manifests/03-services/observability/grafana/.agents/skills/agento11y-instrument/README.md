# agento11y-instrument — instrument an LLM app for Agent Observability

Instruments an LLM app or agent to send generations and agentic workflow to
Grafana Agent Observability via the Agent Observability SDKs. Verifies with gcx
that data actually lands, iterating instrument, run, verify, fix. Entry point:
[`SKILL.md`](./SKILL.md).

Vendored byte-identical from
[github.com/grafana/gcx](https://github.com/grafana/gcx) v1.6.0 (commit
`9a29e9e0`); full pin and refresh procedure in [`../README.md`](../README.md).
Never edit — re-copy on refresh.

> **Navigation**: [← Back to Vendored gcx skills](../README.md)
