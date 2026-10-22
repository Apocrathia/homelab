# GitLab MCP Server

GitLab API integration via Model Context Protocol (native streamable HTTP).

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Overview

- kmcp `MCPServer` (`gitlab`) running `zereight050/gitlab-mcp` with native
  streamable-http on `/mcp`
- Callers authenticate per-request with a GitLab PAT (`Private-Token` or
  `Authorization: Bearer`) — no server-side env PAT
- Internal access only (LiteLLM / kagent); no Gateway HTTPRoute

**Endpoint:** `http://gitlab.mcp-gitlab.svc.cluster.local:8080/mcp`

## Configuration

### Transport

`transportType: http` — native streamable-http (`STREAMABLE_HTTP=true`,
`REMOTE_AUTHORIZATION=true`). Prefer this over stdio/agentgateway for
concurrency; stdio session leaks under Renovate change-summary load.

Sessions are multi-pod safe: with 3 replicas and upstream's default per-pod
in-memory session state, a request landing on the wrong pod 404s its session
(the mr-change-summary failures). `OAUTH_STATELESS_MODE=true` seals session
identity into the `Mcp-Session-Id` header instead, so any replica can serve
any session.

### Environment Variables

| Variable                 | Value                                                   | Description                                            |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| `STREAMABLE_HTTP`        | `true`                                                  | Enable streamable HTTP                                 |
| `OAUTH_STATELESS_MODE`   | `true`                                                  | Stateless multi-pod-safe sessions                      |
| `MCP_SERVER_URL`         | `http://gitlab.mcp-gitlab.svc.cluster.local:8080`       | Allowed `/mcp` Host (cluster DNS; DNS-rebinding guard) |
| `REMOTE_AUTHORIZATION`   | `true`                                                  | Require per-request GitLab token                       |
| `GITLAB_API_URL`         | `https://gitlab.com/api/v4`                             | GitLab API base                                        |
| `GITLAB_PERMISSION_MODE` | `modify`                                                | Allow create/update; block deletes                     |
| `GITLAB_TOOLSETS`        | `merge_requests,projects,issues,pipelines,repositories` | Enabled tool groups                                    |

### Secrets

The 1Password item `gitlab-mcp-secrets` holds `gitlab-token` (PAT with `api`,
`read_user`, `read_repository`) and `OAUTH_STATELESS_SECRET` (base64url key
that seals session headers). The pod mounts ONLY the `OAUTH_STATELESS_SECRET`
field — a subPath file-mount in `mcpserver.yaml`, read by the `sh -c` wrapper
— so `gitlab-token` is never exposed to the pod. With remote authorization,
kagent's `RemoteMCPServer` injects the PAT as `Private-Token` (see
`agents/git/remotemcpserver.yaml` / `agents/git/secret.yaml`). LiteLLM
forwards `Private-Token` / `Authorization` from the caller.

### Security

- Network: Cilium CCNP `mcp-server-isolation` gates ingress
- Auth: per-request GitLab PAT; no shared server-side token in the pod env

## References

- [zereight/gitlab-mcp](https://github.com/zereight/gitlab-mcp) — MCP server
- [GitLab API](https://docs.gitlab.com/ee/api/) — GitLab API documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) — Model Context Protocol
