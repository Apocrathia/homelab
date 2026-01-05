# Infrastructure Agent

Infrastructure management agent for Proxmox, TrueNAS, and UniFi Network.

> **Navigation**: [← Back to Agents README](../README.md)

## Tools

- **proxmox-mcp**: Proxmox VE virtualization management
- **truenas-mcp**: TrueNAS storage management
- **unifi-mcp**: UniFi network management

## Capabilities

- VM and container lifecycle management
- Storage pool and dataset monitoring
- Network device and client status
- Cross-platform infrastructure health checks

## Secrets

Requires 1Password item `infrastructure-agent-secrets` in Secrets vault with:

| Field             | Description     |
| ----------------- | --------------- |
| `litellm-api-key` | LiteLLM API key |
