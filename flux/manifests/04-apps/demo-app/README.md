# Demo App - Baseline Application Template

This directory contains the deployment configuration for a demo application that serves as a **baseline template** for application configuration patterns.

> **Navigation**: [← Back to Apps README](../README.md)

## Overview

The demo app is a **baseline template** that demonstrates:

- **Application Deployment**: Basic application deployment patterns
- **Authentik Integration**: SSO integration through Authentik outpost
- **Gateway API Routing**: Traffic routing through Gateway API (handled by Authentik)
- **Storage Integration**: SMB storage integration via CSI driver
- **Monitoring**: Application monitoring and observability

## Architecture

### Application Components

#### Demo App Container

- **Web Application**: Simple web-based demo application
- **Health Endpoints**: Health check and readiness endpoints
- **Metrics Endpoints**: Prometheus metrics for monitoring
- **Configuration**: Configurable application parameters

#### Authentik Outpost

- **SSO Integration**: Single sign-on authentication
- **Reverse Proxy**: Proxies requests to the demo application
- **Session Management**: Handles user sessions and authentication
- **Access Control**: Policy-based access control
- **HTTPRoute Management**: **Automatically creates and manages HTTPRoute resources**

#### Storage Integration

- **SMB Mount**: SMB file share integration
- **Persistent Storage**: Persistent volume for application data
- **File Operations**: Read/write operations to SMB storage
- **Backup Support**: Integration with backup systems

### Network Architecture

#### Gateway API Routing

- **External Access**: Gateway API for external traffic
- **TLS Termination**: Automatic TLS certificate management
- **Load Balancing**: Cilium-based load balancing
- **Traffic Management**: Advanced traffic routing capabilities
- **Authentik Management**: **HTTPRoute creation and management is now handled automatically by Authentik**

#### Internal Communication

- **Service Discovery**: Kubernetes service discovery
- **Internal Routing**: Cluster-internal communication
- **Network Policies**: Cilium network policy enforcement
- **Security Groups**: Network security and isolation

## Features

### Application Features

- **Web Interface**: User-friendly web-based interface
- **Configuration Management**: Dynamic configuration updates
- **Health Monitoring**: Built-in health check endpoints
- **Metrics Collection**: Prometheus metrics for monitoring

### Authentication Features

- **SSO Integration**: Single sign-on through Authentik
- **User Management**: User authentication and authorization
- **Session Handling**: Secure session management
- **Access Control**: Role-based access control
- **Automatic Routing**: **Authentik automatically creates HTTPRoute resources**

### Storage Features

- **SMB Integration**: Windows file share compatibility
- **Persistent Data**: Data persistence across pod restarts
- **File Operations**: File read/write capabilities
- **Backup Integration**: Integration with backup systems

## Configuration

### Application Configuration

#### Basic Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: demo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: demo-app
  template:
    metadata:
      labels:
        app: demo-app
    spec:
      containers:
        - name: demo-app
          image: nginx:alpine
          ports:
            - containerPort: 80
```

#### Authentik Integration

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
      name: "Demo App"
      client_id: "demo-app"
      client_secret: "secret"
      redirect_uris:
        - "https://demo.gateway.services.apocrathia.com/auth/callback"
```

#### SMB Storage Integration

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: demo-app-storage
  namespace: demo-app
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: smb
  resources:
    requests:
      storage: 1Gi
```

### Gateway Configuration

#### HTTPRoute Example (Reference Only)

> **Note**: The `httproute.yaml` file is kept as a **reference example** of how HTTPRoutes were previously configured manually. **Authentik now handles HTTPRoute creation automatically** when the outpost is deployed.

```yaml
# This is an example of manual HTTPRoute configuration (no longer needed)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: demo-app
  namespace: demo-app
spec:
  parentRefs:
    - name: main-gateway
      namespace: cilium-system
      sectionName: https
  hostnames:
    - demo.gateway.services.apocrathia.com
  rules:
    - backendRefs:
        - name: ak-outpost-demo-app-outpost
          port: 9000
