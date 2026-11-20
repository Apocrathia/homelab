# API Server Configuration

Custom FlowSchemas and PriorityLevelConfigurations to prioritize critical infrastructure traffic.

> **Navigation**: [← Back to Infrastructure README](../README.md)

## Overview

The default API Priority and Fairness configuration causes all service accounts to compete equally in the `workload-low` priority level. This leads to API server saturation during load spikes with many CRDs and operators.

## Priority Levels

Named after cluster layers to align with deployment structure.

Shares and levels are defined in `priority-levels.yaml`.

## FlowSchemas

FlowSchema-to-level assignments and precedences are defined in
`flowschemas.yaml`.

## Verification

Check FlowSchema assignments:

```bash
kubectl get flowschemas
```

Check priority level utilization:

```bash
kubectl get --raw /metrics | grep apiserver_flowcontrol
```
