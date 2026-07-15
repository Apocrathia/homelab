# SilverBullet

Self-hosted, browser-based markdown notes app. Space is a folder of plain `.md` files on disk (nested paths supported).

> **Navigation**: [← Back to Productivity](../README.md)

## Links

- [Official site](https://silverbullet.md/)
- [Configuration](https://silverbullet.md/Install/Configuration)
- [GitHub](https://github.com/silverbulletmd/silverbullet)

## Access

- **URL**: <https://notes.gateway.services.apocrathia.com>

## Configuration

Environment variables in `helmrelease.yaml`. Local `SB_USER` auth is unset; Authentik proxy is the access gate. Shell-from-plugs is disabled (`SB_SHELL_BACKEND=off`).

## Authentication

Authentik proxy SSO. `service_worker.js` and `/.client/` bypass the proxy so the PWA can register its ServiceWorker (static client code only, not notes).

## Storage

NAS SMB share `Library/Notes` mounted at `/space`. SilverBullet may create its own sidecar files under that path (index/auth state). Obsidian and sync metadata (`.obsidian/`, `.stfolder/`, etc.) are ignored via `SB_SPACE_IGNORE`.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n silverbullet

# Application logs
kubectl logs -n silverbullet deployment/silverbullet -f

# Verify space mount
kubectl exec -n silverbullet deployment/silverbullet -- ls -la /space

# Health check
kubectl exec -n silverbullet deployment/silverbullet -- wget -qO- http://127.0.0.1:3000/.ping
```

## References

- [Docker install](https://silverbullet.md/Install/Docker)
- [Generic-App Chart](../../../../helm/generic-app/README.md)
