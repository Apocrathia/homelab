# GitLab MCP Server

The GitLab MCP server provides GitLab API integration through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [gitlab-mcp-server](https://github.com/Alosies/gitlab-mcp-server) - MCP server repository
- [GitLab API](https://docs.gitlab.com/ee/api/) - GitLab API documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

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
