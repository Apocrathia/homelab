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

### Environment Variables

| Variable                 | Value                                                 | Description                                            |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------------------ |
| `STREAMABLE_HTTP`        | `true`                                                | Enable streamable HTTP                                 |
| `MCP_SERVER_URL`         | `http://gitlab.mcp-gitlab.svc.cluster.local:8080`     | Allowed `/mcp` Host (cluster DNS; DNS-rebinding guard) |
| `REMOTE_AUTHORIZATION`   | `true`                                                | Require per-request GitLab token                       |
| `GITLAB_API_URL`         | `https://gitlab.com/api/v4`                           | GitLab API base                                        |
| `GITLAB_PERMISSION_MODE` | `modify`                                              | Allow create/update; block deletes                     |
| `GITLAB_TOOLSETS`        | `merge_requests,projects,issues,pipelines,repository` | Enabled tool groups                                    |

### Secrets

The 1Password item `gitlab-mcp-secrets` still holds `gitlab-token` (PAT with
`api`, `read_user`, `read_repository`). With remote authorization the MCP pod
does not mount that secret — kagent's `RemoteMCPServer` injects it as
`Private-Token` (see `agents/git/remotemcpserver.yaml` /
`agents/git/secret.yaml`). LiteLLM forwards `Private-Token` /
`Authorization` from the caller.

### Security

- Network: Cilium CCNP `mcp-server-isolation` gates ingress
- Auth: per-request GitLab PAT; no shared server-side token in the pod env

## References

- [zereight/gitlab-mcp](https://github.com/zereight/gitlab-mcp) — MCP server
- [GitLab API](https://docs.gitlab.com/ee/api/) — GitLab API documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) — Model Context Protocol
