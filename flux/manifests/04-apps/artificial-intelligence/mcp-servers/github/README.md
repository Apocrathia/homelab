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

## Transport

Native `streamable-http` via the image `http` subcommand (stateless MCP
sessions). ToolHive fronts the pod on port 8080; clients use the proxy URL
`http://mcp-github-mcp-server-proxy.mcp-github.svc.cluster.local:8080/mcp`.

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

Toolsets are passed as `--toolsets` on the `http` command so every tool in
those sets is registered at startup. No `enable_toolset` runtime indirection —
agents see the full surface area immediately.

Currently registered toolsets:

- `context` — auth identity helpers
- `repos` — tags, releases, commits, file contents, branch listings
- `pull_requests` — list/read/search PRs
- `issues` — list/read/search issues
- `users` — user lookups

Write tools that ship inside these toolsets are still present at the server
level. Agents must restrict what they actually call via `toolNames` on their
`Agent` CR. The `git-agent` enumerates only read-side tools.

## Auth

This server holds **no** GitHub credentials. Native HTTP mode requires every
client to send `Authorization: Bearer <token>`; missing or invalid auth is 401. Do not reintroduce a process-level PAT on the MCP pod — that turns
ClusterIP reachability into an open GitHub proxy.

Client wiring (kagent `RemoteMCPServer` `headersFrom`, LiteLLM
`static_headers`) lives with the callers. The shared vault item is
`vaults/Secrets/items/github-mcp-secrets`:

| Field           | Description                                                    |
| --------------- | -------------------------------------------------------------- |
| `authorization` | PAT **including the `Bearer ` prefix** (e.g. `Bearer ghp_...`) |

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

# MCP server logs (container name is mcp)
kubectl logs -n mcp-github -l app.kubernetes.io/name=github-mcp-server -c mcp -f

# Proxy reachability from inside the cluster
kubectl run -n mcp-github --rm -it --restart=Never curl --image=curlimages/curl -- \
  curl -sS -o /dev/null -w '%{http_code}\n' \
  http://mcp-github-mcp-server-proxy.mcp-github.svc.cluster.local:8080/mcp
```

## References

- **[GitHub MCP Server](https://github.com/github/github-mcp-server)** - Official GitHub MCP server
