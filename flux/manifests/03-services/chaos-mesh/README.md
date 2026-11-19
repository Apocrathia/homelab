# Chaos Mesh

Chaos engineering platform for Kubernetes: schedules and runs fault-injection experiments against pods, network, DNS, IO, and more.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

This installation deploys Chaos Mesh with the following components (chart version pinned in `helmrelease.yaml`):

- **Controller Manager**: Manages chaos experiments with leader election for HA
- **Chaos Daemon**: Executes chaos experiments on nodes
- **Dashboard**: Web UI for managing and monitoring chaos experiments
- **DNS Server**: Handles DNS-related chaos experiments

## Security & Namespace Configuration

Chaos Mesh is configured with **FilterNamespace** enabled, which means:

- Chaos experiments can only run in namespaces with the `chaos-mesh.org/inject=enabled` annotation
- This prevents accidental chaos injection into production namespaces

### Adding chaos experiments to other namespaces

To enable chaos experiments in any other namespace:

```bash
kubectl annotate namespace YOUR_NAMESPACE chaos-mesh.org/inject=enabled
```

**Warning:** Only add this annotation to namespaces that should receive chaos experiments.

## Configuration

### Runtime Configuration

The installation is configured for **containerd** runtime, which is compatible with your Talos-based cluster:

```yaml
runtime: containerd
containerdRuntime: containerd
socketPath: /run/containerd/containerd.sock
```

### Chaos Types Enabled

The following chaos experiment types are enabled:

- **Pod Chaos**: pod-kill, pod-failure, container-kill
- **Network Chaos**: network-delay, network-loss, network-duplication
- **IO Chaos**: io-delay, io-error, io-attrOverride
- **Stress Chaos**: CPU/memory stress injection
- **Time Chaos**: time skew injection
- **DNS Chaos**: DNS resolution manipulation
- **HTTP Chaos**: HTTP request/response manipulation
- **JVM Chaos**: Java application chaos (if applicable)
- **Kernel Chaos**: Kernel fault injection
- **Filesystem Chaos**: Filesystem fault injection

### Security

- **Authentication Enabled**: Dashboard requires authentication
- **Admission Webhooks**: Enabled for experiment validation

### Monitoring

- **Prometheus Integration**: ServiceMonitor for metrics collection
- **Health Checks**: Pod health and readiness probes

## Accessing the Dashboard

The Chaos Mesh dashboard is exposed through Authentik authentication at: **https://chaos.gateway.services.apocrathia.com**

The HTTPRoute is created by Authentik's outpost, which the provider-opentofu Workspace creates with the proxy provider already attached.

### Authentik ownership

