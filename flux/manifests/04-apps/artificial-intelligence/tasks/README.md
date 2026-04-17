# Agent tasks

Scheduled task templates for invoking A2A agents on a fixed cadence.

## Included template

- `scheduled-agent-invoke/` creates a suspended `CronJob` that invokes `homelab-agent` through kagent A2A using `a2a-sdk` streaming.
- Defaults are safe for testing: `suspend: true`, `concurrencyPolicy: Forbid`, and minimal runtime permissions.

## How to use

1. Copy `scheduled-agent-invoke/` to a new directory for your task.
2. Edit `prompts/task.md` (first turn) and `prompts/continuation.md` (follow-up turns) as needed; Python sends multi-turn `message/send` with `contextId`.
3. Update `cronjob.yaml`:
   - `metadata.name`
   - `spec.schedule`
   - `env.A2A_URL` for the target agent endpoint
4. Set `spec.suspend: false` when ready to enable the schedule.

## Notes

- Keep this GitOps-native: commit manifest changes and let Flux reconcile.
- `prompts/task.md`, `prompts/continuation.md`, `src/invoke.py`, `src/pyproject.toml`, and `src/uv.lock` are packaged via `configMapGenerator` (same pattern as `management/scripts/unifi/uptime-robot-ip-sync`).
- The CronJob uses an init container to `uv pip install` deps into `/deps` and runs `python /scripts/invoke.py` with `a2a-sdk` (plus `httpx` transport).
- This template calls kagent directly and does not require an API key.

## Python (`scheduled-agent-invoke/src`)

See `scheduled-agent-invoke/src/README.md`. After changing dependencies, run `uv lock` under `src/` and commit `uv.lock`.
