# Matrix (Element Web)

Web client for the Matrix decentralized communication protocol. Connects to public Matrix servers like matrix.org.

> **Navigation**: [← Back to Productivity README](../README.md)

## Overview

This deployment includes:

- Element Web client (static nginx app)
- Pre-configured to connect to matrix.org homeserver
- Authentik SSO for access control

This is a client-only deployment. Users authenticate with their Matrix account (matrix.org or other) after accessing the web client.

I may decide to add a homeserver in the future, but that will also require exposing the homeserver to the Internet for federation.

## Access

- **URL**: `https://matrix.gateway.services.apocrathia.com`

## Configuration

The Matrix homeserver connection is configured via ConfigMap (`configmap.yaml`). To connect to a different homeserver, update the `default_server_config` section.

Current configuration points to matrix.org as the default homeserver.

## Authentication

Uses Authentik proxy provider for access control to the web client. Matrix account authentication is handled separately by the Matrix homeserver.

## Initial Setup

1. Access the web UI through Authentik
2. Sign in with existing Matrix account or create new account on matrix.org
3. Start chatting

## Troubleshooting

```bash
# Pod status
kubectl get pods -n matrix

# Application logs
kubectl logs -n matrix deployment/element-web -f

# Check Authentik outpost
kubectl get pods -n authentik | grep element-web
```

## References

- **[Element Web Documentation](https://element.io/help)** - User guide and help
- **[Matrix Protocol](https://matrix.org/)** - Matrix specification and ecosystem
- **[Element Web GitHub](https://github.com/element-hq/element-web)** - Source code
