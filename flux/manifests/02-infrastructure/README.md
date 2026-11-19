# Infrastructure Components

Core infrastructure components required for cluster operation.

> **Navigation**: [← Back to Flux README](../../README.md)

## Overview

The infrastructure layer provides:

- **Networking**: Cilium CNI with Gateway API support
- **Storage**: Longhorn distributed storage with SMB integration
- **Monitoring**: monitoring and observability stack
- **Security**: policy enforcement and security scanning

## Components

### Networking and Security

- [**Cilium**](cilium/README.md) - CNI, network policies, and LB IPAM/L2 announcements
- [**CSI Driver SMB**](csi-driver-smb/README.md) - SMB CSI driver for static per-app share mounts
- [**CoreDNS**](coredns/README.md) - GitOps patches for the Talos-deployed cluster DNS
- [**API Server**](apiserver/README.md) - FlowSchemas and priority levels for API fairness

### Storage and Data

- [**Longhorn**](longhorn/README.md) - Distributed block storage with backup capabilities
- [**Snapshot Controller**](snapshot-controller/README.md) - CSI volume snapshot stack
- [**Kopiur**](kopiur/README.md) - Kopia-native backup operator

### Monitoring and Observability

- [**Kube Prometheus Stack**](kube-prometheus-stack/README.md) - Prometheus, Grafana, and Alertmanager
- [**Metrics Server**](metrics-server/README.md) - Resource metrics collection for autoscaling

## Dependencies

- **Bootstrap Layer**: Flux system, CRDs, and Helm repositories
- **Kubernetes Cluster**: Running cluster with proper RBAC
- **Network Access**: Outbound access to container registries and Helm repositories
- **Storage**: Local storage for persistent volumes

## Troubleshooting

### Common Infrastructure Issues

1. **Network Connectivity**

   ```bash
   # Check Cilium status
   kubectl get pods -n cilium-system

   # Check Gateway API status (Envoy Gateway owns the gateways)
   kubectl get gateway -n envoy-system

   # Verify network policies
   kubectl get ciliumnetworkpolicy -A
   ```

2. **Storage Issues**

   ```bash
   # Check Longhorn status
   kubectl get pods -n longhorn-system

   # Check storage classes
   kubectl get storageclass

   # Verify SMB driver pods
   kubectl get pods -n kube-system | grep csi-smb
   ```

3. **Monitoring Issues**

   ```bash
   # Check Prometheus stack (Grafana included)
   kubectl get pods -n prometheus-system

   # Verify metrics server
   kubectl get pods -n kube-system | grep metrics-server
   ```

### Health Checks

```bash
# Check all infrastructure components
kubectl get pods -n cilium-system
kubectl get pods -n longhorn-system
kubectl get pods -n prometheus-system

# Check infrastructure resources
kubectl get gateway -A
kubectl get storageclass
kubectl get crd | grep -E "(cilium|longhorn|prometheus)"
```

## References

- **[Cilium](https://docs.cilium.io/)** - CNI and networking
- **[Longhorn](https://longhorn.io/docs/)** - Distributed storage
- **[Prometheus Operator](https://prometheus-operator.dev/)** - Monitoring stack
