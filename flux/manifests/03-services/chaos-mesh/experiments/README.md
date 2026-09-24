# Chaos Mesh experiments

GitOps-managed chaos experiments (Stage 1 starter set). Each experiment is a
`Schedule` CR that spawns a short-lived chaos object on a daily
early-morning cron; Flux applies them and prunes them when removed from this
directory. The Chaos Mesh install lives one level up
([../README.md](../README.md)).

> **Navigation**: [← Back to Chaos Mesh README](../README.md)

## Rules of engagement

- **Git-only.** Experiments are declared here and applied by the
  `services-chaos-mesh-experiments` Kustomization. Nothing is created from the
  dashboard (its RBAC is read-only).
- **Namespace opt-in.** The controller runs with `enableFilterNamespace: true`,
  so only namespaces annotated `chaos-mesh.org/inject=enabled` can be targeted.
  Current members: `demo-app`, `openwebui`, `excalidraw`, and `chaos-mesh`
  itself (annotation pre-existing, never targeted — see **No self-chaos**
  below). Only `excalidraw` is stateless (emptyDir only); `demo-app` mounts a
  10Gi Longhorn PVC plus the SMB `Library` volume, and `openwebui` keeps user
  chat data on a 20Gi Longhorn PVC. The experiments here are pod,
  CPU stress, network, DNS, and HTTP chaos only — none touch volumes.
- **No self-chaos.** Nothing ever selects the `chaos-mesh` namespace itself —
  its admission webhooks run `failurePolicy: Fail`, so killing the controller
  with its own experiment would wedge the tooling.
- **No volume/IO chaos.** IOChaos stays out of this set entirely; volume and IO
  chaos are off-limits against any PVC-backed data — CNPG database namespaces
  (never annotated) as well as `openwebui`'s 20Gi Longhorn PVC (user chat
  data) and `demo-app`'s data volumes.
- **Tight scope.** Every selector names one namespace plus the target app's
  labels; durations stay at 60s (never above 120s); `historyLimit: 1` keeps one
  spawned chaos object per schedule.
- **Quiet window.** All crons run once a day between 03:00 and 05:00
  `America/Denver` (`CRON_TZ=` in the cron string — the repo's cron timezone
  convention, explicit so it fails loudly if the image ever loses tzdata
  instead of silently firing at UTC).

## Experiments

| Schedule                  | Kind                 | Target                                | Effect                                                                                                                                                                                                                                    | Daily at (Denver) |
| ------------------------- | -------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `demo-app-pod-kill`       | PodChaos `pod-kill`  | `app=demo-app` pod (mode `one`)       | Deletes one pod (grace 5s); Deployment recreates it. demo-app runs a single replica and gatus probes at 1m intervals, so a blip on `demo/demo-app` appears only if a probe lands inside the seconds-long outage — not guaranteed per run. | 03:10             |
| `demo-app-cpu-stress`     | StressChaos CPU      | one `app=demo-app` pod                | One stress-ng CPU worker for 60s. The pod's 100m CPU limit caps the burn — throttling, not an outage.                                                                                                                                     | 03:25             |
| `demo-app-dns-error`      | DNSChaos `error`     | all `app=demo-app` pods               | DNS lookups from the pod SERVFAIL for 60s. Mechanism test; nginx itself serves static files.                                                                                                                                              | 03:40             |
| `openwebui-litellm-delay` | NetworkChaos `delay` | openwebui pods → litellm Service VIP  | +100ms latency on openwebui's egress to `litellm.litellm.svc.cluster.local:4000` for 60s. Mimics a slow LLM backend.                                                                                                                      | 04:15             |
| `excalidraw-http-abort`   | HTTPChaos `abort`    | `app=excalidraw` pods, GET on port 80 | Resets inbound GET requests for 60s. The gatus probe fails during the window.                                                                                                                                                             | 04:35             |

The litellm experiment targets the Service ClusterIP (`externalTargets`),
not litellm pods: openwebui reaches litellm through the Service VIP, so a
pod-IP filter would never match at the openwebui veth — and the `litellm`
namespace hosts a CNPG cluster and stays out of the annotation set.

