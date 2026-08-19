# slskd

A modern client-server for the Soulseek file-sharing network, with a web UI for
searching, downloading, browsing shares, and chat.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- Soulseek daemon (web UI + API) on port 5030
- Gluetun VPN sidecar — all traffic leaves through the VPN, with a kill-switch
  firewall (same pattern as qBittorrent/SABnzbd)
- slskd's native gluetun integration — delays the Soulseek connection until the
  VPN is up and drops it if the VPN goes down
- Authentik proxy provider for SSO in front of the web UI
- Longhorn persistent volume for application data (`/app`: config, SQLite DBs,
  incomplete downloads)
- SMB mount for completed downloads (`/downloads`), matching the other
  download clients

## Access

- **URL**: `https://slskd.gateway.services.apocrathia.com`

## Configuration

Configuration is a mix of environment variables (bootstrap) and the app's own
YAML file (`/app/slskd.yml`), which is generated on first run.

- **Environment Variables**: Soulseek and web UI credentials, JWT signing key,
  VPN credentials, and download directory are set in the HelmRelease from
  1Password-backed secrets.
- **Web UI**: Everything else (shares, limits, rooms, integrations) is managed
  in the web UI; `SLSKD_REMOTE_CONFIGURATION=true` lets the UI write changes
  back to `slskd.yml`.

See `helmrelease.yaml` for complete deployment configuration.

### Secrets

Create a 1Password item at `vaults/Secrets/items/slskd-secrets` with these
fields before the HelmRelease can go ready:

| Field                  | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| `web-username`         | Web UI / API login username                                 |
| `web-password`         | Web UI / API login password                                 |
| `jwt-key`              | Random string >= 32 chars (keeps sessions across restarts)  |
| `slskd-api-key`        | API key for `X-API-Key` access (Administrator role)         |
| `soulseek-username`    | Soulseek network account username                           |
| `soulseek-password`    | Soulseek network account password                           |
| `vpn-username`         | VPN account username (same value as qBittorrent's)          |
| `vpn-password`         | VPN account password                                        |
| `vpn-provider`         | Gluetun provider name (e.g. `private internet access`)      |
| `vpn-type`             | `openvpn` or `wireguard`                                    |
| `vpn-region`           | Gluetun server region                                       |
| `gluetun-api-key`      | Random string >= 16 chars for gluetun's control server      |
| `gluetun-control-role` | `{"auth":"apikey","apikey":"<same gluetun-api-key value>"}` |

The SMB mount reuses the shared `smb-credentials` item, same as the other
download clients.

## Authentication

Uses an Authentik proxy provider for SSO; the app's own login sits behind it.

## VPN

All pod traffic routes through the Gluetun sidecar; the firewall drops traffic
if the tunnel goes down. The web UI stays reachable because gluetun allows
inbound TCP 5030 in the pod.

slskd polls gluetun's control server (`localhost:8000`) and only connects to
the Soulseek network while the VPN is up.

### Port forwarding (optional)

Soulseek works best with an inbound port. Gluetun supports provider-side port
forwarding for PIA, ProtonVPN, Perfect Privacy, and PrivateVPN. If the VPN
account supports it, set in the HelmRelease:

- gluetun env: `VPN_PORT_FORWARDING: "on"`
- slskd env: `SLSKD_VPN_PORT_FORWARDING: "true"`

slskd then picks up the dynamically forwarded port and uses it as its Soulseek
listen port automatically.

## Initial Setup

1. Access the web UI and log in with the `web-username` / `web-password`
   credentials from 1Password.
2. Confirm the Soulseek server connection status (top of the UI) — credentials
   come from the same 1Password item, and the connection waits for the VPN.
3. Optional: add shared directories under Options if you want to upload.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n slskd

# Application logs (slskd + gluetun sidecar)
kubectl logs -n slskd deployment/slskd -f
kubectl logs -n slskd deployment/slskd -c gluetun -f

# VPN status via the control server (from inside the pod)
kubectl exec -n slskd deployment/slskd -c gluetun -- \
  wget -qO- http://localhost:8000/v1/vpn/status

# Check Authentik outpost
kubectl get pods -n authentik | grep slskd
```

## References

- **[Official Documentation](https://github.com/slskd/slskd/tree/master/docs)** -
  Configuration, Docker, VPN, and reverse proxy guides
- **[GitHub Repository](https://github.com/slskd/slskd)** - Source code and issues
