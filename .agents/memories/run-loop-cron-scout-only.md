# In-cluster run-loop Cron is scout-only

## Context

`flux/.../tasks/run-loop-agent-invoke/` fires `homelab-agent-run-loop` on a
schedule. It invokes agents over A2A **without** a git checkout.

## Lesson

Each Cron tick is `run-loop` mode=`scout`: find-work → optional file-issue /
Discord notify → stop. It cannot `implement-change`, `autoresearch`,
`draft-commit`, or edit the tree. Full unattended/attended laps need a
checkout-backed host (laptop Automation). Do not unsuspend expecting end-to-end
ship from the Cron alone.

## References

- [`run-loop/SKILL.md`](../skills/run-loop/SKILL.md) — G15
- `flux/manifests/04-apps/artificial-intelligence/tasks/run-loop-agent-invoke/`
