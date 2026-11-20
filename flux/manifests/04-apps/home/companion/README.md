# Companion - Stream Deck Control Software

Stream Deck controller for broadcast and live production.

> **Navigation**: [← Back to Home README](../README.md)

## Overview

Companion is an open-source controller for Elgato Stream Decks and other input devices. The web UI builds custom control surfaces (buttons, dials) that drive broadcast and production systems.

### Key Features

Companion supports Stream Deck devices, a browser UI, multiple input devices and protocols, custom modules, and a REST API for external control.

- **Web interface**: Browser UI for configuration and control
- **Multi-device**: Multiple input devices and protocols
- **Extensible**: Custom modules and integrations
- **Network control**: REST API for external control

## Deployment

This application is deployed using the [generic-app Helm chart](../../../../../helm/generic-app/README.md) through Flux GitOps.

### Configuration Details

- **Persistent Storage**: Longhorn volume mounted at `/companion`
- **Network Ports**:
  - HTTP interface on port 8000
  - Satellite communication on ports 16622 and 16623 (LoadBalancer service)
  - External LoadBalancer IP: see the Service in `helmrelease.yaml`

See `helmrelease.yaml` for complete deployment configuration.

### Storage

The application uses a Longhorn persistent volume to store:

- Configuration files
- Button layouts and settings
- Custom modules and extensions
- Log files

### Security & Access

- **Authentication**: SSO through Authentik
- **External Access**: Available at `https://companion.gateway.services.apocrathia.com`
- **Internal Access**: Service available at `http://companion.bitfocus.svc:8000`

## Usage

### Accessing Companion

1. Open `https://companion.gateway.services.apocrathia.com`
2. Log in with Authentik credentials

### Stream Deck Setup

1. Connect your Elgato Stream Deck to the network
2. In Companion, add the device using its IP address
3. Configure buttons and assign actions
4. Test your control surface

### API Access

Companion exposes a REST API for external control:

```bash
# Example API endpoint
curl -X GET "https://companion.gateway.services.apocrathia.com/api/v1/buttons"
```

### Satellite Device Configuration

Companion satellites can connect to the main instance via TCP ports 16622 and 16623:

- **External Access**: the LoadBalancer IP and ports (see `helmrelease.yaml`)
- **Internal Access**: `bitfocus.bitfocus.svc:16622` or `bitfocus.bitfocus.svc:16623`
- **Protocol**: TCP
- **Service Type**: LoadBalancer with Cilium L2 announcement

The LoadBalancer service provides direct external access without requiring Gateway API configuration for satellite connections.

## Troubleshooting

Stream Deck, xkeys, and Mirabox connections silently break because
Companion's drivers create Unix-domain IPC sockets in `/tmp`. The
generic-app chart ships `readOnlyRootFilesystem: true`, so `/tmp` is
read-only and socket creation fails with `EROFS`. The fix is an
`emptyDir` volume mounted at `/tmp` (set in `helmrelease.yaml`).

### Checking the logs

```bash
kubectl logs -n bitfocus deployment/companion --tail=100 | grep -E "EROFS|Failed to open data channel"
```

If you see `EROFS: read-only file system /tmp/companion-ipc-*.sock`,
the `/tmp` emptyDir volume is missing.

### Common Issues

1. **Stream Deck Connection Issues**

   ```bash
   # Check pod logs
   kubectl logs -n bitfocus deployment/companion

   # Verify network connectivity
   kubectl exec -it -n bitfocus deployment/companion -- ping <streamdeck-ip>
   ```

2. **Configuration Persistence Issues**

   ```bash
   # Check persistent volume status
   kubectl get pvc -n bitfocus

   # Verify volume mounting
   kubectl exec -it -n bitfocus deployment/companion -- ls -la /companion
   ```

3. **Authentication Issues**

   ```bash
   # Check Authentik outpost status
   kubectl get pods -n bitfocus -l app=outpost

   # Verify Authentik blueprint
   kubectl get configmap -n bitfocus authentik-blueprint-companion
   ```

### Logs and Debugging

```bash
# View application logs
kubectl logs -n bitfocus deployment/companion --tail=100

# View outpost logs
kubectl logs -n bitfocus -l app=outpost --tail=50

# Check events
kubectl get events -n bitfocus --sort-by=.metadata.creationTimestamp
```

## References

- **[Bitfocus Companion](https://bitfocus.io/companion/)** - Official website
- **[GitHub Repository](https://github.com/bitfocus/companion)** - Source code and issues
- **[Wiki](https://github.com/bitfocus/companion/wiki)** - Documentation and guides

## Backup and Recovery

The Longhorn volume holds all configuration data.

### Manual Backup

```bash
# Copy configuration files
kubectl cp companion-abc123:/companion ./companion-backup/ -n companion
```
