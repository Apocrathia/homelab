# `cleanup-worktrees` — worktree removal path (skill)

`SKILL.md` defines the remove half of worktree housekeeping: inventory and
delete unused git worktrees and merged orphan branches under `.worktrees/`.
Agents run it before creating a new worktree; other sessions' trees are
protected by their leases.

> **Navigation**: [← Back to Skills README](../README.md)
