# Social

Community and social networking applications.

> **Navigation**: [← Back to Apps README](../README.md)

## Overview

Community, chat, and field-coordination services live here. Deployed via
Flux; external access goes through the `main-gateway` with Gateway API
HTTPRoutes, and app routes follow the `<app>.gateway.services.apocrathia.com`
convention (Matrix also serves `matrix.apocrathia.com` for federation).

## Applications

### [Hypermind](./hypermind/README.md)

P2P swarm network for counting how many other people are wasting RAM on this container.

### [Lemmy](./lemmy/README.md)

Lemmy UI frontend for the lemmy.ml instance.

### [Matrix](./matrix/README.md)

Matrix homeserver (Synapse) with SSO delegated to Matrix Authentication Service, upstreamed to Authentik OIDC.

### Sable

Sable — Discord-like OIDC-native Matrix client (Rust + Svelte). Deployed
alongside Element in the matrix namespace; documented in the
[Matrix README](./matrix/README.md) (no separate doc).

### [Mumble](./mumble/README.md)

Open-source VoIP server for low-latency voice chat.

### [TAK](./tak/README.md)

Open-source TAK server for ATAK: CoT streaming, mission sync, and certificate enrollment via Authentik LDAP.

### [The Lounge](./thelounge/README.md)

Self-hosted web IRC client with persistent connections and message history.

## References

- **[Generic-App Chart](../../../../helm/generic-app/README.md)** - Application deployment template
