# Infrastructure Components

This directory contains core infrastructure components required for cluster operation.

> **Navigation**: [← Back to Flux README](../README.md)

## Overview

The infrastructure layer provides the foundational services that enable the cluster to function:

- **Networking**: Cilium CNI with Gateway API support
- **Storage**: Longhorn distributed storage with SMB integration
- **Monitoring**: Comprehensive monitoring and observability stack
- **Security**: Policy enforcement and security scanning

## Components

### Networking and Security

- [**Cilium**](cilium/README.md) - CNI, network policies, and Gateway API implementation
- [**CSI Driver SMB**](csi-driver-smb/README.md) - SMB storage integration

### Storage and Data

- [**Longhorn**](longhorn/README.md) - Distributed block storage with backup capabilities

### Monitoring and Observability

- [**Kube Prometheus Stack**](kube-prometheus-stack/README.md) - Prometheus, Grafana, and Alertmanager
- [**Metrics Server**](metrics-server/README.md) - Resource metrics collection for autoscaling

## Architecture

The infrastructure layer provides:

- **Network Foundation**: Cilium CNI with eBPF-based networking
- **Storage Foundation**: Distributed storage with backup and disaster recovery
- **Monitoring Foundation**: Metrics collection, visualization, and alerting
- **Security Foundation**: Policy enforcement and compliance monitoring

## Dependencies

- **Bootstrap Layer**: Flux system, CRDs, and Helm repositories
- **Kubernetes Cluster**: Running cluster with proper RBAC
- **Network Access**: Outbound access to container registries and Helm repositories
- **Storage**: Local storage for persistent volumes

## Integration Points

### With Bootstrap Layer

- **CRD Dependencies**: Requires CRDs from bootstrap layer
- **Helm Repositories**: Uses Helm repositories configured in bootstrap
- **1Password Integration**: Leverages 1Password Connect for secrets

### With Services Layer

- **Storage Provisioning**: Provides storage classes for services
- **Network Policies**: Enables network security for services
- **Monitoring**: Provides monitoring infrastructure for services
- **Security**: Provides policy enforcement for services

## Security Considerations

### Network Security

- **Cilium Policies**: Network policy enforcement and isolation
- **Gateway API**: Secure external access with TLS termination
- **Load Balancer**: Controlled external access and IP management

### Storage Security

- **Longhorn Encryption**: Data encryption at rest and in transit
- **Access Control**: RBAC-based access to storage resources
- **Backup Security**: Secure backup credentials and data

### Monitoring Security

- **Metrics Security**: Secure metrics collection and storage
- **Dashboard Access**: Controlled access to monitoring dashboards
- **Alert Security**: Secure alerting and notification channels

## Troubleshooting

### Common Infrastructure Issues

1. **Network Connectivity**

   ```bash
   # Check Cilium status
   kubectl get pods -n cilium-system

   # Check Gateway API status
   kubectl get gateway -n cilium-system

   # Verify network policies
   kubectl get ciliumnetworkpolicy -A
   ```

2. **Storage Issues**

   ```bash
   # Check Longhorn status
   kubectl get pods -n longhorn-system

   # Check storage classes
   kubectl get storageclass

   # Verify SMB connectivity
   kubectl get pods -n kube-system -l app=csi-smb
   ```

3. **Monitoring Issues**

   ```bash
   # Check Prometheus stack
   kubectl get pods -n prometheus-system

   # Check Grafana
   kubectl get pods -n grafana-system

   # Verify metrics server
   kubectl get pods -n kube-system -l k8s-app=metrics-server
   ```

### Health Checks

```bash
# Check all infrastructure components
kubectl get pods -n cilium-system
kubectl get pods -n longhorn-system
kubectl get pods -n prometheus-system
kubectl get pods -n grafana-system

# Check infrastructure resources
kubectl get gateway -A
kubectl get storageclass
kubectl get crd | grep -E "(cilium|longhorn|prometheus)"
```

## Best Practices

### Infrastructure Design

1. **High Availability**: Deploy multiple replicas for critical components
2. **Resource Management**: Set appropriate resource limits and requests
3. **Security**: Implement defense in depth with multiple security layers
4. **Monitoring**: Comprehensive monitoring of all infrastructure components

### Operations

1. **Backup Strategy**: Regular backup of infrastructure configurations
2. **Update Strategy**: Planned updates with rollback capabilities
3. **Capacity Planning**: Monitor resource usage and plan for growth
4. **Documentation**: Maintain up-to-date documentation and runbooks

### Security

1. **Network Policies**: Implement strict network policies
2. **RBAC**: Principle of least privilege for all components
3. **Secrets Management**: Secure handling of sensitive configuration
4. **Compliance**: Regular security audits and compliance checks

## Next Steps

After infrastructure deployment:

1. **Services Layer**: Deploy platform services and applications
2. **Applications Layer**: Deploy user-facing applications
3. **Monitoring**: Configure dashboards and alerting rules

## External Resources

- [Cilium Documentation](https://docs.cilium.io/)
- [Longhorn Documentation](https://longhorn.io/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/)
