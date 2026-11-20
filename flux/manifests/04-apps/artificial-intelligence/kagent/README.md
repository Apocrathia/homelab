# kagent

> **Navigation**: [← Back to AI README](../README.md)

## Overview

Agent orchestration platform for Kubernetes. kagent 1.0.1 pairs with
substrate 1.0.1: all Agents run on Substrate via namespace-local Harnesses
(no more per-agent Deployments).

## Components

- **Controller**: watches `api.kagent.dev/v1alpha3` CRs (Agent, AgentTemplate,
  Harness, ModelConfig, RemoteMCPServer, EgressPolicy, SandboxTemplate) and
  compiles Agents into substrate ActorTemplates
- **UI**: Web interface for agent management and interaction
- **A2A Gateway**: Routes Agent-to-Agent protocol communication
- **kmcp** (../kmcp/): MCPServer CRD + controller, split out of kagent-crds
- **WorkerPool**: `kagent-default` (replicas 4) serves the whole consolidated
  agent fleet — every Agent, custom and vendored, runs in this namespace
- **builtin-agents** (./builtin-agents/): the seven 0.10.x chart subchart
  agents vendored as AgentTemplate + thin Agent pairs

## Configuration

- **LLM Provider**: LiteLLM proxy (OpenAI-compatible), via `providers.openAI`
- **Database**: existing CNPG `kagent-postgres`; both the owner and
  read/write logins reuse the bootstrap `kagent` user through
  `kagent-secrets/postgres-url` (roles set to `kagent` — no DB role split)
- **Substrate**: `config.substrate` endpoints (chart defaults, explicit for
  visibility) + `controller.substrateClientCertificate.enabled` (pod-identity
  mTLS)
- **Harnesses**: chart-created `kagent-default` (Go ADK); codex/claude off
- **Telemetry**: controller OTLP logs to Alloy (`config.telemetry.logs`)

## Caveats

The whole agent fleet runs in this namespace (v1alpha3 agent-tools are
namespace-local, so delegation requires same-namespace AgentTemplates — the
`agent-*` namespaces are gone except the two bridge hosts). Delegation and
A2A use `/api/a2a/{namespace}/{agent-name}`. The namespace carries PSA
privileged labels because substrate worker pods run here.

We host in-cluster MCP servers with kmcp (`mcpserver.kagent.dev`) under
`../mcp-servers/`. Agents reach them via `RemoteMCPServer` URLs that point at
the CR-named Service (`http://{name}.mcp-{name}.svc.cluster.local:8080/mcp`).

## Rollout (0.10.x -> 1.0.x)

kagent 1.0 renamed its API group (`kagent.dev` -> `api.kagent.dev`): the
kagent-crds upgrade deletes the old CRDs (garbage-collecting the v1alpha2
fleet with them) and this repo re-creates every CR at v1alpha3 — a bounded
fleet outage between the CRD swap and substrate convergence. The
substrate-side `storedVersions` unblock and the full merge-time sequence
live in
[kagent-substrate-1.0-rollout.md](../../../../../docs/plans/kagent-substrate-1.0-rollout.md).

## Access

UI available at: `https://kagent.gateway.services.apocrathia.com`

## 1Password Secret

`kagent-secrets` in the Secrets vault (unchanged from 0.10.x):

| Field             | Description                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| `username`        | PostgreSQL username (`kagent`)                                                  |
| `password`        | PostgreSQL password                                                             |
| `postgres-url`    | Full PostgreSQL URL — serves BOTH the owner and read/write chart secretRefs now |
| `litellm-api-key` | API key for LiteLLM access                                                      |

## Adding Agents

Follow `agents/README.md` ("Adding New Agents"): AgentTemplate + thin Agent +
ModelConfig in this namespace; the chart-created Harness and the shared
`kagent-default` WorkerPool already exist here.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n kagent

# Controller logs
kubectl logs -n kagent deployment/kagent-controller -f

# Check Agent CRs
kubectl get agents --all-namespaces

# Check the compiled sandbox state
kubectl get sandboxtemplates -A

# Worker pools
kubectl get workerpool -A

# Check database connectivity
kubectl exec -n kagent deployment/kagent-controller --   pg_isready -h kagent-postgres-rw.kagent.svc.cluster.local -U kagent
```

## References

- **[kagent Documentation](https://kagent.dev/docs)** - Primary documentation source
- **[GitHub Repository](https://github.com/kagent-dev/kagent)** - Source code and issues
