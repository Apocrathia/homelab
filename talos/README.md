# Talos

> **Navigation**: [Home](../README.md) | [Next: Cilium Installation →](./cilium-install.md)

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

Update the talosconfig to point to the VIP.

```bash
export TALOSCONFIG="rendered/talosconfig"
talosctl config endpoint kubernetes.apocrathia.com
talosctl config node 10.100.1.80 10.100.1.81 10.100.1.82 10.100.1.83
cp rendered/talosconfig ~/.talos/config
export TALOSCONFIG="~/.talos/config"
```

## Bootstrapping

We're using 1Password to store the secrets for the cluster. Please refer to the [1Password](../flux/manifests/01-bootstrap/1password/README.md) guide for instructions on how to manually initialize the 1Password Connect Operator.

## Deployments

Go deploy [Flux](../flux/README.md)

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
