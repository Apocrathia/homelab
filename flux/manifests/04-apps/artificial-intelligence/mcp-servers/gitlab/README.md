# GitLab MCP Server

The GitLab MCP server provides GitLab API integration through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

During the kmcp migration, this namespace runs ToolHive `gitlab-mcp-server`
(`mcpserver.yaml`) and kmcp `gitlab` (`mcpserver-kmcp.yaml`) side by side. The
kmcp endpoint is `http://gitlab.mcp-gitlab.svc.cluster.local:8080/mcp`;
ToolHive remains available for rollback during soak.

## Overview

This deployment includes:

- GitLab MCP server for GitLab operations
- ToolHive proxy for secure communication
- Internal access only via LiteLLM proxy

## Configuration

### Transport

This server uses `transport: stdio` with `proxyMode: streamable-http`. The ToolHive proxy handles HTTP/session management while the MCP server runs in stdio mode.

### Environment Variables

| Variable           | Source | Description                                         |
| ------------------ | ------ | --------------------------------------------------- |
| `NPM_CONFIG_TOKEN` | Secret | GitLab Personal Access Token                        |
| `GITLAB_API_URL`   | Config | GitLab API URL (default: https://gitlab.com/api/v4) |

### Secrets

Create a Kubernetes secret `gitlab-mcp-secrets` in the `mcp-gitlab` namespace with:

- `gitlab-token`: GitLab Personal Access Token with `api`, `read_user`, and `read_repository` scopes

kmcp `secretRefs` injects every Secret key as an environment variable and cannot
rename individual keys. The existing `gitlab-token` key is mounted read-only and
exported as `NPM_CONFIG_TOKEN` by the kmcp startup command, preserving the
ToolHive `secretKeyRef` mapping without changing the OnePassword item.

### Security

- **Permission Profile**: Network access for GitLab API
- **Authentication**: GitLab PAT via Kubernetes secrets

## Available MCP Tools

The GitLab MCP server provides tools for GitLab operations:

1. **Project Management** - List, create, fork repositories
2. **Issue Management** - Create, list, get issues
3. **Merge Requests** - Create, list, comment on merge requests
4. **File Operations** - Read, create, update files
5. **Branch Management** - Create and manage branches

## References

- [gitlab-mcp-server](https://github.com/Alosies/gitlab-mcp-server) - MCP server repository
- [GitLab API](https://docs.gitlab.com/ee/api/) - GitLab API documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation
