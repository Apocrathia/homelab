# Reloader - Configuration Reloading

This directory contains the deployment configuration for Reloader, a Kubernetes controller that watches ConfigMaps and Secrets and automatically restarts pods when they change.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

Reloader automatically restarts Kubernetes deployments, StatefulSets, and DaemonSets when their associated ConfigMaps or Secrets are updated, providing:

- **Automatic Reloading**: Seamless configuration updates without manual intervention
- **ConfigMap Watching**: Monitors ConfigMap changes and triggers reloads
- **Secret Watching**: Monitors Secret changes and triggers reloads
- **Annotation-Based**: Uses annotations to specify which resources to reload

## Architecture

### Core Components

#### Reloader Controller

- **Resource Watching**: Watches ConfigMaps and Secrets across the cluster
- **Change Detection**: Detects changes in watched resources
- **Reload Triggering**: Automatically triggers pod restarts
- **Status Management**: Tracks reload status and history

#### Watcher System

- **ConfigMap Watchers**: Monitors ConfigMap modifications
- **Secret Watchers**: Monitors Secret modifications
- **Event Processing**: Processes Kubernetes events
- **Change Notification**: Notifies controller of changes

### Reload Mechanisms

#### Deployment Reloading

- **Rolling Updates**: Performs rolling updates for deployments
- **Health Checks**: Ensures new pods are healthy before continuing
- **Rollback Support**: Automatic rollback on failure
- **Configurable Strategy**: Configurable update strategies

#### StatefulSet Reloading

- **Ordered Updates**: Respects StatefulSet update order
- **Partition Updates**: Supports partitioned updates
- **Volume Management**: Handles persistent volume attachments
- **State Preservation**: Maintains state during updates

#### DaemonSet Reloading

- **Node-Level Updates**: Updates pods on all nodes
- **Rolling Updates**: Rolling updates across nodes
- **Node Affinity**: Respects node affinity rules
- **Resource Constraints**: Considers node resource constraints

## Features

### Configuration Management

- **Annotation-Based**: Uses annotations to specify reload behavior
- **Selective Reloading**: Reload only specific resources
- **Namespace Scoping**: Namespace-specific reloading rules
- **Resource Filtering**: Filter resources by labels and annotations

### Reload Strategies

- **Immediate Reload**: Reload immediately on change detection
- **Batch Reloading**: Batch multiple changes together
- **Scheduled Reloading**: Schedule reloads during maintenance windows
- **Conditional Reloading**: Reload based on specific conditions

### Monitoring and Observability

- **Reload Metrics**: Prometheus metrics for reload operations
- **Event Logging**: Comprehensive event logging
- **Status Tracking**: Track reload status and progress
- **Health Monitoring**: Monitor reloader health and performance

## Configuration

### Basic Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
  annotations:
    reloader.stakater.com/auto: "true"
spec:
  template:
    spec:
      containers:
        - name: app
          image: nginx
```

### Advanced Configuration

#### Selective Reloading

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: selective-app
  annotations:
    reloader.stakater.com/auto: "true"
    reloader.stakater.com/search: "true"
    reloader.stakater.com/match: "configmap|secret"
spec:
  template:
    spec:
      containers:
        - name: app
          image: nginx
```

#### ConfigMap-Specific Reloading

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: configmap-app
  annotations:
    reloader.stakater.com/auto: "true"
    reloader.stakater.com/search: "true"
    reloader.stakater.com/match: "configmap"
    reloader.stakater.com/kind: "configmap"
spec:
  template:
    spec:
      containers:
        - name: app
          image: nginx
```

#### Secret-Specific Reloading

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secret-app
  annotations:
    reloader.stakater.com/auto: "true"
    reloader.stakater.com/search: "true"
    reloader.stakater.com/match: "secret"
    reloader.stakater.com/kind: "secret"
spec:
  template:
    spec:
      containers:
        - name: app
          image: nginx
```

## Integration with Homelab

### Flux Integration

- **GitOps Management**: Reloader configuration managed through GitOps
- **Automated Deployment**: Continuous deployment and updates
- **Configuration Sync**: Automatic synchronization of reload rules
- **Version Control**: Reload rule versioning and rollback

