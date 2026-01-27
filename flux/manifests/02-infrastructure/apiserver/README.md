# API Server Configuration

Custom FlowSchemas and PriorityLevelConfigurations to prioritize critical infrastructure traffic.

## Overview

The default API Priority and Fairness configuration causes all service accounts to compete equally in the `workload-low` priority level. This leads to API server saturation during load spikes with many CRDs and operators.

## Priority Levels

Named after cluster layers to align with deployment structure.

| Level            | Concurrency Shares | Layer             | Purpose                         |
| ---------------- | ------------------ | ----------------- | ------------------------------- |
| `bootstrap`      | 80                 | 01-bootstrap      | GitOps and secrets              |
| `infrastructure` | 70                 | 02-infrastructure | CNI and storage                 |
| `services`       | 50                 | 03-services       | Databases and platform services |

## FlowSchemas

| Name          | Priority Level | Precedence | Services                                          |
| ------------- | -------------- | ---------- | ------------------------------------------------- |
| `cilium`      | infrastructure | 200        | Cilium, Cilium Operator                           |
| `longhorn`    | infrastructure | 250        | Longhorn Manager                                  |
| `cnpg`        | services       | 300        | CloudNativePG Operator                            |
| `kyverno`     | services       | 310        | Kyverno policy controllers                        |
| `flux`        | bootstrap      | 350        | Helm, Kustomize, Source, Notification controllers |
| `onepassword` | bootstrap      | 400        | 1Password Connect Operator                        |

## Verification

Check FlowSchema assignments:

```bash
kubectl get flowschemas
```

Check priority level utilization:

```bash
kubectl get --raw /metrics | grep apiserver_flowcontrol
```
