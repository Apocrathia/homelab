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
  home "https://10.50.8.8:6443" \
  -o rendered/
```

This will generate the following files:

- `controlplane.yaml`: Control plane configuration
- `talosconfig`: Client configuration for talosctl
- `worker.yaml`: Worker configuration

Now, we can bootstrap the control plane nodes.

```bash
for i in {10..13}; do
  talosctl apply-config --insecure \
 --nodes 10.50.8.$i \
 --file rendered/controlplane.yaml
done
```

While that's happening, let's make sure talosctl is configured to talk to the cluster.

```bash
export TALOSCONFIG="rendered/talosconfig"
talosctl config endpoint 10.50.8.10
talosctl config node 10.50.8.10
cp rendered/talosconfig ~/.talos/config
```

Next, we bootstrap the first control plane node.

```bash
talosctl bootstrap
```

Once the cluster is up, let's get the kubeconfig.

```bash
talosctl kubeconfig ~/.kube/config
```

Verify the cluster is up.

```bash
kubectl get nodes
```

Now go deploy Flux
