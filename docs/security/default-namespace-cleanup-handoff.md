# Default namespace cleanup (agent handoff)

Operational brief for auditing and removing namespaced objects that should not live in `default`. Target audience: someone with cluster admin access and this Git repo checked out.

## Goals

- Leave `default` with only cluster-expected or intentionally placed objects.
- Remove stale ServiceAccounts, Roles, RoleBindings, and NetworkPolicies that duplicate resources already present in the correct namespaces.
- Remove Kubernetes Dashboard leftovers from `default` as a deprecation cleanup (`headlamp` is the active dashboard path).
- Keep `default` clear of high-volume policy violation Events by fixing the emitting workloads and enforcing Event TTL hygiene.

## Kyverno: `audit-automount-sa-token`

The policy `audit-automount-sa-token` is a **`ClusterPolicy`** (`kyverno.io/v1`, cluster-scoped). It is defined in `flux/manifests/03-services/kyverno/policies/audit-automount-sa-token.yaml` and is not a namespaced object. Policy violation **events** may reference `clusterpolicy/audit-automount-sa-token` while the event object itself is stored in `default` (Events are namespaced); that does not mean the policy lives in `default`.

Do not try to "move" a `ClusterPolicy` into `kyverno` by adding `metadata.namespace` — that would change the API kind or fail validation. If namespaced policies are required, that is a separate design change (`Policy` in `kyverno` namespace with explicit match rules).

### Getting policy Events out of `default`

Events are tied to the namespace of the object that triggered them. For this policy, `default` Events exist because there are still objects in `default` that violate policy or were validated there historically.

Use this sequence:

1. Identify active policy Events in `default`:

   ```bash
   kubectl get events --namespace default \
     --field-selector reason=PolicyViolation \
     --sort-by=.lastTimestamp
   ```

2. Identify the emitting object(s) from the Event `involvedObject`.
3. Remove or relocate those objects from `default` (this doc's main cleanup task).
4. Wait for Event expiry or clear transiently for noise reduction:

   ```bash
   kubectl delete events --namespace default
   ```

5. Verify no new policy Events are generated in `default` after cleanup.

If Event noise remains long-term cluster-wide, tune API server Event TTL at the platform layer; this is separate from namespace cleanup.

## Snapshot used for this writeup

The following reflects a live cluster inspection: `default` had **no** Deployments, StatefulSets, DaemonSets, Jobs, or Pods at the time of the audit. Remaining objects were primarily RBAC, NetworkPolicies, Services, and the standard root CA ConfigMap.

Adjust the cleanup list if your cluster now differs.

## Objects typically expected in `default`

| Kind           | Name               | Notes                                   |
| -------------- | ------------------ | --------------------------------------- |
| Service        | `kubernetes`       | API server Service; do not delete.      |
| ConfigMap      | `kube-root-ca.crt` | Injected by the cluster; do not delete. |
| ServiceAccount | `default`          | Built-in default SA for the namespace.  |

Other Services (for example `kubelet`, `talos`) may be present depending on CNI/platform integration — confirm with platform docs before removal.

## Cleanup candidates observed in `default`

These names appeared in `default` and are strong candidates for **deletion after verification** that equivalent resources exist in the right namespace and nothing still references the `default` copies.

### JupyterHub

| Kind               | Names                              |
| ------------------ | ---------------------------------- |
| ServiceAccount     | `hub`                              |
| Role / RoleBinding | `hub` (binding `hub` → Role `hub`) |
| NetworkPolicy      | `hub`, `proxy`, `singleuser`       |

**Check first:** `jupyterhub` namespace should already contain `hub` Role, RoleBinding, and NetworkPolicies with matching selectors. Compare `kubectl get ...` output between `default` and `jupyterhub` before deleting anything in `default`.

### k8sgpt operator

| Kind               | Names                                                  |
| ------------------ | ------------------------------------------------------ |
| ServiceAccount     | `k8sgpt-operator-controller-manager`                   |
| Role / RoleBinding | `k8sgpt-operator-leader-election-role` and its binding |

**Check first:** `k8sgpt-system` namespace should already contain the same leader-election Role and RoleBinding pattern. If duplicates exist only in `default`, remove the `default` copies after confirming the operator runs in `k8sgpt-system`.

### Kubernetes Dashboard

| Kind               | Names                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| ServiceAccount     | `kubernetes-dashboard-api`, `kubernetes-dashboard-metrics-scraper`, `kubernetes-dashboard-web` |
| Role / RoleBinding | `kubernetes-dashboard-api`, `kubernetes-dashboard-web` (and bindings)                          |

Kubernetes Dashboard is deprecated in this environment in favor of `headlamp`. Treat these resources as intentional cleanup candidates, not migration targets.

**Action direction:** Remove dashboard-related objects from `default` after confirming there is no active Dashboard workload and no dependency chain still referencing these SAs/Roles/RoleBindings.

## Recommended workflow

1. **Inventory:** Enumerate all namespaced resource types in `default` (full sweep beats `kubectl get all`, which omits many kinds).

   ```bash
   kubectl api-resources --verbs=list --namespaced -o name | while read -r r; do
     kubectl get "$r" --namespace default --ignore-not-found --no-headers 2>/dev/null \
       | awk -v res="$r" 'NF{print res "\t" $0}'
   done
   ```

2. **Label and owner checks:** For each candidate object, dump metadata and confirm Helm/Flux ownership:

   ```bash
   kubectl get serviceaccount hub --namespace default -o yaml
   ```

   Look for `meta.helm.sh/release-name`, `app.kubernetes.io/managed-by`, and `kustomize.toolkit.fluxcd.io` labels.

3. **Compare with target namespace:** For JupyterHub and k8sgpt, diff SA/RBAC/NetworkPolicy between `default` and `jupyterhub` / `k8sgpt-system`.

4. **Dashboard deprecation cleanup:** Confirm `headlamp` is the active dashboard path and Kubernetes Dashboard is inactive. Then remove `default` dashboard SAs/RBAC as orphaned deprecation leftovers.

5. **Delete:** Remove confirmed orphans from `default` in an order that respects dependencies (RoleBindings before Roles if needed; ServiceAccounts last if referenced).

6. **Events cleanup:** After object cleanup, delete `default` Events once to clear backlog, then monitor for fresh `PolicyViolation` Events in `default`.

7. **Re-verify:** Re-run the inventory command; confirm no unexpected controllers recreate objects (would indicate an active Helm release or manifest still targeting `default`).

## Git references

| Path                                                                        | Relevance                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `flux/manifests/03-services/kyverno/policies/audit-automount-sa-token.yaml` | ClusterPolicy definition                                                   |
| `flux/manifests/03-services/headlamp/`                                      | Active Kubernetes web UI (replaces deprecated Kubernetes Dashboard)        |
| `flux/manifests/03-services/kyverno/test-violation.yaml`                    | Test resource using `namespace: default` — review whether it should remain |

## Risks

- Deleting RoleBindings or ServiceAccounts still referenced by a Pod (including stale Completed pods) can break workload restarts.
- Removing NetworkPolicies in `default` is safe only if no Pods in `default` rely on them; verify with `kubectl get pods --namespace default` before and after.

## Done criteria

- `default` contains only intentional platform Services/ConfigMaps/SAs and no duplicate app RBAC from JupyterHub, k8sgpt, or dashboard.
- No new `PolicyViolation` Events are emitted in `default` after cleanup verification.
- Kubernetes Dashboard leftovers in `default` are removed as part of deprecation cleanup.
- No unexplained controllers recreating resources in `default` after cleanup.
