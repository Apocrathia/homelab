# Custom Resource Definitions (CRDs) Setup

This directory contains the deployment configuration for Custom Resource Definitions (CRDs) required by the various components in my homelab cluster so that they can be applied to the cluster before the controllers are deployed.

> **Navigation**: [← Back to Bootstrap README](../README.md)

## Overview

CRDs extend the Kubernetes API with custom resources that define new object types. This deployment installs CRDs for:

- **Cilium**: Networking and security policies
- **Kyverno**: Policy management and enforcement
- **Longhorn**: Distributed storage management
- **Prometheus**: Monitoring and alerting resources

## Components

### Cilium CRDs (`cilium/`)

Deploys CRDs for Cilium CNI including:

- `CiliumNetworkPolicy` - Network security policies
- `CiliumClusterwideNetworkPolicy` - Cluster-wide network policies
- `CiliumExternalWorkload` - External workload management
- `CiliumIdentity` - Security identity management
- `CiliumNode` - Node-specific configuration
- `CiliumEndpointSlice` - Endpoint management

### Kyverno CRDs (`kyverno/`)

Deploys CRDs for Kyverno policy engine including:

- `ClusterPolicy` - Cluster-wide policy definitions
- `Policy` - Namespaced policy definitions
- `ClusterPolicyReport` - Policy compliance reports
- `PolicyReport` - Namespaced policy reports
- `AdmissionReport` - Admission control reports
- `BackgroundScanReport` - Background scan results

### Longhorn CRDs (`longhorn/`)

Deploys CRDs for Longhorn storage including:

- `Volume` - Storage volume management
- `Engine` - Storage engine instances
- `Replica` - Data replica management
- `Node` - Storage node management
- `Backup` - Backup configuration
- `BackupTarget` - Backup target definitions
- `RecurringJob` - Automated backup jobs

### Prometheus CRDs (`prometheus/`)

Deploys CRDs for Prometheus monitoring stack including:

- `Prometheus` - Prometheus server instances
- `Alertmanager` - Alert management
- `ServiceMonitor` - Service monitoring configuration
- `PodMonitor` - Pod monitoring configuration
- `PrometheusRule` - Alerting rules
- `ThanosRuler` - Thanos ruler instances

## Deployment Process

These CRDs are deployed as part of the bootstrap process and must be installed before their respective controllers. The deployment uses Kustomize to manage:

- Resource ordering (CRDs before controllers)
- Namespace isolation
- Version management
- Dependency management

## Architecture Integration

The CRDs integrate with the overall homelab architecture by:

- **Providing APIs** for controllers to manage custom resources
- **Enabling GitOps** management through Flux
- **Supporting multi-tenancy** through namespaced resources
- **Maintaining compatibility** with upstream projects

## Security Considerations

- CRDs are cluster-scoped resources requiring appropriate RBAC
- All CRDs follow principle of least privilege
- Version compatibility is managed through Flux
- Resource validation is enforced by OpenAPI schemas

## Monitoring and Maintenance

CRDs are monitored through:

- **Flux reconciliation** status
- **Resource usage metrics** via kube-prometheus-stack
- **Policy compliance** via Kyverno
- **Custom alerts** for CRD availability

## Troubleshooting

### Common Issues

1. **CRD Installation Failures**

   ```bash
   # Check CRD status
   kubectl get crd | grep -E "(cilium|kyverno|longhorn|prometheus)"

   # Check for validation errors
   kubectl describe crd <crd-name>
   ```

2. **Version Conflicts**

   ```bash
   # Check installed versions
   kubectl get crd <crd-name> -o yaml | grep version

   # Force update if needed
   kubectl replace -f crd-definition.yaml
   ```

3. **Resource Conflicts**
   ```bash
   # Check for conflicting resources
   kubectl get all -A | grep conflicting-name
   ```

### Verification Commands

```bash
# Verify all CRDs are installed
kubectl api-resources | grep -E "(cilium|kyverno|longhorn|monitoring)"

# Check CRD health
kubectl get crd -o custom-columns=NAME:.metadata.name,VERSION:.spec.versions[0].name

# Test CRD functionality
kubectl explain <resource-type>.<group>
```

## Best Practices

1. **Version Management**: Keep CRDs in sync with controller versions
2. **Backup Strategy**: Include CRDs in cluster backup procedures
3. **Change Management**: Use GitOps for CRD updates
4. **Testing**: Validate CRD changes in non-production first
5. **Documentation**: Maintain up-to-date API documentation

## External Resources

- [Kubernetes CRD Documentation](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
- [Cilium CRD Reference](https://docs.cilium.io/en/stable/concepts/kubernetes/crd/)
- [Kyverno CRD Documentation](https://kyverno.io/docs/crds/)
- [Longhorn CRD Reference](https://longhorn.io/docs/1.6.0/references/)
- [Prometheus Operator CRDs](https://prometheus-operator.dev/docs/operator/api/)
