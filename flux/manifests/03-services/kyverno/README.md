# Kyverno Policies

Policy engine for Kubernetes with admission control and resource cleanup capabilities.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

This deployment includes admission policies and automated cleanup policies for cluster maintenance.

## Block Default Namespace Policy

This policy prevents deployments of workloads to the `default` namespace, enforcing the best practice of using dedicated namespaces for applications.

### Policy Details

The policy `block-default-namespace` applies to the following resource types:

- Deployments
- StatefulSets
- DaemonSets
- Jobs
- CronJobs

When a user attempts to create any of these resources in the `default` namespace, the policy will block the operation with the message:
"Deployments to the default namespace are not allowed. Please use a dedicated namespace."

### Validation Process

The policy deploys through Flux like every other manifest in this repo. To
verify that it is working correctly:

1. Attempt to create a test deployment in the default namespace:

   ```bash
   kubectl apply -f test-violation.yaml
   ```

2. You should receive an error message indicating that the deployment was blocked by the policy.

3. To verify the policy is not blocking valid deployments, try creating the same deployment in a different namespace:
   ```bash
   kubectl create namespace test
   kubectl apply -f test-violation.yaml -n test
   ```
   This should succeed.

### Why Block the Default Namespace?

The `default` namespace is a special namespace in Kubernetes that should be reserved for system components and testing. Using dedicated namespaces for applications provides several benefits:

- Better resource isolation
- Improved security through namespace-level RBAC
- Clearer organization of workloads
- Easier management of resource quotas and limits
- Better visibility into application ownership

## Cleanup Policies

Kyverno provides automated resource cleanup policies for cluster maintenance:

### Active Cleanup Policies

Each policy's age thresholds live in its manifest under `policies/`:

- **cleanup-empty-replicasets**: Removes empty ReplicaSets (replicas: 0)
- **cleanup-stale-pods**: Removes Succeeded/Failed pods (not owned by ReplicaSets/StatefulSets)
- **cleanup-completed-jobs**: Removes completed jobs
- **cleanup-failed-jobs**: Removes failed jobs
- **cleanup-released-pvcs**: Removes PVCs in Released status
- **cleanup-old-events**: Removes Events (backup when API server event TTL not enforced)
- **cleanup-orphaned-configmaps**: Removes ConfigMaps without owner references

`cleanup-orphaned-secrets.yaml` exists under `policies/` but is not listed in
`policies/kustomization.yaml`, so it is not applied. Re-enable it only together
with Secret verbs on `cleanup-rbac.yaml`.

### Benefits of Policy-Based Cleanup

- **Real-time evaluation**: Continuous monitoring and evaluation
- **Policy-native**: Kubernetes-native policy enforcement
- **High performance**: Efficient resource processing
- **Integrated logging**: Built-in observability through Kyverno controllers
- **Declarative**: Configuration managed through GitOps

### Configuration

Cron schedules live in the policy manifests under `policies/`. All policies
exclude system namespaces (kube-system, kyverno).

## Troubleshooting

```bash
# Check Kyverno controller status
kubectl get pods -n kyverno

# View policy reports
kubectl get policyreport --all-namespaces

# Check cleanup policy status
kubectl get cleanuppolicy --all-namespaces

# View Kyverno logs
kubectl logs -n kyverno -l app.kubernetes.io/component=admission-controller
```

## References

- **[Kyverno Documentation](https://kyverno.io/docs/)** - Primary documentation source
- **[GitHub Repository](https://github.com/kyverno/kyverno)** - Source code and issues
