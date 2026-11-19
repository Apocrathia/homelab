# Cilium

Cilium is a Kubernetes-native networking and security solution based on eBPF.

> **Navigation**: [← Back to Infrastructure README](../README.md)

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

`Cilium` and `Operator` should both report `OK`, with every desired pod in
the DaemonSet and operator Deployment ready.

## Troubleshooting

1. Check Cilium pod logs:

   ```bash
   kubectl -n cilium-system logs -l k8s-app=cilium
   ```

2. Verify node labels:

   ```bash
   kubectl get nodes --show-labels | grep cilium
   ```

3. If pods can't communicate between nodes, check that:
   - The Cilium pods are running correctly on every node
   - The correct routing mode is configured

## References

- **[Cilium Documentation](https://docs.cilium.io/)** - Primary documentation source
- **[GitHub Repository](https://github.com/cilium/cilium)** - Source code and issues
