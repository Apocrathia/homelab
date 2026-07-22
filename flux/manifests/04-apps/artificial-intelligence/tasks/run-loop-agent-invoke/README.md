# run-loop-agent-invoke

Constant-loop Cron host. Each schedule tick is one `run-loop` invocation
(`.agents/skills/run-loop/`) against `homelab-agent` via kagent A2A. The agent
**keeps going** by the Cron firing again — not by spinning inside a single Job.

## Purpose

- Heartbeat for the development loop: find → rank → (file/propose) → stop.
- Post a Discord `#notifications` summary each tick.
- **Never** auto-apply, commit, cluster-mutate, or edit protected paths.
- `spec.suspend: true` until the operator unsuspends.

## Mode ceiling (this host)

In-cluster A2A has **no** homelab git checkout. This Cron therefore runs
`run-loop` **`mode=scout`** only:

- read-only scouts + debt-first rank
- Discord notify + issue-shaped proposals (operator files `docs/issues/`)
- no `implement-change` / `draft-commit`

Checkout-backed hosts (laptop Automation / workspace runner) own
`unattended` / `attended` full laps.

## Schedule

- Cron: `30 */6 * * *` (every 6 hours at :30).
- `concurrencyPolicy: Forbid` — one lap at a time.
- Unsuspend: set `suspend: false` in `cronjob.yaml` when ready.

## What this includes

- `cronjob.yaml`: `homelab-agent-run-loop` (hardened, suspended).
- `kustomization.yaml`: ConfigMap `homelab-agent-run-loop` (prompts + Python).
- `prompts/`: constant-loop scout prompts.
- `src/invoke.py`: multi-turn A2A client (same pattern as `scheduled-agent-invoke`).

Sibling `scheduled-agent-invoke/` remains the health→Discord **template**; this
directory is the loop heartbeat, not a second health check.

## Endpoint

`http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/kagent/homelab-agent/`

See `src/README.md` for local-dev env vars.
