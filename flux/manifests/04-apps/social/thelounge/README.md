# The Lounge

Self-hosted web IRC client with persistent connections, message history, and multi-user support.

> **Navigation**: [← Back to Social README](../README.md)

## Overview

This deployment includes:

- Persistent IRC connections (stay connected when browser is closed)
- SQLite-backed message history
- Longhorn persistent storage for config, users, and messages
- Authentik proxy authentication

## Access

- **URL**: `https://thelounge.gateway.services.apocrathia.com`

## Configuration

Server config is declarative. Edit `config.js` in this directory and apply; the file is mounted into the pod via a ConfigMap. Key settings for this deployment:

- `reverseProxy: true` — honors `X-Forwarded-For` from Authentik
- `host: "127.0.0.1"` — bind locally; traffic goes through the proxy

Restart the deployment after changing config (ConfigMap updates do not hot-reload):

```bash
kubectl rollout restart deployment/thelounge -n thelounge
```

## Users

The Lounge has no declarative user API. Create accounts once, then use the web UI or CLI:

```bash
kubectl exec -it -n thelounge deployment/thelounge -- thelounge add <username>
```

User data (profiles, message history) is stored on the Longhorn volume and persists across restarts.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n thelounge

# Application logs
kubectl logs deployment/thelounge -n thelounge -f

# Check Authentik outpost
kubectl get pods -n authentik | grep thelounge

# Check user list
kubectl exec -it -n thelounge deployment/thelounge -- thelounge list
```

## References

- **[The Lounge documentation](https://thelounge.chat/docs)** - Configuration and guides
- **[GitHub repository](https://github.com/thelounge/thelounge)** - Source code and issues
