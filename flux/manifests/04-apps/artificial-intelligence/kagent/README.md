# kagent

AI agent orchestration platform for managing and deploying AI agents in Kubernetes.

> **Navigation**: [← Back to AI README](../README.md)

## Documentation

- **[kagent Documentation](https://kagent.dev/docs)** - Primary documentation source
- **[GitHub Repository](https://github.com/kagent-dev/kagent)** - Source code and issues

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

Currently, kagent does not support cross-namespace agent calls. Currently, [kagent issue #841](https://github.com/kagent-dev/kagent/issues/841) is open to track this issue and [kagent pull request #1136](https://github.com/kagent-dev/kagent/pull/1136) is a potential fix. Ideally, each agent and tool should be in its own namespace. While it's not a strong security isolation mechanism on it's own, it enables us to use more granular network and RBAC policies.

Additionally, we are not using the kmcp feature of kagent due to the aforementioned issue. We are currently using the [ToolHive proxy](../mcp-servers/toolhive/README.md) to access MCP servers. However, this may change in the future if kagent supports cross-namespace agent calls.

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
