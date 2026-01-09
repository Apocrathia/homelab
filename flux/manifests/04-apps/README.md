# Applications

User-facing applications and workloads deployed in the cluster.

> **Navigation**: [← Back to Flux README](../README.md)

## Documentation

- **[Generic-App Chart](../../helm/generic-app/README.md)** - Reusable Helm chart
- **[Authentik Outpost](https://docs.goauthentik.io/docs/outposts/)** - SSO integration

## Overview

The applications layer contains user-facing workloads and services organized by functional categories:

- **Application Templates**: Baseline configurations for common application patterns
- **Artificial Intelligence**: AI/ML applications, LLM interfaces, and MCP servers
- **Games**: Game support services and ROM management
- **Management**: Administrative tools, workflow automation, and monitoring
- **Media**: Media servers, Arr stack automation, and download clients

## Components

### Application Templates

- [**Demo App**](demo-app/README.md) - **Baseline template** for application configuration patterns, demonstrating Authentik SSO, Gateway API routing, and SMB storage integration using the reusable `generic-app` Helm chart.

### Artificial Intelligence

- [**AI Applications**](artificial-intelligence/README.md) - Overview of AI and machine learning applications
  - [**OpenWebUI**](artificial-intelligence/openwebui/README.md) - Web-based user interface for interacting with LLMs
  - [**Flowise**](artificial-intelligence/flowise/README.md) - Low-code platform for building AI agents and workflows
  - [**MLflow**](artificial-intelligence/mlflow/README.md) - ML lifecycle platform with experiment tracking and model registry
  - [**LiteLLM**](artificial-intelligence/litellm/README.md) - Unified proxy interface for 100+ LLM providers
  - [**llm-d**](artificial-intelligence/llm-d/README.md) - Kubernetes-native distributed LLM inference serving
  - [**Guardrails AI**](artificial-intelligence/guardrails-ai/README.md) - LLM output validation and safety checks
  - [**MCP Servers**](artificial-intelligence/mcp-servers/README.md) - Model Context Protocol servers for AI tool integration

### Games

- [**Game Support Services**](games/README.md) - Overview of game management and emulation applications
  - [**ArchiSteamFarm**](games/archisteamfarm/README.md) - Steam card farming application
  - [**ROMM**](games/romm/README.md) - ROM Manager for retro games with web-based emulation

### Management

- [**Management Applications**](management/README.md) - Overview of management and administrative applications
  - [**ChangeDetection.io**](management/changedetection-io/README.md) - Website change detection and monitoring
  - [**Companion**](management/companion/README.md) - Stream Deck control software
  - [**FluentBit**](management/fluentbit/README.md) - Log collection and forwarding to Loki
  - [**Grocy**](management/grocy/README.md) - Groceries and household management
  - [**JetKVM**](management/jetkvm/README.md) - KVM-over-IP device management
  - [**Kiwix**](management/kiwix/README.md) - Offline Wikipedia and content library
  - [**Kuber**](management/kuber/README.md) - iOS Kubernetes dashboard token management
  - [**Logseq**](management/logseq/README.md) - Knowledge management and note-taking
  - [**Mealie**](management/mealie/README.md) - Recipe manager and meal planning
  - [**n8n**](management/n8n/README.md) - Workflow automation platform
  - [**SearXNG**](management/searxng/README.md) - Privacy-respecting metasearch engine
  - [**Transmission**](management/transmission/README.md) - Torrent client with VPN integration
  - [**UnPoller**](management/unpoller/README.md) - UniFi network monitoring
  - [**Uptime Kuma**](management/uptime-kuma/README.md) - Service uptime monitoring

### Media

- [**Media Applications**](media/README.md) - Media server ecosystem for streaming and management
  - **Servers**: [Plex](media/servers/plex/README.md), [Cardinal](media/servers/cardinal/README.md), [Tunarr](media/servers/tunarr/README.md)
  - **Management**: [Sonarr](media/management/sonarr/README.md), [Radarr](media/management/radarr/README.md), [Lidarr](media/management/lidarr/README.md), [Prowlarr](media/management/prowlarr/README.md), [Bazarr](media/management/bazarr/README.md), [Tdarr](media/management/tdarr/README.md), [Recyclarr](media/management/recyclarr/README.md), [Tautulli](media/management/tautulli/README.md), and more
  - **Acquisitions**: [qBittorrent](media/acquisitions/qbittorrent/README.md), [SABnzbd](media/acquisitions/sabnzbd/README.md), [Bitmagnet](media/acquisitions/bitmagnet/README.md), [rdt-client](media/acquisitions/rdt-client/README.md)

### Application Patterns

Each application follows consistent patterns that will be templated:

- **Authentik Integration**: SSO through Authentik outposts
- **Gateway API Routing**: External access through Gateway API
- **Storage Integration**: Persistent storage with appropriate storage classes
- **Monitoring**: Prometheus metrics and Grafana dashboards
- **Security**: RBAC, network policies, and security contexts

## Architecture

### Application Deployment Model

Applications are deployed using:

- **Kubernetes Resources**: Deployments, Services, ConfigMaps, etc.
- **Helm Charts**: Generic-app chart for standardized application patterns
- **Kustomize**: For configuration management and customization
- **Flux**: For GitOps-based deployment and management

### Template Evolution

The demo app serves as a **baseline template** that has evolved into a reusable Helm chart:

1. **Phase 1 (✅ Completed)**: Kustomize-based configuration with individual manifests
2. **Phase 2 (✅ Completed)**: Helm chart with configurable values and templates
3. **Phase 3 (✅ Completed)**: Reusable `generic-app` Helm chart for multiple applications
4. **Phase 4 (✅ Completed)**: Production-ready chart with GitOps deployment through Flux
5. **Phase 5 (✅ Completed)**: Real applications deployed using the chart (Companion, n8n, Plex, OpenWebUI, and many more)

### Integration Points

#### With Services Layer

- **Authentication**: SSO through Authentik
- **Traffic Management**: Gateway API for external access
- **Certificate Management**: Automatic TLS through cert-manager
- **Monitoring**: Integration with Prometheus and Grafana

#### With Infrastructure Layer

- **Storage**: Persistent volumes through Longhorn
- **Networking**: Network policies through Cilium
- **Security**: Policy enforcement through Kyverno
- **Observability**: Logging through Loki and metrics through Mimir

## Configuration

### Application Structure

Each application follows one of two patterns:

**Pattern 1: Generic-App Chart (Recommended)**

```
app-name/
├── README.md              # Application documentation
├── kustomization.yaml     # Kustomize configuration
├── helmrelease.yaml       # Flux HelmRelease using generic-app chart
└── namespace.yaml         # Namespace definition (optional)
```

**Pattern 2: Custom Manifests (Legacy)**

```
app-name/
├── README.md              # Application documentation
├── kustomization.yaml     # Kustomize configuration
├── namespace.yaml         # Namespace definition
├── deployment.yaml        # Application deployment
├── service.yaml           # Service definition
├── httproute.yaml         # Gateway API routing (if external access)
├── secret.yaml            # 1Password secret references
└── storage.yaml           # Storage configuration (if needed)
```

## Security Considerations

### Application Security

- **RBAC**: Role-based access control for application resources
- **Network Policies**: Network isolation and traffic control
- **Pod Security**: Security contexts and policies
- **Secret Management**: 1Password integration for sensitive data

### Access Control

- **Authentication**: SSO through Authentik
- **Authorization**: Policy-based access control
- **Audit Logging**: Comprehensive access logging
- **Session Management**: Secure session handling

## Monitoring and Observability

### Metrics Collection

- **Application Metrics**: Custom application metrics
- **Infrastructure Metrics**: Resource usage and performance
- **Business Metrics**: Application-specific business metrics
- **Alerting**: Automated alerting for issues

### Logging

- **Application Logs**: Structured application logging
- **Access Logs**: Authentication and authorization logs
- **Audit Logs**: Security and compliance logs
- **Performance Logs**: Performance and debugging logs

## Troubleshooting

### Common Application Issues

1. **Deployment Issues**

   ```bash
   # Check application pods
   kubectl get pods -n <app-namespace>

   # Check deployment status
   kubectl describe deployment <app-name> -n <app-namespace>

   # Check application logs
   kubectl logs -n <app-namespace> deployment/<app-name>
   ```

2. **Authentication Issues**

   ```bash
   # Check Authentik outpost
   kubectl get pods -n <app-namespace> -l app=outpost

   # Check blueprint configuration
   kubectl get configmap authentik-blueprint -n <app-namespace>

   # Check Authentik logs
   kubectl logs -n <app-namespace> deployment/ak-outpost-<app>-outpost
   ```

3. **Routing Issues**

   ```bash
   # Check HTTPRoute status
   kubectl describe httproute <route-name> -n <app-namespace>

   # Check Gateway status
   kubectl get gateway -n cilium-system

   # Check service endpoints
   kubectl get endpoints -n <app-namespace>
   ```

## Best Practices

### Template Development

1. **Pattern Extraction**: Identify common configuration patterns
2. **Value Parameterization**: Make configurations configurable
3. **Documentation**: Document all configurable parameters
4. **Testing**: Test template with different application types

### Application Deployment

1. **Health Checks**: Implement proper health check endpoints
2. **Metrics**: Expose Prometheus metrics for monitoring
3. **Configuration**: Use ConfigMaps for configuration management
4. **Security**: Follow security best practices for applications

### Integration

1. **SSO**: Integrate with Authentik for authentication
2. **Storage**: Use appropriate storage classes for data persistence
3. **Networking**: Leverage Gateway API for traffic management
4. **Monitoring**: Integrate with monitoring stack for observability

## Next Steps

### Chart Usage and Optimization

1. **Deploy More Apps**: Use generic-app chart for additional applications
2. **Chart Enhancement**: Add new features and integrations as needed
3. **Performance Tuning**: Optimize resource usage and scaling
4. **Security Hardening**: Implement additional security best practices

### Application Deployment

1. **Template Usage**: Use generic-app chart for new applications
2. **Customization**: Customize for specific application requirements
3. **Monitoring**: Configure dashboards and alerting rules
4. **Scaling**: Plan for application growth and performance needs
