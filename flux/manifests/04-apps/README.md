# Applications

This directory contains user-facing applications and workloads deployed in the cluster.

> **Navigation**: [← Back to Flux README](../README.md)

## Overview

The applications layer contains user-facing workloads and services that demonstrate the homelab infrastructure capabilities:

- **Application Templates**: Baseline configurations for common application patterns
- **Automation and Workflow**: Workflow automation and business process tools
- **Development Tools**: Applications for development and testing
- **User Services**: End-user applications and services
- **Integration Examples**: Examples of infrastructure integration patterns

## Components

### Application Templates

- [**Demo App**](demo-app/README.md) - **Baseline template** for application configuration patterns, demonstrating Authentik SSO, Gateway API routing, and SMB storage integration. This will be converted to a reusable Helm chart for multiple generic applications.

### Automation and Workflow

- [**n8n**](n8n/README.md) - Workflow automation platform with Authentik SSO integration, PostgreSQL backend, and Gateway API routing for creating and automating workflows

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
- **Helm Charts**: Where appropriate for complex applications (planned for demo app)
- **Kustomize**: For configuration management and customization
- **Flux**: For GitOps-based deployment and management

### Template Evolution

The demo app serves as a **baseline template** that will evolve into:

1. **Current State**: Kustomize-based configuration with individual manifests
2. **Next Phase**: Helm chart with configurable values and templates
3. **Final State**: Reusable Helm chart for multiple generic applications

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

Each application directory contains:

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

### Template Configuration Patterns

#### Authentik Integration Template

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: authentik-blueprint
  labels:
    authentik_blueprint: "true"
data:
  blueprint.yaml: |
    model: authentik_providers_oauth2.oauth2provider
    attrs:
      name: "App Name"
      client_id: "app-client-id"
      redirect_uris:
        - "https://app.domain.com/auth/callback"
```

#### Gateway API Routing Template

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-route
spec:
  parentRefs:
    - name: main-gateway
      namespace: cilium-system
      sectionName: https
  hostnames:
    - app.domain.com
  rules:
    - backendRefs:
        - name: ak-outpost-app-outpost
          port: 9000
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

## Template Development

### Current Demo App Status

- **Purpose**: Baseline template for application configuration patterns
- **Configuration**: Kustomize-based with individual manifests
- **Integration**: Full Authentik SSO, Gateway API, and storage integration
- **Documentation**: Comprehensive setup and troubleshooting guides

### Planned Evolution

- **Phase 1**: Extract common patterns and configurations
- **Phase 2**: Create Helm chart with configurable values
- **Phase 3**: Template common application types (web apps, APIs, databases)
- **Phase 4**: Reusable Helm chart for multiple generic applications

### Template Benefits

- **Consistency**: Standardized application deployment patterns
- **Reusability**: Single chart for multiple similar applications
- **Maintainability**: Centralized configuration management
- **Scalability**: Easy deployment of new applications

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

### Health Checks

```bash
# Check application health
kubectl get pods -n <app-namespace>

# Check service endpoints
kubectl get endpoints -n <app-namespace>

# Check routing configuration
kubectl get httproute -n <app-namespace>

# Check storage status
kubectl get pvc -n <app-namespace>

# Check PostgreSQL clusters (for n8n)
kubectl get clusters -n n8n
```

### n8n-Specific Troubleshooting

```bash
# Check n8n application status
kubectl get pods,svc,pvc -n n8n
kubectl get cluster n8n-postgres -n n8n

# Check n8n database connectivity
kubectl exec -it deployment/n8n -n n8n -- nc -zv n8n-postgres-rw 5432

# Check n8n application logs
kubectl logs -n n8n deployment/n8n --tail=50

# Check PostgreSQL cluster logs
kubectl logs -n n8n -l cnpg.io/cluster=n8n-postgres --tail=20

# Verify Authentik integration
kubectl get authentikprovider proxyprovider -n n8n
kubectl get authentikapplication -n n8n
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

### Template Development

1. **Pattern Analysis**: Analyze demo app for common patterns
2. **Helm Chart Creation**: Convert to Helm chart with values
3. **Template Testing**: Test with different application types
4. **Documentation**: Document template usage and parameters

### Application Deployment

1. **Template Usage**: Use template for new applications
2. **Customization**: Customize for specific application needs
3. **Monitoring**: Configure dashboards and alerting
4. **Scaling**: Plan for application scaling and growth

## External Resources

- [Kubernetes Application Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Authentik Outpost Documentation](https://docs.goauthentik.io/docs/outposts/)
- [Gateway API HTTPRoute](https://gateway-api.sigs.k8s.io/api-types/httproute/)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/data_model/)
- [Kustomize Documentation](https://kustomize.io/)
- [Helm Chart Development](https://helm.sh/docs/chart_template_guide/)