```

## Integration with Homelab

### Authentik Integration

- **SSO Setup**: Automatic SSO configuration through blueprints
- **User Provisioning**: Automated user account creation
- **Access Control**: Policy-based access control
- **Audit Logging**: Comprehensive authentication audit trails
- **HTTPRoute Management**: **Automatic HTTPRoute creation and management**

### Gateway API Integration

- **Traffic Routing**: Gateway API-based traffic routing
- **TLS Management**: Automatic TLS certificate management
- **Load Balancing**: Intelligent load balancing and failover
- **Security Policies**: Network security policy enforcement
- **Authentik Automation**: **No manual HTTPRoute configuration required**

### Storage Integration

- **SMB Mount**: SMB file share integration via CSI driver
- **Persistent Storage**: Longhorn-based persistent storage
- **Backup Integration**: Integration with backup systems
- **Performance Monitoring**: Storage performance monitoring

### Monitoring Integration

- **Metrics Collection**: Prometheus metrics for application monitoring
- **Dashboard Integration**: Grafana dashboards for visualization
- **Alert Configuration**: Automated alerting for application issues
- **Log Aggregation**: Centralized logging with Loki

## Access and Usage

### External Access

- **URL**: `https://demo.gateway.services.apocrathia.com`
- **Authentication**: SSO through Authentik
- **TLS**: Automatic TLS certificate management
- **Load Balancing**: Intelligent load balancing
- **Routing**: **Automatically managed by Authentik outpost**

### Internal Access

- **Service**: `http://demo-app.demo-app.svc:80`
- **Outpost**: `http://ak-outpost-demo-app-outpost.demo-app.svc:9000`
- **Storage**: SMB mount at `/data`

### Health Checks

- **Readiness**: `/health/ready` endpoint
- **Liveness**: `/health/live` endpoint
- **Metrics**: `/metrics` endpoint for Prometheus

## Security Considerations

### Authentication Security

- **SSO Integration**: Secure single sign-on through Authentik
- **Session Management**: Secure session handling and management
- **Access Control**: Role-based access control policies
- **Audit Logging**: Comprehensive security audit trails

### Network Security

- **TLS Encryption**: End-to-end encryption for all traffic
- **Network Policies**: Cilium network policy enforcement
- **Service Isolation**: Namespace-based service isolation
- **Traffic Control**: Controlled traffic flow and routing

### Data Security

- **Storage Encryption**: Data encryption at rest and in transit
- **Access Control**: Controlled access to storage resources
- **Backup Security**: Secure backup of application data
- **Compliance**: Security and compliance monitoring

## Troubleshooting

### Common Issues

1. **Application Access Issues**

   ```bash
   # Check application pods
   kubectl get pods -n demo-app

   # Check service status
   kubectl get service -n demo-app

   # Note: HTTPRoute is now managed by Authentik
   # Check Authentik outpost status instead
   kubectl get pods -n demo-app -l app=outpost
   ```

2. **Authentication Issues**

   ```bash
   # Check Authentik outpost
   kubectl get pods -n demo-app -l app=outpost

   # Check blueprint configuration
   kubectl get configmap authentik-blueprint -n demo-app

   # Check Authentik logs
   kubectl logs -n demo-app deployment/ak-outpost-demo-app-outpost
   ```

3. **Storage Issues**

   ```bash
   # Check PVC status
   kubectl get pvc -n demo-app

   # Check SMB mount
   kubectl exec -it <pod-name> -n demo-app -- df -h

   # Check storage class
   kubectl get storageclass smb
   ```

### Health Checks

```bash
# Check application health
kubectl get pods -n demo-app

# Check service endpoints
kubectl get endpoints -n demo-app

# Check Authentik outpost (manages routing)
kubectl get pods -n demo-app -l app=outpost

# Check storage status
kubectl get pvc -n demo-app
```

### Log Analysis

```bash
# Application logs
kubectl logs -n demo-app deployment/demo-app

# Outpost logs
kubectl logs -n demo-app deployment/ak-outpost-demo-app-outpost

# Gateway logs
kubectl logs -n cilium-system deployment/cilium-operator
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
3. **Networking**: **Let Authentik handle HTTPRoute management**
4. **Monitoring**: Integrate with monitoring stack for observability

## Resource Requirements

- **Application**: 100m-500m CPU, 128Mi-512Mi memory
- **Outpost**: 50m-200m CPU, 64Mi-256Mi memory
- **Storage**: 1Gi persistent storage
- **Network**: Minimal network overhead

## Template Evolution Notes

### Current State

- **HTTPRoute Management**: **Automatically handled by Authentik outpost**
- **Manual Configuration**: `httproute.yaml` kept as reference example
- **Integration**: Full Authentik SSO, Gateway API, and storage integration

### Future Helm Chart

- **HTTPRoute Handling**: Will leverage Authentik's automatic management
- **Configuration**: Focus on application-specific values, not routing
- **Templates**: Include Authentik blueprint templates for SSO setup

## External Resources

- [Kubernetes Application Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Authentik Outpost Documentation](https://docs.goauthentik.io/docs/outposts/)
- [Gateway API HTTPRoute](https://gateway-api.sigs.k8s.io/api-types/httproute/)
- [SMB CSI Driver](https://github.com/kubernetes-csi/csi-driver-smb)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/data_model/)
