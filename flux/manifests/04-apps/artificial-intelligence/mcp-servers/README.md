# MCP Servers

Model Context Protocol servers providing specialized functionality for AI clients.

> **Navigation**: [← Back to AI README](../README.md)

## Documentation

- **[ToolHive Documentation](https://docs.stacklok.com/toolhive/)** - Primary documentation source
- **[MCP Specification](https://spec.modelcontextprotocol.io/)** - Protocol specification

## Overview

All MCP servers are internal-only and accessible exclusively through the LiteLLM proxy. This provides:

- Unified authentication and access control
- Centralized logging and observability
- Simplified client configuration

## Architecture

```
External Clients → LiteLLM Proxy → MCP Servers (internal)
```

Clients connect to LiteLLM at `https://litellm.gateway.services.apocrathia.com` which routes requests to the appropriate MCP server.

## Internal MCP Servers

### OSV Vulnerability Scanner

- **Purpose**: Query Open Source Vulnerability database for security vulnerabilities
- **Tools**: Vulnerability queries, batch scanning, detailed vulnerability information

### GoFetch Web Content Server

- **Purpose**: Retrieve and process web content from URLs
- **Tools**: Web content fetching, markdown conversion, content extraction

### MKP Kubernetes Server

- **Purpose**: Direct Kubernetes cluster access and management
- **Tools**: Resource listing, getting, applying, and pod execution

### Grafana MCP Server

- **Purpose**: Grafana dashboard and data source management
- **Tools**: Dashboard operations, Prometheus queries, Loki log analysis, alert management

### SearXNG MCP Server

- **Purpose**: Privacy-respecting web search via internal SearXNG instance
- **Tools**: Web search with pagination, URL content reading

### Flux MCP Server

- **Purpose**: GitOps pipeline management and Flux resource operations
- **Tools**: Resource listing, reconciliation triggers, status analysis

### OpenZIM MCP Server

- **Purpose**: Offline knowledge base queries (Wikipedia, etc.)
- **Tools**: ZIM file content search and retrieval

### UniFi Network MCP Server

- **Purpose**: UniFi network device management
- **Tools**: Device listing, client management, network configuration

### GitLab MCP Server

- **Purpose**: GitLab repository and issue management
- **Tools**: Repository operations, issues, merge requests, pipelines

### Servarr MCP Server

- **Purpose**: Sonarr and Radarr media management
- **Tools**: Media search, queue management, library operations

### Plex MCP Server

- **Purpose**: Plex Media Server integration
- **Tools**: Library browsing, media playback control, user management

### TrueNAS MCP Server

- **Purpose**: TrueNAS Core/SCALE storage management
- **Tools**: Pool status, dataset operations, snapshot management

### Proxmox MCP Server

- **Purpose**: Proxmox virtualization management
- **Tools**: VM/container operations, resource monitoring, cluster management

### Firecrawl MCP Server

- **Purpose**: Web scraping and content extraction
- **Tools**: Page scraping, content extraction, site crawling

### A2A MCP Server

- **Purpose**: Bridge between MCP and Agent-to-Agent protocol
- **Tools**: Agent registration, message routing, task delegation

## External MCP Servers (via LiteLLM)

### GitHub MCP Server

- **Purpose**: GitHub repository and issue management
- **Tools**: Repository operations, issues, pull requests, actions, releases
- **Auth**: Pass GitHub PAT via `Authorization` header (requires Copilot subscription)

### DeepWiki

- **Purpose**: AI-powered documentation for GitHub repositories
- **Tools**: Wiki structure, content reading, question answering

### Home Assistant

- **Purpose**: Home automation control and status
- **Tools**: Device control, automation triggers, state queries

## Security Considerations

- **Network Isolation**: Each server runs in its own namespace with Cilium network policy
- **Minimal Permissions**: ToolHive operator creates least-privilege RBAC
- **Internal Access Only**: No direct external access to MCP servers
- **Centralized Auth**: All access through LiteLLM proxy

### Network Policy

MCP servers are protected by a `CiliumClusterwideNetworkPolicy` that restricts ingress:

- **Target**: Namespaces with `mcp-server: "true"` label
- **Allowed Sources**: Namespaces with `mcp-client: "true"` label (litellm, kagent)
- **System Access**: kube-system and toolhive-system are allowed for health checks and operator management

To allow a new namespace to access MCP servers, add the label:

```yaml
metadata:
  labels:
    mcp-client: "true"
```

## Troubleshooting

### Common Issues

1. **Server Deployment Issues**

   ```bash
   # View all MCP servers
   kubectl get mcpservers --all-namespaces

   # Check specific server
   kubectl get mcpserver <name> -n <namespace>

   # Check operator status
   kubectl get pods -n toolhive-system
   ```

2. **LiteLLM Routing Issues**

   ```bash
   # Check LiteLLM pod logs
   kubectl logs -n litellm deploy/litellm

   # Verify MCP server service exists
   kubectl get svc -n mcp-<server>
   ```

### Health Checks

```bash
# Check ToolHive operator
kubectl get pods -n toolhive-system

# Check MCP server deployments
kubectl get mcpservers --all-namespaces

# Check services
kubectl get svc --all-namespaces | grep mcp-
```
