# Longhorn engine version and volume creation troubleshooting

When Longhorn manager is upgraded, the default engine and instance-manager images change. New volumes use the new engine; existing volumes can be upgraded automatically or left on the old engine. Volume creation or attachment can hang when:

- Instance manager pods for the expected engine version are missing or not ready (e.g. old instance managers were torn down before volumes migrated).
- Automatic engine upgrade runs in parallel and hits race conditions or deadlocks (historically in clusters with many volumes).

This doc gives context and mitigations.

## Confirming the problem

Run these to see where things are stuck.

**PVCs not binding (provisioning):**

```bash
kubectl get pvc -A | grep Pending
kubectl describe pvc <name> -n <namespace>
```

**Longhorn volumes (attach/engine state):**

```bash
kubectl get volumes -n longhorn-system
kubectl describe volume <volume-name> -n longhorn-system
```

**Instance managers (engine/replica processes):**

```bash
kubectl get pods -n longhorn-system -l longhorn.io/component=instance-manager
kubectl describe pod -n longhorn-system -l longhorn.io/component=instance-manager
```

**Manager logs (errors about instance manager or engine):**

```bash
kubectl logs -n longhorn-system -l app=longhorn-manager --tail=200
```

Typical log line when things are stuck: `failed to find instance manager for replica ... cannot find the only available instance manager for instance ... instance manager image longhornio/longhorn-instance-manager:vX.Y.Z`.

## Mitigations

### 1. Disable automatic engine upgrade (preventive)

We set `concurrentAutomaticEngineUpgradePerNodeLimit: "0"` in the Longhorn HelmRelease so Longhorn does not automatically upgrade existing volume engines after a manager upgrade. New volumes still use the current default engine; existing volumes keep their engine version until you upgrade them manually (e.g. via Longhorn UI). This avoids instance-manager version mismatch and races during/after upgrades.

If you ever want to move volumes to the new engine, do it in a controlled way (e.g. drain nodes with a selector that skips Longhorn components, or upgrade engines manually in the UI).

### 2. If volumes are already stuck after an upgrade

- **Scale down workloads** that use the stuck volumes so the volumes detach. Then scale back up. Sometimes that forces Longhorn to schedule new instance managers and reattach.
- **Restart the node** the volume is attaching to (as a last resort). Some users reported that after reverting to the previous Longhorn version, volumes stayed “attaching” until they restarted the node.
- **Drain nodes** (skipping Longhorn components) to force attach/detach cycles so engine/replica processes move to new instance-manager pods. Example (adjust selectors for your cluster):

  ```bash
  kubectl drain <node> --ignore-daemonsets --pod-selector='!longhorn.io/component,app!=csi-attacher,app!=csi-provisioner,app!=csi-snapshotter,app!=csi-resizer,app!=longhorn-driver-deployer,app!=longhorn-ui'
  ```

### 3. Upgrade path rules (Longhorn 1.5+)

- Only sequential minor upgrades are supported (e.g. 1.10.x → 1.11.x). Skipping minors can cause failures.
- V2 Data Engine volumes must be detached (and replicas stopped) before upgrade; we use the V1 data engine only.

## References

- [Longhorn upgrade](https://longhorn.io/docs/latest/deploy/upgrade/)
- [Troubleshooting: engine upgrading stuck in deadlock](https://longhorn.io/kb/troubleshooting-engine-upgrading-stuck-in-deadlock)
- [Auto-upgrade engine](https://longhorn.io/docs/latest/deploy/upgrade/auto-upgrade-engine)
- [Settings: Concurrent Automatic Engine Upgrade Per Node Limit](https://longhorn.io/docs/latest/references/settings/)
