# Applications

User-facing applications and workloads deployed in the cluster.

> **Navigation**: [← Back to Flux README](../README.md)

## Overview

Applications are organized by functional category:

- **Artificial Intelligence**: LLM interfaces, agents, MCP servers
- **Games**: Steam automation, ROM management
- **Home**: Home automation utilities and monitoring
- **Management**: Administrative tools and dashboards
- **Media**: Servers, Arr stack, download clients
- **Productivity**: Workflow automation, search, notes

## Components

### [Demo App](demo-app/README.md)

Baseline template demonstrating Authentik SSO, Gateway API routing, and SMB storage using the `generic-app` Helm chart.

### [Artificial Intelligence](artificial-intelligence/README.md)

OpenWebUI, LiteLLM, kagent, Flowise, and MCP servers.

### [Games](games/README.md)

ArchiSteamFarm for card farming, ROMM for retro game management.

### [Home](home/README.md)

Companion (Stream Deck), Grocy, Mealie, Meshtastic, Transmission, Uptime Kuma.

### [Hypermind](hypermind/README.md)

P2P swarm network for counting how many other people are wasting RAM on this container.

### [Management](management/README.md)

Backstage developer portal, JetKVM, n8n workflows, UnPoller.

### [Media](media/README.md)

Plex, Jellyfin, full Arr stack, and download clients.

### [Productivity](productivity/README.md)

ChangeDetection.io, Kiwix, Logseq, rclone, SearXNG, Wakapi, Windmill.

### [Web3](web3/README.md)

Blockchain and decentralized application services.

## Deployment

Applications deploy via the `generic-app` Helm chart, which handles:

- Authentik SSO integration
- Gateway API routing
- Longhorn/SMB storage
- 1Password secrets
- Security contexts

See [generic-app chart](../../helm/generic-app/README.md) for details.

## Structure

Each application follows one of two patterns:

**Generic-App Chart (preferred):**

```
app-name/
├── README.md
├── kustomization.yaml
├── helmrelease.yaml
└── namespace.yaml (optional)
```

**Custom Manifests (legacy):**

```
app-name/
├── README.md
├── kustomization.yaml
├── namespace.yaml
├── deployment.yaml
├── service.yaml
└── ...
```

## Troubleshooting

```bash
# Check application pods
kubectl get pods -n <app-namespace>

# Check deployment status
kubectl describe deployment <app-name> -n <app-namespace>

# Check application logs
kubectl logs -n <app-namespace> deployment/<app-name>

# Check HTTPRoute status
kubectl describe httproute <route-name> -n <app-namespace>

# Check Authentik outpost
kubectl get pods -n <app-namespace> -l app=outpost
```

## References

- **[Generic-App Chart](../../helm/generic-app/README.md)** - Reusable Helm chart
- **[Authentik Outpost](https://docs.goauthentik.io/docs/outposts/)** - SSO integration
