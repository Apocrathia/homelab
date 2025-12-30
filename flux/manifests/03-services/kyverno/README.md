# Kyverno Policy: Block Default Namespace

This policy prevents deployments of workloads to the `default` namespace, enforcing the best practice of using dedicated namespaces for applications.

## Policy Details

The policy `block-default-namespace` applies to the following resource types:

- Deployments
- StatefulSets
- DaemonSets
- Jobs
- CronJobs

When a user attempts to create any of these resources in the `default` namespace, the policy will block the operation with the message:
"Deployments to the default namespace are not allowed. Please use a dedicated namespace."

## Validation Process

To verify that the policy is working correctly:

1. Apply the policy:

   ```bash
   kubectl apply -f block-default-namespace.yaml
   ```

2. Attempt to create a test deployment in the default namespace:

   ```bash
   kubectl apply -f test-violation.yaml
   ```

3. You should receive an error message indicating that the deployment was blocked by the policy.

4. To verify the policy is not blocking valid deployments, try creating the same deployment in a different namespace:
   ```bash
   kubectl create namespace test
   kubectl apply -f test-violation.yaml -n test
   ```
   This should succeed.

## Why Block the Default Namespace?

The `default` namespace is a special namespace in Kubernetes that should be reserved for system components and testing. Using dedicated namespaces for applications provides several benefits:

- Better resource isolation
- Improved security through namespace-level RBAC
- Clearer organization of workloads
- Easier management of resource quotas and limits
- Better visibility into application ownership

## Cleanup Policies

Kyverno provides automated resource cleanup policies for cluster maintenance:

### Active Cleanup Policies

- **cleanup-empty-replicasets**: Removes empty ReplicaSets (replicas: 0) older than 1 hour
- **cleanup-stale-pods**: Removes Succeeded/Failed pods older than 1 hour (not owned by ReplicaSets/StatefulSets)
- **cleanup-completed-jobs**: Removes completed jobs older than 24 hours
- **cleanup-failed-jobs**: Removes failed jobs older than 7 days
- **cleanup-released-pvcs**: Removes PVCs in Released status
- **cleanup-old-events**: Removes Events older than 48 hours (backup when API server event TTL not enforced)
- **cleanup-orphaned-configmaps**: Removes ConfigMaps without owner references older than 30 days
- **cleanup-orphaned-secrets**: Removes Secrets without owner references older than 30 days

### Benefits of Policy-Based Cleanup

- **Real-time evaluation**: Continuous monitoring and evaluation
- **Policy-native**: Kubernetes-native policy enforcement
- **High performance**: Efficient resource processing
- **Integrated logging**: Built-in observability through Kyverno controllers
- **Declarative**: Configuration managed through GitOps

### Configuration

Most cleanup policies run hourly (`0 * * * *`). Orphaned ConfigMaps and Secrets cleanup policies run daily at 2 AM (`0 2 * * *`) to reduce overhead on high-frequency operations. All policies exclude system namespaces (kube-system, kyverno).

## Related Policies

This is part of a broader set of security and best practice policies implemented through Kyverno. See other policies in this directory for additional security controls.
