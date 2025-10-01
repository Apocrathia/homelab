# Talos

> **Navigation**: [Home](../README.md) | [Next: Cilium Install →](./cilium-install.md) | [Flux Setup →](../flux/README.md)

## Overview

Talos is a modern Kubernetes distribution that is designed to be simple, secure, and reliable. It is a CNCF-certified Kubernetes distribution that is optimized for cloud-native applications.

### Kubernetes Hosts

| Hostname | IP Address  | Role          | Hardware        |
| -------- | ----------- | ------------- | --------------- |
| talos-01 | 10.100.1.80 | Control Plane | Virtual Machine |
| talos-02 | 10.100.1.81 | Control Plane | Virtual Machine |
| talos-03 | 10.100.1.82 | Control Plane | Virtual Machine |
| talos-04 | 10.100.1.83 | Control Plane | Virtual Machine |

## Bootstrapping

Start by generating the secrets for the cluster.

```bash
talosctl gen secrets -o secrets.yaml
```

Next, create the configuration for the cluster. We'll set up all nodes with a unified configuration:

Generate configurations:

```bash
# Generate configurations
talosctl gen config \
  --with-secrets secrets.yaml \
  --config-patch @patches/unified-patch.yaml \
  home "https://kubernetes.apocrathia.com:6443" \
  -o rendered/ \
  --force
export TALOSCONFIG="rendered/talosconfig"
```

This will generate the following files:

- `controlplane.yaml`: Control plane configuration (used for all nodes)
- `talosconfig`: Client configuration for talosctl
- `worker.yaml`: Worker configuration (not used)

Note: We only use the `controlplane.yaml` configuration since all nodes are control plane nodes with `allowSchedulingOnControlPlanes: true` in our unified configuration.

Now, we can bootstrap the control plane nodes. Each node gets its own specific configuration patch to set its hostname:

```bash
# Apply configuration to each node with its specific patch
for i in {1..4}; do
  NODE_NUM=$(printf "%02d" $i)
  IP_LAST_OCTET=$((79 + i))
  echo "Configuring talos-${NODE_NUM} (10.100.1.${IP_LAST_OCTET})..."
  talosctl apply-config --insecure \
    --nodes "10.100.1.${IP_LAST_OCTET}" \
    --file rendered/controlplane.yaml \
    --config-patch "@patches/talos-${NODE_NUM}-patch.yaml"
done
```

While that's happening, let's make sure talosctl is configured to talk to the cluster.

```bash
export TALOSCONFIG="rendered/talosconfig"
talosctl config endpoint 10.100.1.80
talosctl config node 10.100.1.80 10.100.1.81 10.100.1.82 10.100.1.83
cp rendered/talosconfig ~/.talos/config
export TALOSCONFIG="~/.talos/config"
```

Next, we bootstrap the first control plane node.

```bash
talosctl bootstrap --nodes 10.100.1.80
```

Once the cluster is up, let's get the kubeconfig.

```bash
talosctl kubeconfig ~/.kube/config -n 10.100.1.80
```

Wait for the cluster to become ready.

```bash
watch -n 1 kubectl get nodes
```

**Note**: At this point, your nodes will be in `NotReady` state because there's no CNI installed yet. You need to install Cilium to get the nodes ready.

**Important**: Since we're using `proxy.disabled: true`, we need to use a direct node endpoint for the initial Cilium installation. The VIP endpoint won't work until Cilium's kube-proxy replacement is running.

```bash
# Use direct node endpoint for initial Cilium installation
talosctl kubeconfig ~/.kube/config -n 10.100.1.80
```

## Installing Cilium

Before proceeding with Flux deployment, you need to install Cilium to get your nodes to `Ready` state. Follow the [Cilium Installation Guide](./cilium-install.md) for detailed instructions.

The key steps are:

1. Create the `cilium-system` namespace with privileged PodSecurity labels
2. Install Cilium using the provided Helm command
3. Verify that nodes become `Ready`

## Deployments

After Cilium is installed and running, you can switch back to the VIP endpoint:

```bash
# Switch back to VIP endpoint after Cilium is running
export TALOSCONFIG="rendered/talosconfig"
talosctl config endpoint kubernetes.apocrathia.com
talosctl config node 10.100.1.80 10.100.1.81 10.100.1.82 10.100.1.83
cp rendered/talosconfig ~/.talos/config
export TALOSCONFIG="~/.talos/config"
```

