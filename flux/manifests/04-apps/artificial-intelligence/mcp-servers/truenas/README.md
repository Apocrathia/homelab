# TrueNAS MCP Server

The TrueNAS MCP server provides TrueNAS Core and SCALE management through the Model Context Protocol.

> **Navigation**: [← Back to MCP Servers README](../README.md)

## Overview

This deployment includes:

- TrueNAS MCP server for storage and system management
- kmcp MCPServer (`truenas`) with agentgateway HTTP adapter
- Internal access only via LiteLLM proxy
- Connection to TrueNAS Core or SCALE instance

**Endpoint:** `http://truenas.mcp-truenas.svc.cluster.local:8080/mcp`

## Configuration

### Transport

`transportType: stdio` — agentgateway wraps the MCP process and exposes streamable HTTP on `/mcp` (port 8080).

### Environment Variables

| Variable             | Source | Description                              |
| -------------------- | ------ | ---------------------------------------- |
| `TRUENAS_URL`        | Secret | TrueNAS server URL                       |
| `TRUENAS_API_KEY`    | Secret | TrueNAS API key                          |
| `TRUENAS_VERIFY_SSL` | Config | Verify SSL certificates (default: false) |
| `TRUENAS_LOG_LEVEL`  | Config | Logging level (default: INFO)            |

### Secrets

Create a Kubernetes secret `truenas-mcp-secrets` in the `mcp-truenas` namespace with:

- `truenas-url`: TrueNAS server URL (e.g., `https://truenas.local`)
- `truenas-api-key`: TrueNAS API key (created in Settings → API Keys)

The Secret is mounted at `/var/run/secrets/mcp` and maps `truenas-url` and `truenas-api-key` to the required `TRUENAS_*` variables before the MCP process starts.

### Security

- **Permission Profile**: Network access for TrueNAS API
- **Authentication**: API key via Kubernetes secrets

## Available MCP Tools

The TrueNAS MCP server provides tools for storage and system management:

### Universal Features (Core & SCALE)

- **User Management** - Create, update, delete users and manage permissions
- **Storage Management** - Manage pools, datasets, volumes with ZFS support
- **File Sharing** - Configure SMB, NFS, and iSCSI shares
- **Snapshot Management** - Create, delete, rollback snapshots
- **System Monitoring** - Check system health, pool status, and resource usage

### TrueNAS SCALE Features (24.04+)

- **Apps** - Manage Docker Compose-based TrueNAS applications
- **Incus Instances** - Control Incus VMs and containers (SCALE 25.04+)
- **Legacy VMs** - Manage bhyve virtual machines

## Troubleshooting

```bash
# Pod status
kubectl get pods -n mcp-truenas

# MCP server logs
kubectl logs -n mcp-truenas deployment/truenas -f

# Test TrueNAS connectivity
kubectl exec -n mcp-truenas deployment/truenas -- \
  curl -s -k -H "Authorization: Bearer $TRUENAS_API_KEY" "$TRUENAS_URL/api/v2.0/system/info"
```

## References

- [TrueNasCoreMCP](https://github.com/vespo92/TrueNasCoreMCP) - MCP server repository
- [TrueNAS](https://www.truenas.com/) - TrueNAS documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Model Context Protocol documentation
