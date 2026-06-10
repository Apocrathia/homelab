# RustDesk

Self-hosted remote desktop ID and relay servers (`hbbs` + `hbbr`).

> **Navigation**: [← Back to Productivity](../README.md)

## Links

- [RustDesk Server Docs](https://rustdesk.com/docs/en/self-host/rustdesk-server-oss/)
- [GitHub Repository](https://github.com/rustdesk/rustdesk-server)

## Architecture

| Component       | Process | Port            | Purpose                                            |
| --------------- | ------- | --------------- | -------------------------------------------------- |
| ID server       | `hbbs`  | 21116 (TCP/UDP) | Client registration, NAT traversal, peer discovery |
| NAT test        | `hbbs`  | 21115 (TCP)     | Connectivity checks                                |
| Relay server    | `hbbr`  | 21117 (TCP)     | Traffic relay when direct P2P fails                |
| Relay WebSocket | `hbbr`  | 21119 (TCP)     | Web client relay (not used by desktop clients)     |

Clients reach the servers at `rustdesk.services.apocrathia.com`, which resolves to the LoadBalancer IP `10.100.1.94`.

## Client configuration

In the RustDesk client, open **Settings → Network → ID/Relay server** and set:

| Field        | Value                                    |
| ------------ | ---------------------------------------- |
| ID server    | `rustdesk.services.apocrathia.com:21116` |
| Relay server | `rustdesk.services.apocrathia.com:21117` |
| API server   | Leave blank                              |
| Key          | See below                                |

The **Key** is the server's public key. Retrieve it from the `hbbs` container logs:

```bash
kubectl logs -n rustdesk deployment/rustdesk -c server | grep "^.*Key:"
```

Copy the full value after `Key:` (including any trailing `=` characters). A truncated key will cause authentication failures.

**API server** is only needed for RustDesk Pro features. This deployment runs the OSS server stack and does not expose port 21118 externally, so leave that field empty.

After saving, restart the RustDesk client. Each client gets a persistent ID from the server and can connect to other clients using the same network settings.

## Storage

Server keys and peer database persist on a Longhorn volume mounted at `/root` in the `hbbs` container. Deleting the PVC generates a new key pair; all clients must be updated with the new key.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n rustdesk

# Server logs (includes public key on startup)
kubectl logs -n rustdesk deployment/rustdesk -c server
kubectl logs -n rustdesk deployment/rustdesk -c relay

# LoadBalancer and ports
kubectl get svc -n rustdesk rustdesk-external

# DNS should resolve to the LoadBalancer IP
dig +short rustdesk.services.apocrathia.com
```

If clients cannot connect:

1. Confirm the **Key** matches the full value from server logs.
2. Confirm UDP/TCP 21116 and TCP 21117 are reachable from the client network (firewall, NAT hairpin if testing from LAN).
3. Check that `rustdesk.services.apocrathia.com` resolves to `10.100.1.94`.
