# Installing Cilium on Talos Linux

This guide explains how to install Cilium CNI on Talos Linux using a two-phase approach.

> **Navigation**: [← Back to Talos README](./README.md) | [Next: Deploy Flux →](../flux/README.md)

## Current Cluster Configuration

Our current Talos cluster is configured with:

- **CNI**: `none` (no CNI initially installed)
- **kube-proxy**: `disabled: true` (disabled from the start)
- **Pod Subnets**: `10.42.0.0/16`
- **Service Subnets**: `10.69.0.0/16`
- **VIP**: `10.100.1.8`
- **All nodes**: Control plane nodes with `allowSchedulingOnControlPlanes: true`

## Phase 1: Initial Cluster Bootstrap

For the initial bootstrap, we use the following configuration:

- CNI set to `none` (we'll use Cilium as our CNI)
- kube-proxy disabled (we'll use Cilium's kube-proxy replacement)
- Cilium configured to replace kube-proxy from the start

### Configuration Overview

The Talos configuration is set in the unified patch file:

- `patches/unified-patch.yaml` - For all nodes (control plane and worker)

The patch includes:

```yaml
cluster:
  network:
    cni:
      name: none
  proxy:
    disabled: true
```

### Bootstrap Process

1. Generate the Talos configurations with the unified patch
2. Apply the configurations to your nodes
3. Bootstrap the cluster

At this point, your nodes will be in `NotReady` state because there's no CNI installed yet. You need to install a minimal Cilium configuration to get the nodes ready.

### IMPORTANT: PodSecurity Settings

**Critical Step**: Before installing Cilium, you must create the cilium-system namespace with the appropriate PodSecurity admission labels. This is absolutely essential as Cilium requires privileged access to manage networking.

```bash
# Create cilium-system namespace with privileged PodSecurity settings
kubectl create namespace cilium-system --dry-run=client -o yaml | \
  kubectl patch -f - --type=json --dry-run=client -o yaml \
  --patch '[{"op": "add", "path": "/metadata/labels", "value": {
    "pod-security.kubernetes.io/enforce": "privileged",
    "pod-security.kubernetes.io/audit": "privileged",
    "pod-security.kubernetes.io/warn": "privileged"
  }}]' | kubectl apply -f -
```

Without these PodSecurity settings, Cilium pods will fail to create with errors like "violates PodSecurity baseline:latest" because Cilium requires privileged access, host namespaces, and special capabilities.

### IMPORTANT: Using Direct Node Endpoint

Since we're starting with `proxy.disabled: true` (no kube-proxy), we need to use a direct node endpoint for the initial Cilium installation. The VIP endpoint won't work until Cilium's kube-proxy replacement is running.

**Before installing Cilium, update your kubeconfig to use a direct node endpoint:**

```bash
# Update kubeconfig to use direct node endpoint for initial Cilium installation
talosctl kubeconfig ~/.kube/config -n 10.100.1.80
```

### Installing Cilium

After creating the namespace with proper PodSecurity settings, install Cilium using the recommended settings for Talos Linux:

```bash
# Install minimal Cilium to get nodes ready
helm install cilium cilium/cilium \
  --namespace cilium-system \
  --set ipam.mode=kubernetes \
  --set ipam.operator.clusterPoolIPv4PodCIDR=10.42.0.0/16 \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}" \
  --set securityContext.capabilities.cleanCiliumState="{NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}" \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=127.0.0.1 \
  --set k8sServicePort=6443 \
  --set operator.replicas=1 \
  --set hostServices.enabled=true \
  --set externalIPs.enabled=true \
  --set nodePort.enabled=true \
  --set hostPort.enabled=true \
  --set image.pullPolicy=IfNotPresent \
  --set ipv4NativeRoutingCIDR=10.42.0.0/16 \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set bpf.masquerade=true \
  --set bpf.hostRouting=true \
  --set bpf.hostLegacyRouting=false \
  --set forwardKubeDNSToHost=false
```

### After Cilium Installation

Once Cilium is installed and running, you can switch back to using the VIP endpoint:

```bash
# Switch back to VIP endpoint after Cilium is running
talosctl config endpoint kubernetes.apocrathia.com
talosctl config node 10.100.1.80 10.100.1.81 10.100.1.82 10.100.1.83
cp rendered/talosconfig ~/.talos/config
export TALOSCONFIG="~/.talos/config"
```

This installation will get your nodes to `Ready` state and enable Cilium's kube-proxy replacement from the start.

### Verifying the Bootstrap Installation

After installing the Cilium configuration, check that your nodes are becoming ready:

```bash
kubectl get nodes
```

You should see your nodes transitioning from `NotReady` to `Ready` state. Also check that CoreDNS pods are running:

```bash
kubectl get pods -n kube-system
```

And verify that Cilium pods are running:

```bash
kubectl get pods -n cilium-system
```

## Phase 2: Deploying Full Cilium Configuration via Flux

Once your cluster is up and running with the minimal Cilium installation, you can deploy the full Cilium configuration via Flux:

1. Deploy Flux to manage your cluster resources
2. Flux will deploy the full Cilium configuration with your HelmRelease
3. The HelmRelease includes Gateway API support and advanced features

## Cilium Configuration

The Cilium HelmRelease has been configured with the following Talos-specific settings:

- `securityContext.capabilities.ciliumAgent` - Using specific capabilities instead of privileged mode
- `securityContext.capabilities.cleanCiliumState` - Specific capabilities for the clean state container
- `cgroup.autoMount.enabled: false` - Using Talos cgroup mount
- `cgroup.hostRoot: /sys/fs/cgroup` - Path to cgroups in Talos
- `forwardKubeDNSToHost: false` - Avoiding CoreDNS issues with Talos
- `kubeProxyReplacement: true` - Using Cilium's kube-proxy replacement from the start
- `ipv4NativeRoutingCIDR: 10.42.0.0/16` - Matching our pod subnet
- `routingMode: native` - Using native routing for better performance

## Troubleshooting

If you encounter issues with Cilium on Talos:

1. Check Cilium pods status:

   ```bash
   kubectl -n cilium-system get pods
   ```

2. Check for PodSecurity issues in events:

   ```bash
   kubectl get events -n cilium-system | grep -i error
   ```

3. Verify the PodSecurity settings on the cilium-system namespace:

   ```bash
   kubectl get ns cilium-system -o yaml
   ```

   Ensure it has these labels:

   ```yaml
   pod-security.kubernetes.io/enforce: privileged
   pod-security.kubernetes.io/audit: privileged
   pod-security.kubernetes.io/warn: privileged
   ```

4. Check Cilium logs:

   ```bash
   kubectl -n cilium-system logs -l k8s-app=cilium
   ```

5. If pods are in CrashLoopBackOff state, check the specific error:

   ```bash
   kubectl -n cilium-system describe pod <pod-name>
   ```

6. Common errors and solutions:

   - **"violates PodSecurity baseline:latest"**: The cilium-system namespace doesn't have the proper PodSecurity labels. Apply them as shown above.
   - **"unable to apply caps: operation not permitted"**: This is related to PodSecurity settings. Ensure the namespace has privileged PodSecurity settings.
   - **"failed to create containerd task"**: This can be related to capabilities or security contexts. Check the PodSecurity settings.

7. Run Cilium status check (if cilium CLI is installed):

   ```bash
   cilium status
   ```

8. Known issues:
   - When using Talos with `forwardKubeDNSToHost=true` option (enabled by default) in combination with cilium `bpf.masquerade=true`, CoreDNS may not work correctly. The configuration has been set to `forwardKubeDNSToHost: false` to avoid this issue.
   - If you see PodSecurity violations, ensure the cilium-system namespace has the proper PodSecurity admission labels as shown above.

## Next Steps

After successfully installing Cilium and getting your nodes to `Ready` state, you can proceed to deploy [Flux](../flux/README.md) to manage your cluster resources.

## References

- [Talos Linux Cilium Deployment Guide](https://www.talos.dev/latest/kubernetes-guides/network/deploying-cilium/)
- [Cilium Documentation](https://docs.cilium.io/)
- [Kubernetes PodSecurity Admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/)
