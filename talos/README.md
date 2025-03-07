# Talos

## Overview

Talos is a modern Kubernetes distribution that is designed to be simple, secure, and reliable. It is a CNCF-certified Kubernetes distribution that is optimized for cloud-native applications.

## Bootstrapping

Start by generating the secrets for the cluster.

```bash
talosctl gen secrets -o secrets.yaml
```

Next, create the configuration for the cluster. We'll set up:

- 4 virtual machine nodes (talos-vm-01 through talos-vm-04)
- All VMs will serve as control plane nodes and can run workloads
- Physical hardware will be added later as worker-only nodes

Generate VM configurations:

```bash
# Generate virtual machine node configurations
talosctl gen config \
  --with-secrets secrets.yaml \
  --config-patch-control-plane @patches/vm-patch.yaml \
  --config-patch-worker @patches/lab-patch.yaml \
  home "https://kubernetes.apocrathia.com:6443" \
  -o rendered/ \
  --force
```

This will generate the following files:

- `controlplane.yaml`: Control plane configuration
- `talosconfig`: Client configuration for talosctl
- `worker.yaml`: Worker configuration

Now, we can bootstrap the control plane nodes. Each node gets its own specific configuration patch to set its hostname:

```bash
# Apply configuration to each node with its specific patch
for i in {1..4}; do
  NODE_NUM=$(printf "%02d" $i)
  IP_LAST_OCTET=$((i + 9))
  echo "Configuring talos-vm-${NODE_NUM} (10.50.8.${IP_LAST_OCTET})..."
  talosctl apply-config --insecure \
    --nodes "10.50.8.${IP_LAST_OCTET}" \
    --file rendered/controlplane.yaml \
    --config-patch "@patches/vm-${NODE_NUM}-patch.yaml"
done
```

While that's happening, let's make sure talosctl is configured to talk to the cluster.

```bash
export TALOSCONFIG="rendered/talosconfig"
talosctl config endpoint 10.50.8.10
talosctl config node 10.50.8.10 10.50.8.11 10.50.8.12 10.50.8.13
cp rendered/talosconfig ~/.talos/config
export TALOSCONFIG="~/.talos/config"
```

Next, we bootstrap the first control plane node.

```bash
talosctl bootstrap --nodes 10.50.8.10
```

Once the cluster is up, let's get the kubeconfig.

```bash
talosctl kubeconfig ~/.kube/config -n 10.50.8.10
```

Verify the cluster is up.

```bash
kubectl get nodes
```

Update the talosconfig to point to the VIP.

```bash
export TALOSCONFIG="rendered/talosconfig"
talosctl config endpoint kubernetes.apocrathia.com
talosctl config node 10.50.8.10 10.50.8.11 10.50.8.12 10.50.8.13
cp rendered/talosconfig ~/.talos/config
export TALOSCONFIG="~/.talos/config"
```

## Adding Worker Nodes

First, we'll need to update our talosconfig to add the new nodes.

```bash
export TALOSCONFIG="rendered/talosconfig"
talosctl config endpoint kubernetes.apocrathia.com
talosctl config node 10.50.8.10 10.50.8.11 10.50.8.12 10.50.8.13 10.50.8.101 10.50.8.102 10.50.8.103
cp rendered/talosconfig ~/.talos/config
export TALOSCONFIG="~/.talos/config"
```

To add physical worker nodes (lab-01 through lab-03) to the cluster:

```bash
# Apply worker configuration to each physical node
for i in {1..3}; do
  NODE_NUM=$(printf "%02d" $i)
  IP_LAST_OCTET=$((100 + i))
  echo "Configuring lab-${NODE_NUM} (10.50.8.${IP_LAST_OCTET})..."
  talosctl apply-config --insecure \
    --nodes "10.50.8.${IP_LAST_OCTET}" \
    --file rendered/worker.yaml \
    --config-patch "@patches/lab-${NODE_NUM}-patch.yaml"
done
```

Verify the new nodes join the cluster:

```bash
kubectl get nodes
```

## Deployments

Now go deploy [Flux](../flux/README.md)

## Cluster Teardown and Rebuild

If you need to completely reset and rebuild the cluster, follow these steps:

Remove Flux and its resources (if installed):

```bash
flux uninstall
```

Reset each node in the cluster:

```bash
# Reset all nodes (this will reboot them)
for node in 10.50.8.{10..13}; do
  echo "Resetting $node..."
  talosctl reset --graceful=false --reboot --nodes $node || true
done
```

Sometimes, this will fail on the first node. If that happens, go into the VM and reset it manually. When it boots from the talos image, select the reset option in the grub boot menu.

Finally remove the talos and kube config files.

```bash
rm ~/.talos/config
rm ~/.kube/config
```

Now, return to the bootstrapping steps and repeat.