- **Workspace-owned, full stack** (`crossplane.yaml` + `authentik.tf`, the canonical file pair; Crossplane provider-opentofu, namespace `chaos-mesh`): proxy provider, application, admins policy binding, and the outpost itself: service connection, replicas, HTTPRoute parent ref, and the outpost <-> provider m2m (the outpost resource's `protocol_providers`). `authentik.tf` is the single source of truth for the app's complete Authentik stack.
- **Why the outpost lives in TF**: authentik's `OutpostSerializer` (`validate_providers`) rejects creating a provider-less outpost ("This list may not be empty.") and `protocol_providers` is Required on the `authentik_outpost` resource: a blueprint could never create an empty outpost for `authentik_outpost_provider_attachment` to fill afterwards. TF creates the outpost with the provider in one POST.
- **Token**: same 1Password item as headlamp (`crossplane-terraform-secrets`, field `authentik-terraform-token`), materialized into this namespace by the OnePasswordItem in `crossplane.yaml`
- **Module (Inline file pair)**: the Workspace is a thin shell: `source: Inline`, with the module content stitched in at kustomize build time from `authentik.tf` (configMapGenerator + replacements; the rendered module byte-identical to the HCL file), and `kustomization.yaml` renders only the tofu docs plus the stitch ConfigMap. No varmap: the app values live in the HCL. Three live-vs-default overrides ride inline in `authentik.tf`: `internal_host` points at the dashboard service `http://chaos-dashboard.chaos-mesh.svc.cluster.local:2333`, not the app-name pattern the chart would compose; `intercept_header_auth = true` (module default false); and `access_token_validity = "minutes=10"` (TF default; the module proxy default is `hours=1`). NOT shared: live carries only the admins binding (no users binding, no tailnet parentRef).
- **Same-state, address parity**: the inline HCL mirrors `terraform/modules/authentik-app` exactly (the module-era state addresses): no state-mv gate, no recreate, no import ids anywhere in git, uuids intact, nobody re-logs in. There are no import blocks in git: tofu state holds the objects, and if the state Secret is ever lost, re-adopt via manual `tofu import` (ids from the live DB).

### Dashboard login (RBAC token)

`securityMode: true` means the dashboard itself requires an RBAC token after
Authentik admits you. Paste the token from 1Password:

1. Open 1Password → vault `Secrets` → item `homelab-chaos-mesh-token`.
2. Copy the `token` field: the `chaos-mesh-dashboard` service-account token.
3. Paste it into the dashboard's token prompt, once per browser.

The token lives in Secret `chaos-mesh-dashboard-token` (`rbac.yaml`); the SA
token controller populates it and `push-secret.yaml` re-pushes it to the
1Password item every 24h. If login stops working, copy the current value from
the item again. (The Sep-2025 flow used item title
`chaos-mesh-dashboard-token`; that old item, if it still exists in the vault,
is not resumed by this restore.)

Scope is **read-only**: `ClusterRole chaos-mesh-dashboard-viewer` grants
get/list/watch on pods, namespaces, and all `chaos-mesh.org` resources. To
create experiments from the dashboard, add write verbs to that ClusterRole in
`rbac.yaml`.

### Alternative access methods

If you need direct access (e.g., for API calls), you can still port-forward:

```bash
kubectl port-forward -n chaos-mesh svc/chaos-mesh-dashboard 2333:2333
```

Then access at: http://localhost:2333

## Getting started with chaos experiments

### 1. Verify Installation

```bash
# Check all Chaos Mesh pods are running
kubectl get pods -n chaos-mesh

# Verify chaos-daemon is running on all nodes
kubectl get daemonset chaos-daemon -n chaos-mesh
```

### 2. First Chaos Experiment

Create a simple pod-kill experiment in the chaos-test namespace:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-demo
  namespace: chaos-mesh
spec:
  action: pod-kill
  mode: one
  duration: 30s
  selector:
    namespaces:
      - chaos-test
    labelSelectors:
      app: demo-app
  scheduler:
    cron: "@every 1m"
```

Apply the experiment:

```bash
kubectl apply -f pod-kill-demo.yaml
```

### 3. Monitor Experiments

- **Dashboard**: Use the web UI at https://chaos.gateway.services.apocrathia.com
  - Requires authentication: Authentik SSO, then the dashboard RBAC token
    (see [Dashboard login](#dashboard-login-rbac-token))
- **CLI**: Check experiment status with `kubectl get podchaos -n chaos-mesh`
- **Logs**: View controller logs with `kubectl logs -n chaos-mesh deployment/chaos-controller-manager`

## Usage

### Creating Experiments

You can create chaos experiments through:

1. **Dashboard**: Web UI for creating and managing experiments
2. **YAML**: Direct Kubernetes manifests (see the example above)
3. **CLI**: chaosctl command-line tool

Ready-made experiments live in [`experiments/`](experiments/README.md).

## Best Practices

1. Start with simple experiments in non-production namespaces
2. Watch system metrics during every experiment
3. Keep experiments isolated to their namespaces
4. Use cron schedules to control experiment timing
5. Gate experiment management behind proper RBAC

## Troubleshooting

### Common issues

1. Permission errors: ensure chaos-daemon has proper privileges for containerd
2. Socket path: verify the containerd socket path is correct for your setup
3. Network policies: check whether they block chaos experiment traffic
4. Resource limits: watch usage; chaos experiments can be resource-intensive

### Logs

Check component logs for troubleshooting:

```bash
# Controller manager logs
kubectl logs -n chaos-mesh deployment/chaos-controller-manager

# Chaos daemon logs
kubectl logs -n chaos-mesh daemonset/chaos-daemon

# Dashboard logs
kubectl logs -n chaos-mesh deployment/chaos-dashboard
```

## References

- [Chaos Mesh Documentation](https://chaos-mesh.org/docs/)
- [GitHub Repository](https://github.com/chaos-mesh/chaos-mesh)

## Integration

Chaos Mesh integrates with:

- **Authentik**: single sign-on through the workspace-managed proxy provider; outpost-managed HTTPRoute
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Dashboards for chaos experiment monitoring
- **Kyverno**: Policy-based chaos experiment governance
- **Cert-Manager**: Certificate management for dashboard
- **Gateway API**: Automatic HTTPRoute management through Authentik outpost

## Security Considerations

- Dashboard authentication is enabled for production security
- Regular security audits of chaos experiments
- Network policies to restrict chaos experiment scope