## Abort switch

`flux suspend kustomization services-chaos-mesh-experiments` stops Flux from
applying changes from this directory, but it **does not delete the already
applied Schedules** — they keep firing daily. To actually stop chaos:

- **Pause (keeps history):** annotate each Schedule
  `experiment.chaos-mesh.org/pause=true` — this stops new spawns and also
  pauses an already-spawned experiment, and Flux does not manage the
  annotation, so it survives reconciles. The Schedules apply into their
  target namespaces (`demo-app`, `openwebui`, `excalidraw`):

  ```bash
  kubectl annotate -n demo-app schedule demo-app-pod-kill,demo-app-cpu-stress,demo-app-dns-error experiment.chaos-mesh.org/pause=true
  kubectl annotate -n openwebui schedule openwebui-litellm-delay experiment.chaos-mesh.org/pause=true
  kubectl annotate -n excalidraw schedule excalidraw-http-abort experiment.chaos-mesh.org/pause=true
  ```

  Un-pause by removing the annotation (trailing `-`):

  ```bash
  kubectl annotate -n demo-app schedule demo-app-pod-kill,demo-app-cpu-stress,demo-app-dns-error experiment.chaos-mesh.org/pause-
  kubectl annotate -n openwebui schedule openwebui-litellm-delay experiment.chaos-mesh.org/pause-
  kubectl annotate -n excalidraw schedule excalidraw-http-abort experiment.chaos-mesh.org/pause-
  ```

  The dashboard pause button sets the same annotation, but the dashboard's
  ClusterRole is read-only (`get`/`list`/`watch` in `rbac.yaml`), so the button
  403s — use kubectl.

- **Remove (GitOps way):** delete the experiment files here and let Flux prune
  the Schedules (the Kustomization must be resumed for pruning to run). Spawned
  chaos objects are owned by their Schedule, so garbage collection removes them
  and Chaos Mesh's finalizers restore any affected pod (resolv.conf, tc rules,
  stress processes).
- **Emergency (live):** `kubectl delete schedule <name> -n <namespace>` per
  experiment achieves the same cleanup immediately; Flux recreates the
  Schedule from git on the next reconcile while the file still exists.

## Post-ship validation loop

After this merges, watch one full day of the window:

1. **Spawn + injection:** `kubectl get schedules -A` shows each schedule, and
   `kubectl get podchaos,stresschaos,dnschaos,networkchaos,httpchaos -A` lists
   the spawned objects — no phase column (GC deletes them at `historyLimit`);
   `kubectl describe` shows records cycling `Injected` → `Not Injected`, plus
   the `AllRecovered` condition and `Recovered` event that mark recovery.
2. **gatus blips:** the gatus dashboard (`demo/demo-app`, `excalidraw`) shows
   failed results during the windows. The Grafana rule
   (`Gatus endpoint down`, `for: 5m`) needs a 5-minute outage to page, and
   these 60s windows intentionally stay under that `for` duration — expect
   blips in gatus results, **not** Discord/Pushover/Slack pages. A page
   firing means recovery failed; that is the real signal.
3. **Pod recovery:** `demo-app` pods restart and return to Ready within
   seconds of `pod-kill`; openwebui pods stay Ready (egress-only delay,
   probes untouched). The excalidraw pod is **expected** to go NotReady
   ~15s into its 60s window: HTTPChaos aborts every inbound GET on :80,
   kubelet probes included, and liveness may restart the container
   mid-window. That is the kubelet doing its job; recovery is the pod
   Ready again plus the chaos object's `AllRecovered` condition. A pod
   still NotReady after the window is the real failure signal.
4. **Controller events:** `kubectl get events -n <target-ns>` shows
   Schedule/chaos events for silent failures (e.g. empty selector results,
   DNS resolution errors).

## References

For comprehensive documentation, visit:

- [Chaos Mesh Documentation](https://chaos-mesh.org/docs/)
- [Schedules and scheduling rules](https://chaos-mesh.org/docs/define-scheduling-rules/)
