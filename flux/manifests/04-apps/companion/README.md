# Companion - Stream Deck Control Software

This directory contains the deployment configuration for [Bitfocus Companion](https://bitfocus.io/companion/), a powerful stream deck control software for broadcast and live production environments.

> **Navigation**: [← Back to Apps README](../README.md)

## Overview

Companion is an open-source controller for Elgato Stream Decks and other input devices. It provides a web-based interface for creating custom control surfaces with buttons, dials, and other controls to interface with various broadcast and production systems.

### Key Features

- **Stream Deck Integration**: Full support for Elgato Stream Deck devices
- **Web-based Interface**: Modern web UI for configuration and control
- **Multi-device Support**: Works with various input devices and protocols
- **Extensible**: Supports custom modules and integrations
- **Network Control**: RESTful API for external control systems

## Deployment

This application is deployed using the [generic-app Helm chart](../../../helm/generic-app/README.md) through Flux GitOps.

### Configuration Details

- **Container Image**: `ghcr.io/bitfocus/companion/companion:4.1.0-8331-main-c4786a4c6a`
- **Persistent Storage**: 5Gi Longhorn volume mounted at `/companion`
- **Network Ports**: HTTP interface on port 8000
- **Resource Limits**: 100m-500m CPU, 256Mi-512Mi memory

### Storage

The application uses a 5Gi Longhorn persistent volume to store:

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

1. **External URL**: Navigate to the external hostname configured in Authentik
2. **Authentication**: Use your Authentik credentials to log in
3. **Configuration**: Set up your Stream Deck devices and button layouts
4. **Integration**: Connect to your broadcast systems and applications

### Stream Deck Setup

1. Connect your Elgato Stream Deck to the network
2. In Companion, add the device using its IP address
3. Configure buttons and assign actions
4. Test your control surface

### API Access

Companion provides a RESTful API for external control:

```bash
# Example API endpoint
curl -X GET "https://companion.gateway.services.apocrathia.com/api/v1/buttons"
```

## Troubleshooting

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

## Backup and Recovery

The persistent storage contains all configuration data. Regular backups of the Longhorn volume are recommended for production use.

### Manual Backup

```bash
# Copy configuration files
kubectl cp companion-abc123:/companion ./companion-backup/ -n companion
```

## Resources

- [Bitfocus Companion Website](https://bitfocus.io/companion/)
- [GitHub Repository](https://github.com/bitfocus/companion)
- [Documentation](https://github.com/bitfocus/companion/wiki)
- [Container Registry](https://github.com/bitfocus/companion/pkgs/container/companion%2Fcompanion)
- [Installation Guide](https://github.com/bitfocus/companion/wiki/Installation)