Once Cilium is installed and nodes are ready, proceed to deploy [Flux](../flux/README.md).

## Updating Configurations

To update the Talos configuration on existing nodes:

```bash
# Generate new configurations with any changes
talosctl gen config \
  --with-secrets secrets.yaml \
  --config-patch @patches/unified-patch.yaml \
  home "https://kubernetes.apocrathia.com:6443" \
  -o rendered/ \
  --force

# Update the talosconfig to point to the VIP
export TALOSCONFIG="rendered/talosconfig"
talosctl config endpoint kubernetes.apocrathia.com
talosctl config node 10.100.1.80 10.100.1.81 10.100.1.82 10.100.1.83
cp rendered/talosconfig ~/.talos/config
export TALOSCONFIG="~/.talos/config"

# Apply new configurations to all nodes
for i in {1..4}; do
  NODE_NUM=$(printf "%02d" $i)
  IP_LAST_OCTET=$((79 + i))
  echo "Updating talos-${NODE_NUM} (10.100.1.${IP_LAST_OCTET})..."
  talosctl apply-config \
    --nodes "10.100.1.${IP_LAST_OCTET}" \
    --file rendered/controlplane.yaml \
    --config-patch "@patches/talos-${NODE_NUM}-patch.yaml"
done

# Perform a rolling restart of the nodes
for i in {1..4}; do
  NODE_NUM=$(printf "%02d" $i)
  IP_LAST_OCTET=$((79 + i))
  NODE_IP="10.100.1.${IP_LAST_OCTET}"
  echo "Rebooting node talos-${NODE_NUM} (${NODE_IP})..."
  # Cordon the node to prevent new workloads
  kubectl cordon "talos-${NODE_NUM}"
  # Reboot the node
  talosctl reboot --nodes "${NODE_IP}" --timeout=60s
  # Wait for the node to come back online
  while ! kubectl get node "talos-${NODE_NUM}" | grep -q Ready; do
    echo "Waiting for node talos-${NODE_NUM} to become ready..."
    sleep 10
  done
  # Uncordon the node to allow scheduling
  kubectl uncordon "talos-${NODE_NUM}"
  # Wait a bit between reboots to allow cluster stabilization
  sleep 30
done
```

## Upgrading Talos Linux

**Important**: Configuration updates alone do not upgrade the Talos Linux OS version. You must use the `talosctl upgrade` command to perform actual OS upgrades.

### Prerequisites

1. **Check Current Version**: Verify the current Talos version running on your nodes:

   ```bash
   talosctl version --nodes 10.100.1.80
   ```

2. **Update Configuration**: First, update your `unified-patch.yaml` with the new Talos version:

   ```yaml
   machine:
     install:
       # renovate: datasource=github-releases depName=siderolabs/talos
       image: factory.talos.dev/metal-installer/d0a1ee0d6badeabc0ad30f8591df19df685ac5757430ebd918639ee3e128846c:v1.10.6
   ```

3. **Regenerate Configurations**: Generate new configurations with the updated version:

   ```bash
   talosctl gen config \
     --with-secrets secrets.yaml \
     --config-patch @patches/unified-patch.yaml \
     home "https://kubernetes.apocrathia.com:6443" \
     -o rendered/ \
     --force
   ```

4. **Extract Target Version**: Extract the target version from the patch file:
   ```bash
   # Extract version from unified patch file
   TARGET_VERSION=$(grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' patches/unified-patch.yaml | head -1)
   echo "Target Talos version: $TARGET_VERSION"
   ```

### Upgrade Process

**Important**: We use the factory image URL instead of the generic installer image because our nodes require system extensions (iSCSI tools, QEMU guest agent, AMD microcode). The factory image includes these extensions pre-installed.

**Recommended**: Follow the supported upgrade path by upgrading to the latest patch release of each intermediate minor version. For example, if upgrading from v1.9 to v1.11:

- v1.9.x → v1.10.x → v1.11.x

#### Method 1: Rolling Upgrade (Recommended)

Perform a rolling upgrade to minimize cluster downtime:

