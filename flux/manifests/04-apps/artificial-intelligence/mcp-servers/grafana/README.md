# Grafana MCP Server

MCP server enabling AI assistants to interact with Grafana instances through a standardized protocol.

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

- **Namespace**: `mcp-grafana` for isolation
- **Transport**: `transportType: http` — native streamable HTTP on port 8080
- **Access**: Internal only via LiteLLM proxy
- **Security**: Non-root containers, network policy restricted
- **Endpoint**: `http://grafana.mcp-grafana.svc.cluster.local:8080/mcp`

## Authentication

LiteLLM forwards `X-Grafana-API-Key` from callers; the MCPServer manifest has no shared Grafana credential. Preserve that `extra_headers` behavior until an explicit authentication design replaces it.

## kagent Grafana MCP inventory

kagent ships a Grafana MCP integration. This deployment remains separately inventoried; do not assume the built-in integration replaces this server without proving feature and authentication parity.

## Prerequisites

### Grafana Service Account Token

The `mcp-server` service account is provisioned via a `GrafanaServiceAccount` CR in `flux/manifests/03-services/observability/grafana/` (same namespace as the Grafana CR: `prometheus-system`; `instanceName: kube-prometheus-stack-grafana`). grafana-operator reconciles the account and writes the token to Secret `mcp-server-token` in that namespace.

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

- **Internal**: `http://grafana.mcp-grafana.svc.cluster.local:8080/mcp`
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
kubectl logs -n mcp-grafana deployment/grafana -f
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

## Troubleshooting

```bash
# Pod status
kubectl get pods -n mcp-grafana

# MCP server logs
kubectl logs -n mcp-grafana deployment/grafana -f

# Check health endpoint
kubectl exec -n mcp-grafana deployment/grafana -- curl -s localhost:8080/health
```

## References

- **[Grafana MCP Documentation](https://deepwiki.com/grafana/mcp-grafana)** - Server documentation
- **[MCP Protocol Specification](https://modelcontextprotocol.io/)** - Model Context Protocol
- **[Grafana API](https://grafana.com/docs/grafana/latest/developers/http_api/)** - Grafana HTTP API
