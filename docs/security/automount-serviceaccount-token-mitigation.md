# Mitigating automountServiceAccountToken Policy Violations

This document provides guidance for addressing Kyverno policy violations from `audit-automount-sa-token.yaml`.

## Policy Overview

The `audit-automount-sa-token` policy audits Pods that don't explicitly disable `automountServiceAccountToken`. By default, Kubernetes mounts ServiceAccount tokens into all Pods, which is a security risk if the Pod doesn't need Kubernetes API access.

**Current Violations**: ~800 resources across 80+ namespaces (Deployments, StatefulSets, DaemonSets, CronJobs, and their child Pods/ReplicaSets).

## Workload Categories

### 1. Generic-App Helm Chart Deployments (~74 HelmReleases)

**Examples**: sonarr, radarr, bazarr, plex, overseerr, demo-app, etc.

**Root Cause**: The `generic-app` helm chart at `helm/generic-app/templates/deployment.yaml` doesn't set `automountServiceAccountToken: false`.

**Fix**: Update the generic-app helm chart to disable SA token mounting by default:

```yaml
# In helm/generic-app/templates/deployment.yaml, add after spec.template.spec:
spec:
  template:
    spec:
      automountServiceAccountToken: false # Add this line
      # ... rest of spec
```

This is a one-time fix that will remediate all generic-app-based deployments upon the next reconciliation.

**Exceptions**: If any generic-app deployment legitimately needs API access (unlikely for most apps), add a values option:

```yaml
# values.yaml
app:
  automountServiceAccountToken: false # Default to false
```

### 2. Authentik Outposts (~50 Deployments)

**Examples**: `ak-outpost-*` deployments in the `authentik` namespace

**Root Cause**: Authentik dynamically creates outpost Deployments via its operator. These deployments don't set `automountServiceAccountToken: false`.

**Fix Options**:

1. **Upstream Issue**: Check if goauthentik/authentik has a configuration option for this (likely not currently supported)
2. **Kyverno Mutation Policy**: Create a mutating policy to inject the setting:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: mutate-authentik-outposts-disable-sa-token
spec:
  rules:
    - name: disable-sa-token-for-outposts
      match:
        any:
          - resources:
              kinds:
                - Deployment
              namespaces:
                - authentik
              names:
                - "ak-outpost-*"
      mutate:
        patchStrategicMerge:
          spec:
            template:
              spec:
                automountServiceAccountToken: false
```

3. **Accept Risk**: Authentik outposts run in a dedicated namespace with limited blast radius. Document the exception and exclude from policy scope.

### 3. Third-Party Helm Charts (Operators & Infrastructure)

These require case-by-case analysis. Some legitimately need API access (operators), others don't.

#### Legitimate API Access Required (Exclude from Policy)

Add these namespaces to the policy's exclude list:

| Namespace                 | Workloads                                  | Reason                                           |
| ------------------------- | ------------------------------------------ | ------------------------------------------------ |
| `cert-manager`            | cert-manager, cainjector, webhook          | Manages cluster certificates, needs API access   |
| `external-secrets-system` | external-secrets, cert-controller, webhook | Syncs secrets, requires API access               |
| `longhorn-system`         | CSI plugins, longhorn-manager              | Storage management requires extensive API access |
| `prometheus-system`       | kube-prometheus-stack-operator             | Manages Prometheus resources                     |
| `postgres-system`         | cloudnative-pg operator                    | Manages PostgreSQL clusters                      |
| `otel-system`             | opentelemetry-operator                     | Auto-instruments workloads                       |
| `trivy-system`            | trivy-operator                             | Scans cluster resources                          |
| `policy-reporter`         | policy-reporter, kyverno-plugin            | Collects policy reports from API                 |
| `grafana-system`          | grafana-operator                           | Manages Grafana resources                        |
| `onepassword-system`      | connect-operator                           | Syncs 1Password items to secrets                 |
| `lws-system`              | lws-controller-manager                     | LeaderWorkerSet controller                       |
| `pasture-system`          | pasture-operator                           | Custom operator                                  |
| `toolhive-system`         | toolhive-operator                          | MCP server operator                              |
| `system-upgrade`          | tuppr                                      | Manages node upgrades                            |
| `renovate`                | renovate-mend-renovate-ce                  | Repository automation                            |
| `gitlab-runner`           | gitlab-runner                              | Spawns job pods, needs API access                |

#### Can Disable SA Token (Fix via Helm Values)

Check each chart's `values.yaml` for settings like:

- `automountServiceAccountToken`
- `serviceAccount.automountToken`
- `podSecurityContext.automountServiceAccountToken`

| Namespace      | Chart                     | How to Fix                                        |
| -------------- | ------------------------- | ------------------------------------------------- |
| `alloy-system` | grafana/alloy             | Check `alloy.mount.automount.serviceAccountToken` |
| `loki-system`  | grafana/loki              | Check individual component values                 |
| `mimir-system` | grafana/mimir-distributed | Check individual component values                 |
| `tempo-system` | grafana/tempo             | Check individual component values                 |
| `headlamp`     | headlamp                  | Check chart values for SA token settings          |
| `jupyterhub`   | jupyterhub/jupyterhub     | Hub and proxy may need different settings         |

For charts without explicit support, use `podLabels` or `podAnnotations` + Kyverno mutation, or open upstream issues.

### 4. MCP Servers (~20 namespaces)

**Pattern**: `mcp-*` namespaces with toolhive-managed MCP server deployments

**Fix**: Update the toolhive operator or base deployment templates to include:

```yaml
spec:
  template:
    spec:
      automountServiceAccountToken: false
