# Cilium

Cilium is a Kubernetes-native networking and security solution based on eBPF.

## Installation

Cilium is installed using the Helm chart from the Cilium project.

To verify the installation, you will need to install the Cilium CLI.

```bash
brew install cilium-cli
```

To verify the installation, you can use the following command:

```bash
cilium status --wait
```

You should see something like the following:

```
$ cilium status -n cilium-system
   /¯¯\
/¯¯\__/¯¯\    Cilium:         OK
\__/¯¯\__/    Operator:       OK
/¯¯\__/¯¯\    Hubble:         disabled
\__/¯¯\__/    ClusterMesh:    disabled
   \__/

DaemonSet         cilium             Desired: 2, Ready: 2/2, Available: 2/2
Deployment        cilium-operator    Desired: 2, Ready: 2/2, Available: 2/2
Containers:       cilium-operator    Running: 2
                  cilium             Running: 2
Image versions    cilium             quay.io/cilium/cilium:v1.9.5: 2
                  cilium-operator    quay.io/cilium/operator-generic:v1.9.5: 2
```

## Troubleshooting

If you encounter issues during migration:

1. Check Cilium pod logs:

   ```bash
   kubectl -n cilium-system logs -l k8s-app=cilium
   ```

2. Verify node labels:

   ```bash
   kubectl get nodes --show-labels | grep cilium
   ```

3. If pods can't communicate between nodes, check that:
   - Both nodes have been migrated to Cilium
   - The Cilium pods are running correctly
   - The correct routing mode is configured
