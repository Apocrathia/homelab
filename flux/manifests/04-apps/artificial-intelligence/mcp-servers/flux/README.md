# Flux MCP Server

The Flux MCP server provides GitOps pipeline management through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Documentation

- [Flux MCP Server](https://fluxcd.control-plane.io/mcp/) - Official Flux MCP documentation
- [Flux CD](https://fluxcd.io/) - GitOps toolkit for Kubernetes
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation

## Overview

This deployment includes:

- Flux MCP server for GitOps pipeline management
- ToolHive proxy for secure communication
- Gateway API exposure at `https://mcp.gateway.services.apocrathia.com/flux`
- RBAC for Flux resource access

## Features

- **Cluster State Analysis**: Understand Flux installation status and resource configurations
- **Root Cause Analysis**: Correlate events, logs, and configuration changes
- **GitOps Automation**: Trigger reconciliations, suspend/resume resources
- **Visual Pipelines**: Generate diagrams of Flux dependencies and workflows

## Configuration

### RBAC

The deployment includes a dedicated ServiceAccount with ClusterRole permissions to:

- Read/patch Flux source resources (GitRepository, HelmRepository, etc.)
- Read/patch Flux reconciliation resources (Kustomization, HelmRelease)
- Read notification resources (Alerts, Providers, Receivers)
- Read core resources (pods, events, deployments)

### Resources

- **CPU**: 100m requests, 500m limits
- **Memory**: 128Mi requests, 512Mi limits
- **Network Access**: Required for in-cluster communication

### Security

- **Permission Profile**: Network access for Kubernetes API
- **Authentication**: In-cluster ServiceAccount

## MCP Client Configuration

### Via LiteLLM Gateway (Recommended)

```json
{
  "mcpServers": {
    "litellm": {
      "url": "https://ai.gateway.services.apocrathia.com/mcp/",
      "headers": {
        "x-litellm-api-key": "Bearer <litellm-master-key>"
      }
    }
  }
}
```

### Direct Access

For direct access to the Flux MCP server:

- **Server URL**: `https://mcp.gateway.services.apocrathia.com/flux`
- **Transport**: HTTP POST with JSON-RPC
- **Authentication**: None (uses in-cluster RBAC)

### Testing the Connection

```bash
# List available tools
curl -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  https://mcp.gateway.services.apocrathia.com/flux
```

## Available MCP Tools

The Flux MCP server provides these capabilities:

### Resource Management

- List and describe Flux resources (Kustomizations, HelmReleases, etc.)
- View resource status and conditions
- Check reconciliation state

### Operations

- Trigger reconciliation of specific resources
- Suspend and resume Flux resources
- View events and logs

### Analysis

- Analyze deployment failures
- Trace issues through the GitOps pipeline
- Generate dependency diagrams

For the complete list of tools, see the [official documentation](https://fluxcd.control-plane.io/mcp/tools/).
