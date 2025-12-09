# SABnzbd with VPN

SABnzbd Usenet client with integrated VPN routing via Gluetun init container.

> **Navigation**: [← Back to Media README](../../README.md)

## Architecture

This deployment uses an **init container pattern** where:

- **SABnzbd container**: Handles Usenet downloads and web UI
- **Gluetun VPN init container**: Establishes VPN connection with `restartPolicy: Always` to act as sidecar
- **Shared pod networking**: Both containers share the same network interface and IP address within the pod

## Security Features

- **VPN-only traffic**: All download traffic routes through encrypted VPN tunnel
- **Firewall rules**: Gluetun blocks non-VPN traffic with built-in kill switch
- **Web UI access**: Only the web interface (port 8080) is accessible locally
- **Network policies**: Kubernetes network policies restrict traffic flow
- **Authentik integration**: SSO authentication for web access

## Configuration

### 1Password Secrets

Create a 1Password item: `vaults/Secrets/items/sabnzbd-secrets`

Required fields:

- `vpn-provider`: VPN service provider name
- `vpn-type`: VPN protocol type
- `vpn-username`: VPN service username
- `vpn-password`: VPN service password
- `vpn-region`: VPN server region

### Storage

- **Config**: 10GB Longhorn persistent volume for SABnzbd configuration
- **Incomplete**: 50GB Longhorn persistent volume for incomplete downloads
- **Downloads**: SMB mount to shared storage location
- **Gluetun Data**: EmptyDir volume for Gluetun runtime configuration and server data

### Access

- **Web UI**: `https://sabnzbd.gateway.services.apocrathia.com`
- **Authentication**: Managed by Authentik SSO

### Hostname Whitelist

SABnzbd requires hostname whitelist configuration when accessed through a reverse proxy. To configure:

1. Access the pod's config volume:

   ```bash
   kubectl exec -it -n sabnzbd deployment/sabnzbd -- sh
   ```

2. Edit `/config/sabnzbd.ini` and add or update the `host_whitelist` setting in the `[misc]` section:

   ```ini
   [misc]
   host_whitelist = sabnzbd.gateway.services.apocrathia.com
   ```

3. Restart the pod to apply changes:
   ```bash
   kubectl rollout restart deployment/sabnzbd -n sabnzbd
   ```

## Technical Notes

### VPN Configuration

Gluetun is configured with:

- **Protocol**: OpenVPN over UDP
- **Firewall**: Allows SABnzbd web UI (port 8080) and service subnet (10.69.0.0/16)
- **DNS**: Plaintext DNS (DoT disabled to avoid timeouts) with internal DNS server on 127.0.0.1:53
- **Health Monitoring**: Automatic VPN connection health checks
- **Init Container**: Uses `restartPolicy: Always` to maintain VPN connection

### Container Communication

Both containers run in the same pod and share:

- **Network namespace**: Same IP address - SABnzbd traffic automatically routes through VPN
- **Storage volumes**: SABnzbd config and downloads are persistent
- **Security context**: Privileged mode with NET_ADMIN capability for VPN operations
- **DNS resolution**: SABnzbd uses Gluetun's internal DNS server (127.0.0.1:53)

### Firewall Protection

Gluetun's built-in firewall provides:

- Kill switch that blocks all non-VPN traffic
- Allows local network access for management
- Permits SABnzbd web UI on port 8080
- Automatic VPN reconnection on failure
