---
description: Merging an MR needs explicit authorization from the operator; never merge, approve, or push to main on your own
alwaysApply: true
---

# Merge authorization

Merging is the operator's action. An open MR with green CI and clean reviews is
a report to the operator, not a step the agent finishes. Agents have merged MRs
unasked; this rule is the correction.

## Never without explicit authorization

- `glab mr merge` in any mode (`--merge`, `--squash`, `--rebase`, `--auto`) or
  the GitLab web/API equivalent, including merge-queue enqueue
- Approving an MR, or dismissing a submitted review to clear a review decision
- Pushing to `main` (or any protected branch), or merging a branch you are
  shipping into it, local or remote
- Running a command that would merge a branch you are shipping into `main`
  (or any protected branch) as a probe, even guarded with `|| true` or
  expecting rejection: if that command merges on success, running it is a
  merge attempt

## What does not authorize a merge

- CI green, `detailed_merge_status: mergeable`, reviewers clean, merge-ready
- A plan, launch brief, issue, or skill whose exit is a "merged MR"
- "Ship it", "land it", "finish the lap": shipping ends at an open MR plus a
  report
- Silence, elapsed time, or the operator being away

Only the operator naming the merge in the session ("merge !72") authorizes it.
Then do exactly that, nothing broader.

## Still the agent's job

Pushing the feature branch, opening and updating the MR, syncing that branch,
fast-forwarding local `main` to `origin/main` without checking `main` out,
replying to and resolving review threads you addressed, and read-only state
queries (`glab mr view`, `glab ci view`). After `git fetch origin`, fast-forward
local `main` only when it is an ancestor of `origin/main`. In the worktree that
already has `main` checked out, run
`git -C <that-worktree> merge --ff-only origin/main` on a clean tree. When
`main` is not checked out, run `git branch -f main origin/main` only after that
same ancestor check. If the check fails (local `main` strictly ahead, or the
histories have diverged), stop and ask the operator. Never `git branch -f` in
that case: unlike `merge --ff-only`, it moves the ref backward and drops
unpushed commits. At merge-ready, report and keep watching until the operator
merges or dismisses ([`watch-mr`](../skills/watch-mr/SKILL.md)). Clock out
after the merge. On dismissal, stop and report `dismissed`; do not clock out.
The MR is still open, and removing the worktree would drop local state.

## Related

- Invariant: `.agents/context/invariants.md` (module not present in this repo)
- Skills that stop at merge-ready:
  [`ship-work`](../skills/ship-work/SKILL.md),
  [`autoresearch`](../skills/autoresearch/SKILL.md)