### Application Integration

- **Authentik Integration**: Automatic reloading of Authentik configurations
- **Cert Manager**: Reloading of certificate-related configurations
- **Monitoring Stack**: Reloading of monitoring configurations
- **Storage Components**: Reloading of storage-related configurations

### Monitoring Integration

- **Metrics Collection**: Prometheus metrics for reload operations
- **Dashboard Integration**: Grafana dashboards for reloader monitoring
- **Alert Configuration**: Alerts for reload failures or issues
- **Audit Logging**: Comprehensive audit trail of reload operations

### Security Integration

- **RBAC Integration**: Proper permissions for reload operations
- **Audit Policies**: Security audit logging for reload operations
- **Access Control**: Restricted access to reloader functions
- **Compliance**: Compliance monitoring for configuration changes

## Security Considerations

### Access Control

- **Minimal Permissions**: Least privilege access for reload operations
- **Namespace Isolation**: Namespace-scoped permissions where possible
- **Audit Logging**: Comprehensive logging of all reload operations
- **Security Policies**: Integration with Kyverno security policies

### Configuration Security

- **Change Validation**: Validate configuration changes before reloading
- **Rollback Capability**: Ability to rollback failed reloads
- **Health Verification**: Verify application health after reloads
- **Compliance**: Regulatory compliance for configuration changes

### Network Security

- **Service Isolation**: Network policies for reloader services
- **API Security**: Secure communication with Kubernetes API
- **Authentication**: Proper service account authentication
- **Authorization**: Role-based access control

## Troubleshooting

### Common Issues

1. **Reload Failures**

   ```bash
   # Check reloader logs
   kubectl logs -n reloader deployment/reloader

   # Check deployment status
   kubectl describe deployment <deployment-name>

   # Check pod status
   kubectl get pods -l app=<app-label>
   ```

2. **Annotation Issues**

   ```bash
   # Check annotations
   kubectl get deployment <deployment-name> -o yaml | grep reloader

   # Verify annotation syntax
   kubectl get deployment <deployment-name> -o jsonpath='{.metadata.annotations}'
   ```

3. **Permission Issues**

   ```bash
   # Check service account permissions
   kubectl auth can-i --as=system:serviceaccount:reloader:reloader patch deployments

   # Check RBAC configuration
   kubectl describe rolebinding reloader -n reloader
   ```

### Health Checks

```bash
# Check reloader status
kubectl get pods -n reloader

# Check deployment annotations
kubectl get deployments -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.metadata.annotations.reloader\.stakater\.com/auto}{"\n"}{end}'

# Check reloader metrics
kubectl port-forward -n reloader svc/reloader 9090:9090
curl http://localhost:9090/metrics
```

### Log Analysis

```bash
# Reloader logs
kubectl logs -n reloader deployment/reloader

# Application logs after reload
kubectl logs -n <namespace> deployment/<deployment-name>

# Event logs
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

## Best Practices

### Configuration Management

1. **Selective Reloading**: Only reload necessary resources
2. **Annotation Strategy**: Use consistent annotation patterns
3. **Testing**: Test reload behavior in development environment
4. **Documentation**: Document reload rules and their purpose

### Operations

1. **Monitoring**: Monitor reload operations and their impact
2. **Health Checks**: Implement proper health checks for applications
3. **Rollback Strategy**: Plan for rollback scenarios
4. **Maintenance Windows**: Schedule reloads during maintenance windows

### Security

1. **Access Control**: Implement least privilege access
2. **Audit Logging**: Enable comprehensive audit logging
3. **Change Validation**: Validate configuration changes
4. **Incident Response**: Documented incident response procedures

## Resource Requirements

- **Controller**: 50m-200m CPU, 128Mi-256Mi memory
- **Watchers**: 25m-100m CPU, 64Mi-128Mi memory
- **Metrics**: Minimal additional resources

## External Resources

- [Reloader Documentation](https://github.com/stakater/Reloader)
- [Kubernetes Rolling Updates](https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/)
- [ConfigMap Best Practices](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Secret Management](https://kubernetes.io/docs/concepts/configuration/secret/)