```bash
# Extract target version from patch file
TARGET_VERSION=$(grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' patches/unified-patch.yaml | head -1)
echo "Upgrading to Talos version: $TARGET_VERSION"

# Upgrade nodes one at a time
for i in {1..4}; do
  NODE_NUM=$(printf "%02d" $i)
  IP_LAST_OCTET=$((79 + i))
  NODE_IP="10.100.1.${IP_LAST_OCTET}"

  echo "Upgrading talos-${NODE_NUM} (${NODE_IP}) to ${TARGET_VERSION}..."

  # Upgrade the node with factory image that includes extensions
  talosctl upgrade \
    --nodes "${NODE_IP}" \
    --image "factory.talos.dev/metal-installer/8b583b5320ff41bf40bd1aea9287923ada45e32a1e2ba0045cb3f6758920ef4a:${TARGET_VERSION}" \
    --wait

  # Wait for the node to rejoin the cluster
  while ! kubectl get node "talos-${NODE_NUM}" | grep -q Ready; do
    echo "Waiting for node talos-${NODE_NUM} to become ready..."
    sleep 10
  done

  echo "Node talos-${NODE_NUM} upgrade completed"
  sleep 30  # Allow cluster stabilization
done
```

#### Method 2: Staged Upgrade (For Troubleshooting)

If you encounter issues with files being held open during upgrade:

```bash
# Extract target version from patch file
TARGET_VERSION=$(grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' patches/unified-patch.yaml | head -1)
echo "Staged upgrade to Talos version: $TARGET_VERSION"

# Use staged upgrade for problematic nodes
talosctl upgrade \
  --nodes 10.100.1.80 \
  --image "factory.talos.dev/metal-installer/8b583b5320ff41bf40bd1aea9287923ada45e32a1e2ba0045cb3f6758920ef4a:${TARGET_VERSION}" \
  --stage
```

### Post-Upgrade Verification

1. **Verify Node Status**:

   ```bash
   kubectl get nodes
   talosctl version --nodes 10.100.1.80 10.100.1.81 10.100.1.82 10.100.1.83
   ```

2. **Check Cluster Health**:

   ```bash
   kubectl get pods --all-namespaces
   kubectl get componentstatuses
   ```

3. **Verify Cilium Status**:
   ```bash
   kubectl get pods -n cilium-system
   cilium status
   ```

### Rollback (If Needed)

If an upgrade fails or causes issues, you can rollback to the previous version:

```bash
# Rollback a specific node
talosctl rollback --nodes 10.100.1.80

# Or rollback all nodes
for i in {1..4}; do
  IP_LAST_OCTET=$((79 + i))
  NODE_IP="10.100.1.${IP_LAST_OCTET}"
  echo "Rolling back ${NODE_IP}..."
  talosctl rollback --nodes "${NODE_IP}"
done
```

### Important Notes

- **Control Plane Protection**: Talos automatically protects etcd quorum during control plane upgrades
- **Workload Drain**: Nodes are automatically cordoned and drained before upgrade
- **A-B Image Scheme**: Talos uses an A-B image scheme for safe rollbacks
- **Kubernetes Version**: Talos upgrades do not automatically upgrade Kubernetes - manage Kubernetes upgrades separately
- **Monitoring**: Use `talosctl dmesg -f` to monitor upgrade progress
- **Simultaneous Upgrades**: Avoid upgrading all nodes simultaneously to prevent cluster instability

### Troubleshooting

- **Upgrade Fails**: Check the installer image reference and network connectivity
- **Node Won't Boot**: Talos will automatically rollback to the previous version
- **Workload Issues**: Use `talosctl rollback` if workloads fail after upgrade
- **File Lock Issues**: Use `--stage` flag for nodes with file access conflicts

## Cluster Teardown and Rebuild

If you need to completely reset and rebuild the cluster, follow these steps:

Remove Flux and its resources (if installed):

```bash
flux uninstall
```

Reset each node in the cluster:

```bash
# Reset all nodes
for node in 10.100.1.{80..83}; do
  echo "Resetting $node..."
  talosctl reset --graceful=false --reboot --nodes $node --wait=false || echo "Failed to reset $node"
done
```

Sometimes, this will fail on the first node. If that happens, go into the VM and reset it manually. When it boots from the talos image, select the reset option in the grub boot menu.

Finally remove the talos and kube config files.

```bash
rm ~/.talos/config
rm ~/.kube/config
```

Now, return to the bootstrapping steps and repeat.
