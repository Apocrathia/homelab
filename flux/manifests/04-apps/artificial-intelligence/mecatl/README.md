# Mecatl

[← Back to Artificial Intelligence](../README.md)

[Mecatl](https://github.com/stacklok/mecatl) is a provider-agnostic, headless agentic coding harness (Go) running as storage-free Kubernetes pods. Deployed as an experiment: a dedicated coding-agent lane separate from kagent's ops agents and Hermes's assistant role.

## Architecture

- **mecak8s pods**: stateless agent compute (1 replica), gRPC :8080 + HTTP/SSE :8081
- **State**: dedicated mecatl-valkey (Redis protocol) - session snapshots, event streams, virtual filesystem
- **Coordination**: Kubernetes Leases (chart ships its own RBAC)
- **Models**: cluster LiteLLM via OpenAI-compatible endpoint (`glm-5.2-prime` default)
- **MCP**: streaming-HTTP only; kmcp servers reachable in-cluster (none wired yet)
- **Posture**: strict - read-only calls allowed, mutating calls denied until pre-configured

## Interacting

mecak8s is headless (gRPC/HTTP). Drive it from a local `mecatui` client pointed at the service, or embed the engine. No web UI.

```bash
# From a machine with mecatui installed and tailnet access:
mecatui connect mecatl.mecatl.svc.cluster.local:8080
```

## Configuration

- **Agents**: defined as Markdown files with YAML frontmatter (name, tools, model, permissionMode, maxTurns)
- **Secrets** (1Password, single item `mecatl-secrets`):
  - `litellm-api-key` (LiteLLM virtual key), future MCP tokens as `mcp-<server>-token`
  - `valkey-password` (Valkey auth for mecatl-valkey)
- **Model routing**: `defaultProvider`/`model` in the HelmRelease; per-session overrides via the API
- **MCP servers**: add entries under `mcp.servers` in the HelmRelease

## Troubleshooting

```bash
kubectl get pods -n mecatl
kubectl logs -n mecatl -l app.kubernetes.io/name=mecatl
kubectl logs -n mecatl mecatl-valkey-0
# Valkey health:
kubectl exec -n mecatl mecatl-valkey-0 -- valkey-cli -a $(kubectl get secret -n mecatl mecatl-valkey-secrets -o jsonpath='{.data.password}' | base64 -d) ping
```
