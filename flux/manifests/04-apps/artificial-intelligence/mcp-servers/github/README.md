# GitHub MCP Server

The GitHub MCP server provides comprehensive GitHub integration through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [GitHub MCP Server](https://github.com/github/github-mcp-server) - Official GitHub MCP server
- [GitHub API](https://docs.github.com/en/rest) - GitHub REST API documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

## Overview

This deployment includes:

- GitHub MCP server for repository and issue management
- ToolHive proxy for stdio-to-HTTP translation
- Gateway API exposure at `https://mcp.gateway.services.apocrathia.com/github`
- Header forwarding for per-request authentication

## Configuration

### Authentication

The GitHub MCP server supports per-request authentication via the `Authorization` header. No environment variables are needed - clients pass their GitHub Personal Access Token through LiteLLM.

### Resources

- **CPU**: 100m requests, 200m limits
- **Memory**: 128Mi requests, 256Mi limits
- **Network Access**: Required for GitHub API

### Security

- **Permission Profile**: Network access for GitHub API
- **Authentication**: Bearer token via `Authorization` header

## MCP Client Configuration

### Via LiteLLM Gateway (Recommended)

Configure your client to pass the GitHub PAT through LiteLLM:

```json
{
  "mcpServers": {
    "litellm": {
      "url": "https://ai.gateway.services.apocrathia.com/mcp/",
      "headers": {
        "x-litellm-api-key": "Bearer <litellm-master-key>",
        "x-mcp-github-authorization": "Bearer <github-pat>"
      }
    }
  }
}
```

### Creating a GitHub PAT

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)** or **Fine-grained tokens**
3. Select required scopes:
   - `repo` - Full control of private repositories
   - `read:org` - Read organization membership
   - `read:user` - Read user profile data
4. Generate and copy the token

### Direct Access

For direct access to the GitHub MCP server:

- **Server URL**: `https://mcp.gateway.services.apocrathia.com/github`
- **Transport**: HTTP POST with JSON-RPC
- **Authentication**: `Authorization: Bearer <github-pat>` header

### Testing the Connection

```bash
# List available tools (requires auth)
curl -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <github-pat>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  https://mcp.gateway.services.apocrathia.com/github
```

## Available MCP Tools

The GitHub MCP server provides extensive tooling organized by category:

### Repository Operations

- List repositories, branches, commits
- Get file contents and directory listings
- Search code and repositories

### Issues & Pull Requests

- Create, update, and close issues
- Create and manage pull requests
- Add comments and reviews

### Actions & Workflows

- List and trigger workflows
- View workflow runs and logs

### And More

- Organization management
- User operations
- Gist management
- Release management

For the complete list of tools, see the [official documentation](https://github.com/github/github-mcp-server#tools).
