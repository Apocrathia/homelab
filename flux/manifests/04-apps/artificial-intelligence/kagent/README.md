# kagent

AI agent orchestration platform for managing and deploying AI agents in Kubernetes.

> **Navigation**: [← Back to AI README](../README.md)

## Components

- **Controller**: Watches Agent CRDs and manages agent deployments
- **UI**: Web interface for agent management and interaction
- **A2A Gateway**: Routes Agent-to-Agent protocol communication
- **CRDs**: Agent, ModelConfig, RemoteMCPServer, ToolServer

## Configuration

- **LLM Provider**: LiteLLM proxy (OpenAI-compatible)
- **Database**: PostgreSQL via CNPG
- **Authentication**: Authentik proxy (kagent has no native OIDC)
- **Built-in Agents**: All disabled - agents deployed separately

## Caveats

Most custom agents run in dedicated `agent-*` namespaces; the controller and system agents (`k8s-agent`, `helm-agent`, etc.) stay in `kagent`. `homelab-agent` is deployed in `kagent` so its `Agent` tools can reference system agents in the same namespace (the controller rejects `agent-*` → `kagent` tool references). Delegation and A2A use `/api/a2a/{namespace}/{agent-name}`. See [kagent issue #841](https://github.com/kagent-dev/kagent/issues/841) for upstream discussion.

We use [ToolHive proxy](../mcp-servers/toolhive/README.md) for MCP servers where `RemoteMCPServer` references are enough, instead of kmcp.

## Access

UI available at: `https://kagent.gateway.services.apocrathia.com`

## 1Password Secret

Create `kagent-secrets` in the Secrets vault with:

| Field             | Description                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| `username`        | PostgreSQL username (`kagent`)                                                                            |
| `password`        | PostgreSQL password                                                                                       |
| `postgres-url`    | Full PostgreSQL URL: `postgres://kagent:PASSWORD@kagent-postgres-rw.kagent.svc.cluster.local:5432/kagent` |
| `litellm-api-key` | API key for LiteLLM access                                                                                |

Note: The `postgres-url` should contain the actual password, not a placeholder.

## Adding Agents

To add an agent namespace for kagent to watch, update `helmrelease.yaml`:

```yaml
controller:
  watchNamespaces:
    - agents
    - my-agent-namespace
```

Then create Agent CRDs in those namespaces.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n kagent

# Controller logs
kubectl logs -n kagent deployment/kagent-controller -f

# A2A Gateway logs
kubectl logs -n kagent deployment/kagent-a2a -f

# Check Agent CRDs
kubectl get agents --all-namespaces

# Check database connectivity
kubectl exec -n kagent deployment/kagent-controller -- \
  pg_isready -h kagent-postgres-rw.kagent.svc.cluster.local -U kagent
```

## References

- **[kagent Documentation](https://kagent.dev/docs)** - Primary documentation source
- **[GitHub Repository](https://github.com/kagent-dev/kagent)** - Source code and issues
