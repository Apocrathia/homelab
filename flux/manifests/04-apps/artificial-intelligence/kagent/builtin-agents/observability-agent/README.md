# observability-agent

Prometheus/Grafana monitoring, dashboards, and incidents. Binds `kagent-tool-server` (read-only k8s tools) and `grafana-mcp` (standalone mcp-grafana server). The 0.10.x `promql-agent` subAgent is not carried over: kagent 1.0.1 forbids subAgent tools on templates shared with other agents, and homelab-agent binds this template (homelab-agent binds `promql-agent` directly).

Vendored from the kagent 0.10.4 chart subchart; see the
[builtin-agents README](../README.md) for provenance and fidelity notes.

> **Navigation**: [← Back to builtin-agents README](../README.md)
