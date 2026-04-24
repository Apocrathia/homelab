# GitHub MCP Server

Self-hosted GitHub MCP server for repository and issue management.

> **Navigation**: [← Back to MCP Servers README](../README.md)

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

### Eager Toolsets

This deployment sets `GITHUB_TOOLSETS` to a scoped, read-leaning list so every
tool in those toolsets is registered at startup. No `enable_toolset` runtime
indirection — agents see the full surface area immediately.

Currently registered toolsets:

- `context` — auth identity helpers
- `repos` — tags, releases, commits, file contents, branch listings
- `pull_requests` — list/read/search PRs
- `issues` — list/read/search issues
- `users` — user lookups

Write tools that ship inside these toolsets are still present at the server
level. Agents must restrict what they actually call via `toolNames` on their
`Agent` CR. The `git-agent` enumerates only read-side tools.

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

## Troubleshooting

```bash
# Pod status
kubectl get pods -n mcp-github

# MCP server logs
kubectl logs -n mcp-github deployment/github-mcp -c mcp -f

# Check health endpoint
kubectl exec -n mcp-github deployment/github-mcp -- curl -s localhost:8080/health
```

## References

- **[GitHub MCP Server](https://github.com/github/github-mcp-server)** - Official GitHub MCP server
