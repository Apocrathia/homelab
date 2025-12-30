# Authentik Worker Memory Issue

## Summary

Authentik workers exhibit excessive memory consumption when managing a large number of outposts (42+). Workers consistently consume 16GB+ RAM and experience OOM kills despite various tuning attempts.

## Environment

- **Authentik Version**: 2025.10.2
- **Deployment**: Helm chart via Flux
- **Outposts**: 42 proxy-mode outposts
- **Blueprints**: 55+ blueprints (one per app with provider + outpost)

## Symptoms

- Workers consume all available memory (tested up to 16GB limit)
- Constant OOM kills (Exit Code 137) every 10-30 minutes
- Task queue accumulates 2000+ tasks
- Each worker restart triggers `blueprints_discovery` which cascades into:
  - 55 `apply_blueprint` tasks
  - 42 `outpost_controller` tasks
  - Hundreds of `outpost_send_update` tasks

## Root Causes Identified

### 1. Sidecar File Rewrites

The k8s-sidecar was rewriting blueprint files every 60 seconds, triggering the file watcher and `blueprints_discovery` constantly.

**Fix Applied**: Added `IGNORE_ALREADY_PROCESSED=true` to sidecar env vars.

### 2. Scheduler Interval

Default `AUTHENTIK_WORKER__SCHEDULER_INTERVAL` is 60 seconds, causing frequent task scheduling.

**Fix Applied**: Set to `hours=1`.

### 3. Discovery on Startup

`blueprints_discovery` runs on every worker startup (`send_on_startup=True`). With frequent OOM restarts, this creates a cascade loop.

### 4. Outpost Controller Overhead

Each of the 42 outposts triggers:

- `outpost_controller` task on discovery
- `outpost_send_update` on any provider change
- Memory-intensive reconciliation

## Tuning Attempts

| Setting                                | Value             | Result                         |
| -------------------------------------- | ----------------- | ------------------------------ |
| `AUTHENTIK_WORKER__SCHEDULER_INTERVAL` | `hours=1`         | Reduced discovery frequency    |
| `IGNORE_ALREADY_PROCESSED` (sidecar)   | `true`            | Stopped constant file rewrites |
| `AUTHENTIK_WORKER__THREADS`            | `2` (from 4)      | Reduced parallelism            |
| Worker replicas                        | `2` (from 4)      | Fewer restart cascades         |
| Memory limit                           | `16Gi` (from 4Gi) | Still OOMs                     |
| `AUTHENTIK_CACHE__TIMEOUT`             | `60`              | No improvement                 |
| `AUTHENTIK_CACHE__TIMEOUT_FLOWS`       | `60`              | No improvement                 |
| `AUTHENTIK_CACHE__TIMEOUT_POLICIES`    | `60`              | No improvement                 |

## Current Configuration

```yaml
worker:
  replicas: 2
  env:
    - name: AUTHENTIK_WORKER__THREADS
      value: "2"
    - name: AUTHENTIK_WORKER__SCHEDULER_INTERVAL
      value: "hours=1"
    - name: AUTHENTIK_CACHE__TIMEOUT
      value: "60"
    - name: AUTHENTIK_CACHE__TIMEOUT_FLOWS
      value: "60"
    - name: AUTHENTIK_CACHE__TIMEOUT_POLICIES
      value: "60"
  resources:
    requests:
      cpu: 500m
      memory: 8Gi
    limits:
      cpu: 4000m
      memory: 16Gi
```

## Potential Solutions Not Yet Implemented

### 1. Increase Memory to 32GB

May just delay the problem rather than solve it.

### 2. Consolidate Outposts with Forward Auth

Use `forward_domain` mode with a single outpost instead of 42 separate ones. Requires:

- Reworking HTTPRoute management (currently handled by outposts)
- Modifying generic-app Helm chart
- Extensive testing to avoid losing authenticated access

**Tradeoff**: Loses per-app authorization policies.

### 3. Reduce to 1 Worker

Fewer workers = fewer restart cascades = fewer discovery triggers.

### 4. Hybrid Approach

Keep high-priority apps on dedicated outposts, consolidate low-priority apps to forward_domain.

## Related Issues

- [goauthentik/authentik#10021](https://github.com/goauthentik/authentik/issues/10021) - Similar memory complaints after upgrade

## Investigation Notes

- Memory usage appears to scale with number of outposts
- Each blueprint apply holds significant memory during processing
- Workers do not appear to release memory after task completion (potential leak)
- `MemoryQoS` Kubernetes feature gate is enabled but soft limits don't prevent OOMs

## Next Steps

1. File upstream issue with reproduction steps
2. Consider reducing outpost count through consolidation
3. Monitor for authentik updates that address memory consumption
