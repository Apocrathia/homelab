# AI Agents

Declarative AI agents orchestrated by kagent.

> **Navigation**: [← Back to AI README](../README.md)

## Overview

Custom agents usually run in a dedicated `agent-*` namespace (for example `agent-git`, `agent-media`). The kagent controller and **system agents** (`k8s-agent`, `helm-agent`, etc.) stay in the `kagent` namespace. **`homelab-agent`** is an exception: it lives in `kagent` so it can use system agents as tools without cross-namespace restrictions; only the Discord bridge runs in `agent-homelab`.

**Custom Agents:**

- **[homelab](./homelab/)** - `homelab-agent`: Tech assistant for homelab topics (Discord interface; Agent CR in `kagent`, bridge in `agent-homelab`)
- **[search](./search/)** - `search-agent`: Web search specialist using SearXNG
- **[knowledge](./knowledge/)** - `knowledge-agent`: Knowledge management with OpenZIM and Qdrant
- **[infrastructure](./infrastructure/)** - `infrastructure-agent`: Proxmox, TrueNAS, UniFi management
- **[media](./media/)** - `media-agent`: Plex and Servarr (Sonarr/Radarr) management
- **[git](./git/)** - `git-agent`: GitHub and GitLab operations

**System Agents (managed by kagent helm chart):**

- `k8s-agent`: Kubernetes cluster operations and troubleshooting
- `helm-agent`: Helm release management
- `cilium-policy-agent`: Cilium network policy creation
- `cilium-manager-agent`: Cilium installation and management
- `cilium-debug-agent`: Cilium debugging and diagnostics
- `observability-agent`: Prometheus/Grafana monitoring
- `promql-agent`: PromQL query generation

## Architecture

Agents are defined using kagent's declarative Agent CRD, with optional bridge components for event-driven integrations.

### Current agent delegation graph

```mermaid
flowchart LR
    H[homelab-agent]
    K8S[k8s-agent]
    HELM[helm-agent]
    CILIUM_MGR[cilium-manager-agent]
    OBS[observability-agent]
    PROMQL[promql-agent]
    KNOW[knowledge-agent]
    SEARCH[search-agent]
    MEDIA[media-agent]
    INFRA[infrastructure-agent]
    GIT[git-agent]
    CILIUM_POLICY[cilium-policy-agent]
    CILIUM_DEBUG[cilium-debug-agent]

    H --> K8S
    H --> HELM
    H --> OBS
    H --> MEDIA
    H --> INFRA
    H --> GIT
    H --> KNOW

    INFRA --> CILIUM_MGR
    INFRA --> CILIUM_POLICY
    INFRA --> CILIUM_DEBUG

    KNOW --> SEARCH
    OBS --> PROMQL
```

## Adding New Agents

1. Create a new directory under `agents/`
2. Add a `Namespace` manifest (`agent-<name>`), `ModelConfig`, 1Password-backed secrets, and the `Agent` CRD in that namespace
3. Register the agent in LiteLLM `agent_list` with A2A URL `/api/a2a/<namespace>/<agent-name>`
4. Add any necessary bridge components for external integrations
5. Update this README with a link to the new agent

## Writing System Prompts

Good system prompts are critical for agent behavior. Follow the [kagent System Prompts Guide](https://kagent.dev/docs/kagent/getting-started/system-prompts) for best practices:

- **Operational Protocol** - Define step-by-step methodology for the agent
- **Tool Descriptions** - Include "Use this tool when..." with trigger phrases
- **Execution Guidelines** - Explicit behavioral rules and safety guidelines

Example structure:

```yaml
systemMessage: |
  You are a [role]. Your goal is to [purpose].

  Operational Protocol:
  1. [Step 1]
  2. [Step 2]

  Tools:
  1. tool_name
  Use when: [conditions]
  Trigger phrases: [examples]

  Execution Guidelines:
  - [Rule 1]
  - [Rule 2]
```

## Troubleshooting

```bash
# Custom agents in agent-* namespaces (repeat as needed)
kubectl get agents --namespace agent-git

# Controller, system agents, and homelab-agent
kubectl get agents --namespace kagent

kubectl logs --namespace kagent deployment/kagent-controller -f

kubectl get pods --namespace kagent -l app=a2a-gateway
```

## References

- **[kagent Documentation](https://kagent.dev/docs/)** - Agent orchestration documentation
- **[Agent CRD Reference](https://kagent.dev/docs/kagent/crds)** - Custom resource definitions
- **[System Prompts Guide](https://kagent.dev/docs/kagent/getting-started/system-prompts)** - Writing effective prompts
