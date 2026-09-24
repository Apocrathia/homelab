# Chaos Mesh

Chaos Mesh is a cloud-native chaos engineering platform that orchestrates chaos experiments on Kubernetes environments.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

This installation deploys Chaos Mesh v2.7.2 with the following components:

- **Controller Manager**: Manages chaos experiments with leader election for HA
- **Chaos Daemon**: Executes chaos experiments on nodes
- **Dashboard**: Web UI for managing and monitoring chaos experiments
- **DNS Server**: Handles DNS-related chaos experiments

## Security & Namespace Configuration

Chaos Mesh is configured with **FilterNamespace** enabled, which means:

- Chaos experiments can only run in namespaces with the `chaos-mesh.org/inject=enabled` annotation
- This prevents accidental chaos injection into production namespaces

### Adding Chaos Experiments to Other Namespaces

To enable chaos experiments in any other namespace:

```bash
kubectl annotate namespace YOUR_NAMESPACE chaos-mesh.org/inject=enabled
```

**⚠️ Warning:** Only add this annotation to namespaces where you want to allow chaos experiments!

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
- **Metrics**: Comprehensive metrics for experiments and components
- **Health Checks**: Pod health and readiness probes

## Accessing the Dashboard

The Chaos Mesh dashboard is exposed through Authentik authentication at: **https://chaos.gateway.services.apocrathia.com**

The HTTPRoute is created by Authentik's outpost, which the provider-opentofu Workspace creates with the proxy provider already attached.

### Authentik ownership

- **Workspace-owned, full stack** (`crossplane.yaml`, Crossplane provider-opentofu, namespace `chaos-mesh`): proxy provider, application, admins policy binding, and the outpost itself — service connection, replicas, HTTPRoute parent ref, and the outpost <-> provider m2m (the outpost resource's `protocol_providers`). The retired blueprint (`authentik-blueprint.yaml`) is deleted; `terraform.tf` is the single source of truth for the app's complete Authentik stack.
- **Why the outpost lives in TF**: authentik's `OutpostSerializer` (`validate_providers`) rejects creating a provider-less outpost ("This list may not be empty.") and `protocol_providers` is Required on the `authentik_outpost` resource — a blueprint could never create an empty outpost for `authentik_outpost_provider_attachment` to fill afterwards. TF creates the outpost with the provider in one POST.
- **Token**: same 1Password item as headlamp (`crossplane-terraform-secrets`, field `authentik-terraform-token`), materialized into this namespace by the OnePasswordItem in `crossplane.yaml`
- **Module**: the HCL lives in `terraform.tf` and is stitched into the Workspace at build time: `kustomization.yaml` packs the file into a generated ConfigMap (`chaos-mesh-authentik-module`) and a `replacements` rule copies it into `spec.forProvider.module` byte-for-byte. The intermediate ConfigMap stays in the render — builtin patches run before replacements, so a `$patch: delete` would remove the source before the rule consumes it — and carries no `authentik_blueprint` label (no blueprint generator exists here and no blanket label block remains), so the Authentik blueprint sidecar ignores it. The former `patchesJson6902` strip (`terraform-module-cm-labels.json`) is retired with it.

### Dashboard login (RBAC token)

`securityMode: true` means the dashboard itself requires an RBAC token after
Authentik admits you. Paste the token from 1Password:

1. Open 1Password → vault `Secrets` → item `homelab-chaos-mesh-token`
   (category **API Credential**).
2. Copy the `token` field — the `chaos-mesh-dashboard` service-account token.
3. Paste it into the dashboard's token prompt — once per browser.

The token lives in Secret `chaos-mesh-dashboard-token` (`rbac.yaml`); the SA
token controller populates it and `push-secret.yaml` re-pushes it to the
1Password item every 24h. If login stops working, copy the current value from
the item again. (The Sep-2025 flow used item title
`chaos-mesh-dashboard-token`; that old item, if it still exists in the vault,
is not resumed by this restore.)

#### 1Password item category bootstrap

The item must be category **API Credential** to mirror
`homelab-kuber-ios-token` exactly. `push-secret.yaml` cannot express that:
ESO's 1Password provider hardcodes `Category: onepassword.Server` when it
creates an item (no category option exists — `PushSecretMetadata` carries
only `tags` + `vault`), while its update path preserves whatever category an
existing item already has. `homelab-kuber-ios-token` is API Credential for
the same reason: it was created out-of-band and ESO has kept the category on
every 24h refresh since 2026-03-27. The chaos-mesh item landed SERVER when
ESO created it fresh after !4905 (nothing pre-existed under that title), so
the item is rebuilt once out-of-band:

```bash
# 1. Remove the ESO-created SERVER item (soft-deleted; recoverable 30 days
#    from Recently Deleted). The window is safe: ESO re-pushes only on the
#    24h refresh, a source-Secret change, or a PushSecret spec/annotation
#    change.
op item delete homelab-chaos-mesh-token --vault Secrets

# 2. Pre-create the item as an API Credential. Field values are
#    placeholders — ESO overwrites `token` with the real SA token on
#    adoption.
op item create --category "API Credential" --vault Secrets \
  --title homelab-chaos-mesh-token \
  'credential[concealed]=bootstrap-placeholder' \
  'token[concealed]=bootstrap-placeholder' \
  --tags kubernetes,chaos-mesh,readonly

# 3. Adopt immediately (annotation change re-triggers the PushSecret)
#    instead of waiting for the 24h refresh.
kubectl annotate --overwrite -n chaos-mesh pushsecret \
  chaos-mesh-dashboard-token-to-1password \
  category-bootstrap=$(date +%F)

# 4. Verify: category API_CREDENTIAL and `token` no longer a placeholder.
op item get homelab-chaos-mesh-token --vault Secrets --format json \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["category"])'
```

If ESO ever creates this item fresh again (e.g. after the vault item is
deleted and the placeholder bootstrap is skipped), it lands SERVER and the
bootstrap must be rerun.

Scope is **read-only**: `ClusterRole chaos-mesh-dashboard-viewer` grants
get/list/watch on pods, namespaces, and all `chaos-mesh.org` resources. To
create experiments from the dashboard, add write verbs to that ClusterRole in
`rbac.yaml`.

### Alternative Access Methods

If you need direct access (e.g., for API calls), you can still port-forward:

```bash
kubectl port-forward -n chaos-mesh svc/chaos-mesh-dashboard 2333:2333
```

Then access at: http://localhost:2333

## Getting Started with Chaos Experiments

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
2. **YAML**: Direct Kubernetes manifests
3. **CLI**: chaosctl command-line tool

### Example Experiment

Here's an example pod-kill experiment:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-example
  namespace: chaos-mesh
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: my-app
  scheduler:
    cron: "@every 30s"
```

## Best Practices

1. **Start Small**: Begin with simple experiments in non-production namespaces
2. **Monitor Impact**: Always monitor system metrics during experiments
3. **Use Namespaces**: Isolate experiments to specific namespaces
4. **Schedule Wisely**: Use cron expressions for controlled experiment timing
5. **RBAC**: Implement proper access controls for chaos experiment management

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure chaos-daemon has proper privileges for containerd
2. **Socket Path**: Verify containerd socket path is correct for your setup
3. **Network Policies**: Check if network policies block chaos experiment traffic
4. **Resource Limits**: Monitor resource usage as chaos experiments can be resource-intensive

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

For comprehensive documentation, visit:

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
