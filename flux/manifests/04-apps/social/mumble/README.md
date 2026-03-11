# Mumble

Open-source VoIP server for low-latency, high-quality voice chat.

> **Navigation**: [← Back to Social README](../README.md)

## Overview

Mumble server (murmur) deployment providing:

- Voice communication over TCP/UDP port 64738
- Persistent SQLite database on Longhorn storage
- Direct external access via Cilium LoadBalancer

## Access

- **Address**: `mumble.gateway.services.apocrathia.com`
- **Port**: `64738`
- **Protocol**: Mumble client (not HTTP)

Connect using any Mumble-compatible client with the address above.

## Configuration

Server configuration is minimal at deployment. Additional tuning can be done via:

- `MUMBLE_CONFIG_*` environment variables in the helmrelease
- Mumble admin client (connect as SuperUser)

See `helmrelease.yaml` for complete deployment configuration.

### Secrets

Create a 1Password item at `vaults/Secrets/items/mumble-secrets` with:

- **`superuser-password`** - Admin password for server management
- **`server-password`** - Password clients need to join the server

## Troubleshooting

```bash
# Pod status
kubectl get pods -n mumble

# Application logs
kubectl logs deployment/mumble -n mumble -f

# Verify LoadBalancer IP assignment
kubectl get svc -n mumble

# Test TCP connectivity
nc -zv mumble.gateway.services.apocrathia.com 64738
```

## References

- **[Mumble documentation](https://www.mumble.info/documentation/)** - Official docs
- **[GitHub repository](https://github.com/mumble-voip/mumble)** - Source code
- **[Docker image](https://github.com/mumble-voip/mumble-docker)** - Container configuration
- **[Server configuration](https://www.mumble.info/documentation/administration/config-file/)** - Config file reference
