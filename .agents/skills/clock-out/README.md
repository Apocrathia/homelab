# `clock-out` — post-merge teardown (skill)

`SKILL.md` defines the session-end teardown after a merged MR: stop anything
running, remove the worktree and its lease, delete the branch, then stop. It
runs once and starts no new work.

> **Navigation**: [← Back to Skills README](../README.md)
