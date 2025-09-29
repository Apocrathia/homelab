# Transmission with VPN

Transmission torrent client with integrated VPN routing via Gluetun init container.

## Architecture

This deployment uses an **init container pattern** where:

- **Transmission container**: Handles torrent downloads and web UI
- **Gluetun VPN init container**: Routes all traffic through VPN connection with `restartPolicy: Always`
- **Shared pod networking**: Both containers share the same network interface and IP address within the pod

## Security Features

- **VPN-only traffic**: All torrent traffic routes through encrypted VPN tunnel
- **Firewall rules**: Gluetun blocks non-VPN traffic with built-in kill switch
- **Web UI access**: Only the web interface (port 9091) is accessible locally
- **Network policies**: Kubernetes network policies restrict traffic flow
- **Authentik integration**: SSO authentication for web access

## Configuration

### 1Password Secrets

Create a 1Password item: `vaults/Secrets/items/transmission-secrets`

Required fields:

- `vpn-provider`: VPN service provider name
- `vpn-type`: VPN protocol type
- `vpn-username`: VPN service username
- `vpn-password`: VPN service password
- `vpn-region`: VPN server region

### Storage

- **Config**: 10GB Longhorn persistent volume for Transmission configuration
- **Downloads**: SMB mount to shared storage location
- **Gluetun Data**: EmptyDir volume for Gluetun runtime configuration and server data

### Access

- **Web UI**: `https://transmission.gateway.services.apocrathia.com`
- **Authentication**: Managed by Authentik SSO

## Technical Notes

### VPN Configuration

Gluetun is configured with:

- **Protocol**: OpenVPN over UDP
- **Firewall**: Allows Transmission web UI (port 9091) and service subnet (10.69.0.0/16)
- **DNS**: Plaintext DNS (DoT disabled to avoid timeouts) with internal DNS server on 127.0.0.1:53
- **Health Monitoring**: Automatic VPN connection health checks
- **Init Container**: Uses `restartPolicy: Always` to maintain VPN connection

### Container Communication

Both containers run in the same pod and share:

- **Network namespace**: Same IP address - Transmission traffic automatically routes through VPN
- **Storage volumes**: Transmission config and downloads are persistent
- **Security context**: Privileged mode with NET_ADMIN capability for VPN operations
- **DNS resolution**: Transmission uses Gluetun's internal DNS server (127.0.0.1:53)

### Firewall Protection

Gluetun's built-in firewall provides:

- Kill switch that blocks all non-VPN traffic
- Allows local network access for management
- Permits Transmission web UI on port 9091
- Automatic VPN reconnection on failure
