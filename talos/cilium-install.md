# Installing Cilium on Talos Linux

This guide explains how to install Cilium CNI on Talos Linux using a two-phase approach.

> **Navigation**: [← Back to Talos README](./README.md) | [Next: Deploy Flux →](../flux/README.md)

## Phase 1: Initial Cluster Bootstrap with kube-proxy

For the initial bootstrap, we'll use the following configuration:

- CNI set to `none` (we'll use Cilium as our CNI)
- kube-proxy enabled (temporarily for initial bootstrap)
- Cilium configured to coexist with kube-proxy

### Configuration Overview

The Talos configuration has been updated in the following patch files:

- `unified-patch.yaml` - For all nodes (unified configuration)
- `talos-01-patch.yaml` through `talos-04-patch.yaml` - Node-specific hostname and certSANs

The unified patch includes:

```yaml
cluster:
  network:
    cni:
      name: none
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

### Installing Cilium

After creating the namespace with proper PodSecurity settings, install Cilium using the recommended settings for Talos Linux:

```bash
# Install minimal Cilium to get nodes ready
helm install cilium cilium/cilium \
  --namespace cilium-system \
  --set ipam.mode=kubernetes \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}" \
  --set securityContext.capabilities.cleanCiliumState="{NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}" \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup \
  --set kubeProxyReplacement=false \
  --set operator.replicas=1 \
  --set hostServices.enabled=false \
  --set externalIPs.enabled=false \
  --set nodePort.enabled=false \
  --set hostPort.enabled=false \
  --set image.pullPolicy=IfNotPresent
```

This minimal installation will get your nodes to `Ready` state so you can:

4. Deploy Flux
5. Flux will then deploy the full Cilium configuration with your HelmRelease

### Verifying the Bootstrap Installation

After installing the minimal Cilium configuration, check that your nodes are becoming ready:

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

## Phase 2: Migrating to Cilium kube-proxy Replacement

Once your cluster is up and running with Cilium and kube-proxy, you can migrate to using Cilium's kube-proxy replacement:

1. Update the Cilium HelmRelease to enable kube-proxy replacement:

   ```yaml
   kubeProxyReplacement: true
   k8sServiceHost: "kubernetes.apocrathia.com"
   k8sServicePort: 6443
   ```

2. After Cilium is updated and stable, update your Talos machine configurations to disable kube-proxy:

   ```yaml
   cluster:
     proxy:
       disabled: true
   ```

3. Apply the updated machine configurations to all nodes

## Cilium Configuration

The Cilium HelmRelease has been configured with the following Talos-specific settings:

- `securityContext.capabilities.ciliumAgent` - Using specific capabilities instead of privileged mode
- `securityContext.capabilities.cleanCiliumState` - Specific capabilities for the clean state container
- `cgroup.autoMount.enabled: false` - Using Talos cgroup mount
- `cgroup.hostRoot: /sys/fs/cgroup` - Path to cgroups in Talos
- `forwardKubeDNSToHost: false` - Avoiding CoreDNS issues with Talos

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

- [Talos Linux Cilium Deployment Guide](https://www.talos.dev/v1.9/kubernetes-guides/network/deploying-cilium/)
- [Cilium Documentation](https://docs.cilium.io/)
- [Kubernetes PodSecurity Admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/)
