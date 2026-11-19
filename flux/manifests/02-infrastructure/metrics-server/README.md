# Metrics Server

Container resource metrics for Kubernetes autoscaling pipelines.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

Metrics Server aggregates CPU/memory usage from kubelet summary APIs on each
node and serves them through the `metrics.k8s.io` API: the data source the
Horizontal Pod Autoscaler and `kubectl top` rely on.

- Deployed into `kube-system` (`helmrelease.yaml`); chart version pinned and
  Renovate-managed
- Kubelet-preferred address type and TLS handling configured in
  `helmrelease.yaml` (Talos nodes self-sign kubelet certs)
- ServiceMonitor enabled for the existing Prometheus stack

Node-level system metrics (the Node Exporter dashboards) come from
kube-prometheus-stack, not from this component.

## Usage

```bash
# View resource usage
kubectl top pods
kubectl top nodes

# Get detailed metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes
```

## Troubleshooting

```bash
# Check Metrics Server status
kubectl get pods -n kube-system | grep metrics-server

# Check logs
kubectl logs -n kube-system deployment/metrics-server

# Verify API availability
kubectl get apiservice v1beta1.metrics.k8s.io

# HPA not scaling? Check whether metrics are available
kubectl describe hpa <hpa-name>
```

## References

- **[Metrics Server](https://github.com/kubernetes-sigs/metrics-server)** - Official documentation
- **[Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)** - Horizontal Pod Autoscaler guide