```

Most MCP servers are stateless API bridges and don't need Kubernetes API access.

### 5. Application Workloads (Individual Fixes)

Simple apps that don't use the generic-app chart need individual fixes in their HelmRelease values or raw manifests.

**Pattern for HelmRelease values** (if chart supports it):

```yaml
spec:
  values:
    podSecurityContext:
      automountServiceAccountToken: false
    # OR
    serviceAccount:
      automountToken: false
```

### 6. Special Cases

#### kagent Namespace

The kagent namespace contains Kubernetes agents that **legitimately need API access**:

- `k8s-agent`, `helm-agent`, `git-agent` - Need cluster access
- `kagent-controller`, `kagent-kmcp-controller-manager` - Controller workloads

**Action**: Add `kagent` to the policy exclude list.

#### llm-d Namespace

StatefulSets for LLM inference workloads. These likely don't need API access.

**Fix**: Update llm-d HelmRelease or manifests.

#### qdrant Namespace

Qdrant StatefulSet doesn't need API access.

**Fix**: Update HelmRelease values if supported, or use Kyverno mutation.

## Recommended Implementation Order

1. **Phase 1 - Bulk Fix** (High Impact)

   - Update `helm/generic-app` chart - fixes ~74 deployments
   - Add legitimate exceptions to policy exclude list

2. **Phase 2 - Authentik Outposts**

   - Create Kyverno mutation policy for `ak-outpost-*` deployments

3. **Phase 3 - MCP Servers**

   - Update toolhive operator or base templates

4. **Phase 4 - Third-Party Charts**

   - Audit each chart for values support
   - Apply values where available
   - Open upstream issues for charts lacking support

5. **Phase 5 - Remaining Stragglers**
   - Individual fixes or blanket Kyverno mutation policies

## Example Kyverno Mutation Policy (Blanket Fix)

For workloads that can't be fixed at the source, a cluster-wide mutation policy can inject the setting:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: mutate-disable-sa-token-mounting
  annotations:
    policies.kyverno.io/title: Disable SA Token Mounting
    policies.kyverno.io/category: Security
    policies.kyverno.io/severity: medium
spec:
  rules:
    - name: disable-sa-token
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          # Exclude namespaces that legitimately need API access
          - resources:
              namespaces:
                - kube-system
                - kube-public
                - kube-node-lease
                - cilium-system
                - flux-system
                - kyverno
                - cert-manager
                - external-secrets-system
                - longhorn-system
                - prometheus-system
                - postgres-system
                - otel-system
                - trivy-system
                - policy-reporter
                - grafana-system
                - onepassword-system
                - lws-system
                - pasture-system
                - toolhive-system
                - system-upgrade
                - renovate
                - gitlab-runner
                - kagent
      mutate:
        patchStrategicMerge:
          spec:
            automountServiceAccountToken: false
```

**Warning**: Mutation policies can cause unexpected behavior. Test thoroughly in a staging environment first.

## Verification

After applying fixes, verify remediation:

```bash
# Count remaining violations
kubectl get policyreport -A -o json | \
  jq '[.items[] | select(.results != null) | .results[] |
       select(.policy == "audit-automount-sa-token" and .result == "fail")] | length'

# List remaining violations by namespace
kubectl get policyreport -A -o json | \
  jq -r '.items[] | select(.results != null) |
         .metadata.namespace as $ns | .results[] |
         select(.policy == "audit-automount-sa-token" and .result == "fail") |
         "\($ns)"' | sort | uniq -c | sort -rn
```

## Resources

- [Kubernetes Documentation: Configure Service Accounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
- [Kyverno Policy: Disallow Auto-Mount Service Account Token](https://kyverno.io/policies/pod-security/baseline/disallow-auto-mount-service-account-token/)
- [CIS Kubernetes Benchmark: 5.1.6](https://www.cisecurity.org/benchmark/kubernetes) - Ensure that Service Account Tokens are not automatically mounted
