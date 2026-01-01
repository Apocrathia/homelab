# Grafana MCP Server

This directory contains the deployment configuration for the Grafana MCP (Model Context Protocol) server, which enables AI assistants to interact with Grafana instances through a standardized protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Overview

The Grafana MCP server provides a bridge between AI assistants and Grafana's ecosystem, allowing for:

- Dashboard management and retrieval
- Data source configuration and querying
- Prometheus metrics querying
- Loki log analysis
- Incident management
- OnCall schedule management
- Alert rule management
- And much more

## Architecture

The deployment uses the Toolhive MCPServer pattern and includes:

- **Namespace**: `mcp-grafana` for isolation
- **Transport**: stdio with streamable-http proxy
- **Access**: Internal only via LiteLLM proxy
- **Security**: Non-root containers, network policy restricted

## Prerequisites

### Grafana Service Account Token

**Important**: Grafana service accounts cannot be provisioned via YAML files. They must be created manually through the Grafana UI or HTTP API.

You'll need to create a Grafana service account and generate a token for authentication.

**Step 1: Create Service Account**

1. Go to your Grafana instance: `https://grafana.gateway.services.apocrathia.com`
2. Navigate to **Administration** → **Users and access** → **Service accounts**
3. Click **Add service account**
4. Set:
   - **Display name**: `mcp-server`
   - **Role**: `Admin` (or appropriate permissions for your use case)
5. Click **Create**

**Step 2: Generate Token**

1. Select the `mcp-server` service account from the list
2. Click **Add service account token**
3. Set:
   - **Name**: `mcp-server-token`
   - **Expiration**: Set appropriate expiration or choose "No expiration"
4. Click **Generate token**
5. Copy the generated token (it will only be shown once)

**Step 3: Store in 1Password**
Store the token in the 1Password item referenced by the secret.

## Deployment

The deployment is managed by Flux and will be automatically applied when committed to the repository.

### Manual Deployment (if needed)

```bash
# Apply all resources
kubectl apply -k .
```

## Configuration

### Access

The server is accessible only through LiteLLM proxy:

- **Internal**: `mcp-grafana-mcp-proxy.mcp-grafana.svc.cluster.local:8080/mcp`
- **Via LiteLLM**: Configured in `litellm.yml` as `grafana` MCP server

### Available Tools

The MCP server provides access to these tool categories:

- **Search**: Find dashboards and resources
- **Dashboard**: Retrieve, create, and update dashboards
- **Datasource**: Manage data source configurations
- **Prometheus**: Query metrics and metadata
- **Loki**: Search and analyze logs
- **Incident**: Manage Grafana Incident workflows
- **OnCall**: Handle on-call schedules and users
- **Alerting**: Manage alert rules and contact points
- **Admin**: Administrative operations

## Monitoring

### Health Checks

The deployment includes health checks:

- **Liveness Probe**: `/health` endpoint
- **Readiness Probe**: `/ready` endpoint

### Logs

View server logs:

```bash
kubectl logs -n mcp-grafana grafana-mcp-0 -c mcp
```

### Metrics

The server exposes Prometheus metrics on the `/metrics` endpoint for monitoring.

## Security

### Network Policies

The deployment runs in an isolated namespace with:

- Non-root containers
- Read-only root filesystem
- Dropped capabilities
- Resource limits

### Authentication

- API key authentication via HTTP headers
- No direct database access
- Proxy authentication through Grafana

## Resources

- [Grafana MCP Documentation](https://deepwiki.com/grafana/mcp-grafana)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Grafana API Documentation](https://grafana.com/docs/grafana/latest/developers/http_api/)
- [Toolhive MCPServer Documentation](https://github.com/stacklok/toolhive)
