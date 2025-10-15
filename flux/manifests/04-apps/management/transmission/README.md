# Transmission with VPN

Torrent client with integrated VPN routing via Gluetun init container for secure downloads.

> **Navigation**: [← Back to Management README](../README.md)

## Documentation

- **[Transmission Documentation](https://transmissionbt.com/help/)** - Primary documentation source
- **[Gluetun VPN](https://github.com/qdm12/gluetun)** - VPN container documentation
- **[LinuxServer.io Transmission](https://docs.linuxserver.io/images/docker-transmission)** - Container documentation

## Overview

This deployment includes:

- Transmission torrent client with web UI
- Gluetun VPN init container for secure routing
- VPN-only traffic with kill switch protection
- Authentik SSO integration for web access
- SMB mounts for download storage

## Configuration

### 1Password Secrets

Create a 1Password item:

#### transmission-secrets (`vaults/Secrets/items/transmission-secrets`)

- `vpn-provider`: VPN service provider name
- `vpn-type`: VPN protocol type
- `vpn-username`: VPN service username
- `vpn-password`: VPN service password
- `vpn-region`: VPN server region

### Storage

- **Configuration Volume**: 10GB Longhorn persistent volume for Transmission configuration
- **Downloads Volume**: SMB mount to shared storage location
- **Gluetun Data**: EmptyDir volume for Gluetun runtime configuration

### Access

- **External URL**: `https://transmission.gateway.services.apocrathia.com`
- **Internal Service**: `http://transmission.transmission.svc.cluster.local:9091`

## Authentication

Authentication is handled through Authentik SSO:

1. **Proxy Provider**: Authentik blueprint creates a proxy provider
2. **Automatic Setup**: HTTPRoute and outpost created automatically
3. **Clean Deployment**: Works with Authentik from day one

## Security Considerations

- **VPN-only Traffic**: All torrent traffic routes through encrypted VPN tunnel
- **Kill Switch**: Gluetun blocks non-VPN traffic with built-in firewall
- **Network Policies**: Kubernetes network policies restrict traffic flow
- **SSO Integration**: Complete authentication through Authentik proxy

## Troubleshooting

### Common Issues

1. **VPN Connection Issues**

   ```bash
   # Check Gluetun logs
   kubectl -n transmission logs -l app.kubernetes.io/name=gluetun

   # Check VPN status
   kubectl -n transmission exec -it deployment/transmission -- curl -s ifconfig.me
   ```

2. **Download Storage Issues**

   ```bash
   # Check downloads volume mount
   kubectl -n transmission exec -it deployment/transmission -- mount | grep storage

   # Test download directory access
   kubectl -n transmission exec -it deployment/transmission -- ls -la /downloads
   ```

### Health Checks

```bash
# Overall status
kubectl -n transmission get pods,svc,pvc

# Transmission application status
kubectl -n transmission get pods -l app.kubernetes.io/name=transmission

# Gluetun VPN status
kubectl -n transmission get pods -l app.kubernetes.io/name=gluetun
```
