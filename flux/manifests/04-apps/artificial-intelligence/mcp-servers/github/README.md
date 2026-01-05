# GitHub MCP Server

Self-hosted GitHub MCP server for repository and issue management.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- **[GitHub MCP Server](https://github.com/github/github-mcp-server)** - Official GitHub MCP server

## Access

Internal only via LiteLLM gateway - no external HTTPRoute.

### Client Configuration

```json
{
  "mcpServers": {
    "github": {
      "url": "https://ai.apocrathia.com/mcp/github"
    }
  }
}
```

## Available Tools

The server provides tools for:

- **Repository management**: Create, fork, search repositories
- **Branch operations**: Create branches, push files
- **Issues**: Create, update, search, comment on issues
- **Pull requests**: Create, merge, review, comment on PRs
- **Code search**: Search code across repositories
- **Users**: Search and get user information
- **Notifications**: List and manage notifications
- **Security advisories**: List and search advisories

### Dynamic Toolsets

This deployment uses `GITHUB_DYNAMIC_TOOLSETS=1` which enables dynamic tool discovery.
Instead of loading all tools at once, tools are discovered based on user prompts.

## Secrets

Requires 1Password item `github-mcp` in the Homelab vault with:

| Field          | Description                        |
| -------------- | ---------------------------------- |
| `github-token` | GitHub Personal Access Token (PAT) |

### Required Token Scopes

For full functionality, the PAT should have these scopes:

- `repo` - Full control of private repositories
- `read:org` - Read org membership
- `gist` - Create gists
- `read:user` - Read user profile data
- `notifications` - Access notifications
