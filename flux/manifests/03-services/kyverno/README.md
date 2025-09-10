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

Kyverno also provides automated resource cleanup policies that replace manual cronjob-based cleanup:

### Active Cleanup Policies

- **cleanup-empty-replicasets**: Removes empty ReplicaSets (replicas: 0) older than 1 hour
- **cleanup-stale-pods**: Removes Succeeded/Failed pods older than 1 hour (not owned by ReplicaSets/StatefulSets)
- **cleanup-completed-jobs**: Removes completed jobs older than 24 hours
- **cleanup-failed-jobs**: Removes failed jobs older than 7 days
- **cleanup-released-pvcs**: Removes PVCs in Released status

### Benefits over Cronjob Cleanup

- **Real-time evaluation**: Continuous monitoring vs scheduled execution
- **Policy-native**: Kubernetes-native policy enforcement
- **Better performance**: More efficient resource usage
- **Integrated logging**: Better observability through Kyverno controllers
- **Declarative**: Configuration managed through GitOps

### Configuration

All cleanup policies run hourly (`0 * * * *`) and exclude system namespaces (kube-system, kyverno).

> **Migration**: Resource cleanup has been migrated from [housekeeping cronjobs](../housekeeping/README.md) to these Kyverno policies for better efficiency and reliability.

## Related Policies

This is part of a broader set of security and best practice policies implemented through Kyverno. See other policies in this directory for additional security controls.
