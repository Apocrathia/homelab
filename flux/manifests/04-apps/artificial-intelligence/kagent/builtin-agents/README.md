# kagent built-in agents (vendored)

The seven agents the kagent 0.10.x chart shipped as subcharts (`k8s-agent`,
`promql-agent`, `observability-agent`, `helm-agent`, `cilium-policy-agent`,
`cilium-manager-agent`, `cilium-debug-agent`). The 1.0.1 chart dropped every
agent subchart, so the deployed 0.10.x definitions are vendored here as
`api.kagent.dev/v1alpha3` `AgentTemplate` + thin `Agent` pairs in the `kagent`
namespace — the same shape as `agents/investigator/`.

> **Navigation**: [← Back to kagent README](../README.md)

## Why they exist as files

`tools[].subAgent` is same-namespace-only in v1alpha3, and homelab-agent
delegates to `k8s-agent` and `observability-agent`. Vendoring keeps the
delegation edges the 0.10.x fleet had without re-adding chart subcharts.

## Provenance and fidelity

- Source: the deployed kagent 0.10.4 release (`helm get manifest kagent`),
  which is the subchart output rendered with our values — not the raw chart
  templates (helm conditionals already resolved).
- `systemPrompt` is the deployed `systemMessage` byte-preserved, except:
  trailing whitespace stripped where the 0.10.x text carried it
  (cilium-manager, cilium-policy), and one space→newline rewrap of the
  256+ character opening line on k8s/helm/observability (yamllint's 256 max
  under pre-commit `--strict`). No wording changed.
- `{{include "builtin/…"}}` template lines resolve against the chart-created
  `kagent-builtin-prompts` ConfigMap via `spec.promptTemplate.dataSources`.
- `a2aConfig.skills` is dropped: v1alpha3 synthesizes the AgentCard from the
  template description; the authorable skills input is gone upstream.
- `modelConfig` is the chart-created `default-model-config`.
- MCP tool bindings keep the subchart's tool lists against
  `kagent-tool-server` (chart-created RemoteMCPServer in this namespace).
  One deviation: observability-agent's Grafana binding targeted the chart's
  `grafana-mcp` subchart (removed in 1.0.1); it now binds `grafana-mcp`, the
  standalone mcp-grafana server whose RemoteMCPServer lives in this
  namespace (consolidated with home-agent), minus `get_datasource` (not
  served by mcp-grafana).
- observability-agent's `promql-agent` agent tool became a `subAgent`
  binding to the vendored `promql-agent` AgentTemplate.

## Agents

| Agent                                           | Purpose                                           |
| ----------------------------------------------- | ------------------------------------------------- |
| [k8s-agent](./k8s-agent/)                       | Kubernetes cluster operations and troubleshooting |
| [promql-agent](./promql-agent/)                 | PromQL query generation from natural language     |
| [observability-agent](./observability-agent/)   | Prometheus/Grafana monitoring and dashboards      |
| [helm-agent](./helm-agent/)                     | Helm release management and troubleshooting       |
| [cilium-policy-agent](./cilium-policy-agent/)   | CiliumNetworkPolicy authoring                     |
| [cilium-manager-agent](./cilium-manager-agent/) | Cilium install/config/monitoring                  |
| [cilium-debug-agent](./cilium-debug-agent/)     | Cilium debugging and diagnostics                  |

## References

- **[Agents README](../../agents/README.md)** — the custom fleet in the same namespace
- **[kagent-dev/kagent 0.10.4 subcharts](https://github.com/kagent-dev/kagent)** — upstream source of the vendored definitions
