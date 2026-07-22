# Agent tasks

Scheduled task templates and wires for invoking A2A agents on a fixed cadence.

## Included

- `scheduled-agent-invoke/` — suspended CronJob **template** (cluster health →
  Discord). Copy this directory for new task shapes that need a blank slate.
- `run-loop-agent-invoke/` — suspended CronJob for the **constant loop**
  (`run-loop` heartbeat; in-cluster ceiling = `mode=scout`). Schedule
  `30 */6 * * *`; unsuspend when ready.
- `alert-agent-invoke/` — alert-driven invoke path (separate from Cron templates).

Defaults stay safe for testing: `suspend: true`, `concurrencyPolicy: Forbid`,
and minimal runtime permissions.

## How to use (new Cron task)

1. Copy `scheduled-agent-invoke/` to a new directory for your task (or fork an
   existing sibling like `run-loop-agent-invoke/` when the shape matches).
2. Edit `prompts/task.md` (first turn) and `prompts/continuation.md` (follow-up
   turns) as needed; Python sends multi-turn `message/send` with `contextId`.
3. Update `cronjob.yaml`:
   - `metadata.name`
   - `spec.schedule`
   - `env.A2A_URL` for the target agent endpoint
   - unique ServiceAccount / ConfigMap / labels (avoid colliding with templates)
4. Add the directory under this folder's `kustomization.yaml`.
5. Set `spec.suspend: false` when ready to enable the schedule.

## Notes

- Keep this GitOps-native: commit manifest changes and let Flux reconcile.
- `prompts/task.md`, `prompts/continuation.md`, `src/invoke.py`,
  `src/pyproject.toml`, and `src/uv.lock` are packaged via `configMapGenerator`
  (same pattern as `management/scripts/unifi/uptime-robot-ip-sync`).
- The CronJob uses an init container to `uv pip install` deps into `/deps` and
  runs `python /scripts/invoke.py` with `a2a-sdk` (plus `httpx` transport).
- These tasks call kagent directly and do not require an API key.
- Constant-loop / Cron wires must not auto-apply: leave `suspend: true` until
  the operator explicitly enables them.
- In-cluster A2A has no git checkout — full `run-loop` implement laps need a
  checkout-backed host (laptop Automation); this Cron is the scout heartbeat.

## Python (`*/src`)

See each task's `src/README.md`. After changing dependencies, run `uv lock`
under that `src/` and commit `uv.lock`.
