# kmcp

Kubernetes MCP Server controller: reconciles the 14 `MCPServer` CRs under
[`../mcp-servers/`](../mcp-servers/) into Deployments/Services. kagent-crds
1.0.1 dropped the MCPServer CRD and the kagent chart dropped its embedded
kmcp subchart in 1.0.x, so both moved here.

> **Navigation**: [← Back to AI README](../README.md)

## Components

- `kmcp-crds` — `MCPServer` CRD (`kagent.dev/v1alpha1`, unchanged schema from
  the kagent-crds-embedded version)
- `kmcp` — controller (cluster-scoped watch, leader election, secure metrics
  on 8443)

## Rollout prerequisite (operator)

The live `mcpservers.kagent.dev` CRD sits in the deployed `kagent-crds`
0.10.6 release manifest (the chart's `kmcp-crds` subchart), and
kagent-crds 1.0.1 drops it — so that upgrade's prune deletes the CRD and
garbage-collects all 14 MCPServer CRs with it. Helm's delete path skips
only resources annotated `helm.sh/resource-policy=keep`; ownership
annotations are not consulted. Protect the CRD before the kagent-crds
upgrade and drop the annotation once the rollout converges (sequence:
[rollout runbook](../../../../../docs/plans/kagent-substrate-1.0-rollout.md)):

```bash
kubectl annotate --overwrite crd mcpservers.kagent.dev helm.sh/resource-policy=keep
```

No ownership transfer is needed for kmcp-crds to adopt the existing CRD:
the cluster's helm-controller (v1.7.1) runs install with take-ownership
enabled by default (`spec.install.disableTakeOwnership` defaults to
false).

## Troubleshooting

```bash
kubectl get helmrelease -n kagent kmcp-crds kmcp
kubectl get mcpservers -A
kubectl logs -n kagent deployment/kmcp-controller-manager -f
```

## References

- [kmcp](https://github.com/kagent-dev/kmcp) - source
