# Housekeeping - Cluster Maintenance Automation

This directory contains the deployment configuration for housekeeping tasks that maintain cluster health and organization.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

The housekeeping deployment provides automated maintenance tasks including:

- **Node Labeling**: Automated labeling of nodes based on characteristics
- **Cluster Organization**: Automated cluster organization and maintenance

> **Note**: Resource cleanup is now handled by [Kyverno cleanup policies](../kyverno/README.md#cleanup-policies) instead of manual cronjobs for better efficiency and reliability.

## Architecture

### Components

#### Node Labels (`node-labels.yaml`)

- **Automated Labeling**: Labels nodes based on hardware, role, or characteristics
- **Dynamic Updates**: Continuously monitors and updates node labels
- **Configuration-Driven**: ConfigMap-based label configuration
- **Resource-Aware**: Considers node resources and capabilities

#### Resource Cleanup (Migrated to Kyverno)

Resource cleanup has been migrated to [Kyverno cleanup policies](../kyverno/README.md#cleanup-policies) which provide:

- **Policy-Native**: Kubernetes-native policy enforcement
- **Real-Time Evaluation**: Continuous evaluation vs scheduled jobs
- **Better Performance**: More efficient than cronjob-based cleanup
- **Integrated Logging**: Better observability and debugging

### Resource Types

The housekeeping system manages:

- **Node Labels**: Dynamic node categorization

> **Resource Cleanup**: ConfigMaps, Secrets, PVCs, Jobs, and Pods are now managed by [Kyverno cleanup policies](../kyverno/README.md#cleanup-policies).

## Features

### Node Management

- **Hardware Detection**: Automatic detection of node hardware capabilities
- **Role Assignment**: Assign roles based on node characteristics
- **Resource Tagging**: Tag nodes based on available resources
- **Dynamic Updates**: Real-time node label updates

### Resource Cleanup

- **Intelligent Cleanup**: Smart identification of unused resources
- **Retention Policies**: Configurable retention periods
- **Safety Checks**: Prevents accidental deletion of active resources
- **Audit Trail**: Comprehensive logging of cleanup actions

### Policy Engine

- **Flexible Policies**: Configurable cleanup and labeling policies
- **Namespace Scoping**: Namespace-specific policies
- **Resource Type Filtering**: Type-specific cleanup rules
- **Time-Based Rules**: Age-based resource management

## Configuration

### Node Labels Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-labels-config
  namespace: housekeeping
data:
  labels.yaml: |
    labels:
      - name: "node-type"
        value: "worker"
        nodes:
          - selector:
              matchLabels:
                kubernetes.io/os: "linux"
      - name: "storage-type"
        value: "ssd"
        nodes:
          - selector:
              matchExpressions:
                - key: "storage-class"
                  operator: "In"
                  values: ["ssd", "nvme"]
```

### Resource Cleanup Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-cleanup-config
  namespace: housekeeping
data:
  cleanup.yaml: |
    policies:
      - name: "old-pods"
        resource: "pods"
        namespace: "*"
        conditions:
          - status.phase: "Succeeded"
          - status.phase: "Failed"
        age: "7d"
      - name: "unused-configmaps"
        resource: "configmaps"
        namespace: "default"
        age: "30d"
        exclude:
          - name: "kube-*"
```

## Integration with Homelab

### Flux Integration

- **GitOps Management**: Housekeeping configuration managed through GitOps
- **Automated Deployment**: Continuous deployment and updates
- **Configuration Sync**: Automatic synchronization of policies
- **Version Control**: Policy versioning and rollback capabilities

### Monitoring Integration

- **Metrics Collection**: Prometheus metrics for cleanup activities
- **Dashboard Integration**: Grafana dashboards for housekeeping monitoring
- **Alert Configuration**: Alerts for cleanup failures or issues
- **Audit Logging**: Comprehensive audit trail of all operations

### Security Integration

- **RBAC Integration**: Proper permissions for cleanup operations
- **Audit Policies**: Security audit logging for sensitive operations
- **Access Control**: Restricted access to housekeeping functions
- **Compliance**: Compliance monitoring for resource management

### Storage Integration

- **Longhorn Integration**: Storage-aware node labeling
- **Backup Coordination**: Coordination with backup schedules
- **Resource Optimization**: Optimal resource placement based on labels
- **Storage Class Awareness**: Storage class-specific labeling

## Security Considerations

### Access Control

- **Minimal Permissions**: Least privilege access for housekeeping operations
- **Namespace Isolation**: Namespace-scoped permissions where possible
- **Audit Logging**: Comprehensive logging of all operations
- **Security Policies**: Integration with Kyverno security policies

### Data Protection

- **Safe Cleanup**: Non-destructive operations with safety checks
- **Backup Verification**: Verify backups before cleanup operations
- **Recovery Procedures**: Documented recovery procedures
- **Compliance**: Regulatory compliance for data cleanup

### Network Security

- **Service Isolation**: Network policies for housekeeping services
- **API Security**: Secure communication with Kubernetes API
- **Authentication**: Proper service account authentication
- **Authorization**: Role-based access control

## Troubleshooting

### Common Issues

1. **Node Labeling Issues**

   ```bash
   # Check node labels
   kubectl get nodes --show-labels

   # Check labeling job logs
   kubectl logs -n housekeeping job/node-labeler

   # Verify configuration
   kubectl describe configmap node-labels-config -n housekeeping
   ```

2. **Resource Cleanup Issues**

   ```bash
   # Check cleanup job status
   kubectl get jobs -n housekeeping

   # Check cleanup logs
   kubectl logs -n housekeeping job/resource-cleanup

   # Verify cleanup configuration
   kubectl describe configmap resource-cleanup-config -n housekeeping
   ```

3. **Permission Issues**

   ```bash
   # Check service account permissions
   kubectl auth can-i --as=system:serviceaccount:housekeeping:housekeeping delete pods

   # Check RBAC configuration
   kubectl describe rolebinding housekeeping -n housekeeping
   ```

### Health Checks

```bash
# Check housekeeping pods
kubectl get pods -n housekeeping

# Check configuration maps
kubectl get configmaps -n housekeeping

# Check cronjob status
kubectl get cronjobs -n housekeeping

# Verify node labels
kubectl get nodes -o custom-columns=NAME:.metadata.name,LABELS:.metadata.labels
```

### Log Analysis

```bash
# Node labeling logs
kubectl logs -n housekeeping -l app=node-labeler

# Resource cleanup logs
kubectl logs -n housekeeping -l app=resource-cleanup

# Cronjob logs
kubectl logs -n housekeeping -l app=housekeeping-cron
```

## Best Practices

### Configuration Management

1. **Policy Testing**: Test policies in development environment first
2. **Gradual Rollout**: Implement policies gradually
3. **Monitoring**: Monitor impact of housekeeping policies
4. **Documentation**: Document all policies and their rationale

### Operations

1. **Scheduled Maintenance**: Run cleanup during maintenance windows
2. **Backup Coordination**: Coordinate with backup schedules
3. **Resource Monitoring**: Monitor resource usage patterns
4. **Performance Impact**: Assess performance impact of labeling

### Security

1. **Access Control**: Implement least privilege access
2. **Audit Logging**: Enable comprehensive audit logging
3. **Policy Review**: Regular review of cleanup policies
4. **Incident Response**: Documented incident response procedures

## Resource Requirements

- **Node Labeler**: 50m-200m CPU, 128Mi-256Mi memory
- **Resource Cleanup**: 100m-500m CPU, 256Mi-512Mi memory
- **Cron Jobs**: Minimal resources, scheduled execution

## External Resources

- [Kubernetes Node Management](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Resource Cleanup Best Practices](https://kubernetes.io/docs/concepts/cluster-administration/manage-deployment/)
- [CronJob Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [RBAC Best Practices](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
