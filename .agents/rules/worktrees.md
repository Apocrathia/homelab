---
description: All agent edits go in a git worktree on its own branch; do not edit the workspace root checkout
alwaysApply: true
---

# Worktrees

The workspace root checkout is for the human. Agents do not edit files there.

Ship stays operator-gated (`draft-commit` / watch-mr / run-loop). Worktrees
isolate checkouts — they do **not** authorize commit, push, or
`ship-work` / `clock-out`. See
[`.agents/context/development-loop.md`](../context/development-loop.md#ship-model).

## Primary repo root vs current worktree

Inside a linked worktree, `git rev-parse --show-toplevel` is **this**
worktree's directory, not the primary checkout that owns `.worktrees/`. Before
creating or checking paths under `.worktrees/`, resolve the primary root:

```bash
repo_root=$(git worktree list --porcelain | awk '/^worktree / { sub(/^worktree /, ""); print; exit }')
```

The first `worktree` line from `git worktree list --porcelain` is the primary
checkout. Use `$repo_root/.worktrees/...` for `mkdir`, `git worktree add`, and
existence checks.

## Before any file change

1. Run `git branch --show-current` and `git worktree list`.
2. If the task already has a worktree (MR branch, prior session), `cd` into that
   path and work there (skip sync; divergence on `main` does not block resuming
   in-flight work).
3. Otherwise sync from `$repo_root` before creating a worktree:

   ```bash
   cd "$repo_root"
   git fetch origin --prune
   # Prefer origin/main when the ref exists; else main.
   base=$(git rev-parse --verify origin/main 2>/dev/null || echo main)
   ```

   If local `main` has diverged from `origin/main` in a way that makes the base
   unclear, **stop and ask** — do not guess. Do not switch the workspace root
   checkout.

4. Create one on a **new** branch (never reuse whatever branch the human has in
   the workspace root):
   - `cd "$repo_root"` then `mkdir -p .worktrees/<type>` and
     `git worktree add -b <type>/<slug> .worktrees/<type>/<slug> <base>`.
5. Run shell commands that mutate the tree, and edit files, only inside the
   worktree directory. Pass the worktree **absolute path** to subagents.

## Branch lock (one checkout per branch)

Git allows only one checkout per branch. If the workspace root already has
branch X checked out, `git worktree add` for branch X fails with "already
checked out".

- **New work:** always `-b <type>/<slug>` from `<base>` above. Do not reuse the
  root's branch name.
- **Existing remote branch** (e.g. an MR head) when that name is locked in root:
  fetch the ref and add a worktree with a **distinct local branch** that tracks
  it:
  `git fetch origin <headRefName>` then
  `git worktree add -b mr/<iid>-review .worktrees/mr/<iid>-review origin/<headRefName>`.
  Re-entering that worktree: fetch again and rebase onto the current MR head
  before editing. Do not `git switch` in the root checkout to release the lock
  unless the operator explicitly asks.
- **`git worktree add` fails with "already checked out":** do not edit in root.
  Fetch + a new local branch name as above, or `cd` into an existing worktree
  from `git worktree list`.

Do not commit on whatever branch happens to be checked out in the workspace
root. That branch may be someone else's WIP or an unrelated feature.

## Naming and layout

Mirror the branch path under `.worktrees/`. Use `type/short-slug` branch names
(`feat/…`, `fix/…`, `chore/…`, `docs/…`). Slug describes **what changes**, not
plan numbers or status.

## Cleanup

After merge (or when abandoning the lap), `git worktree remove` the tree and
delete the branch. Never `rm -rf` a worktree path. There is no `clock-out`
ceremony — cleanup is explicit when the operator (or an authorized lap) is done.
Bulk / inventory cleanup:
[`cleanup-worktrees`](../skills/cleanup-worktrees/SKILL.md).

## Exceptions

- Read-only exploration (`Read`, `Grep`, review, `find-work`) may use the
  workspace root.
- The operator explicitly names a worktree path or branch to use.
- The operator explicitly authorizes workspace-root edits for this lap.
- Protected-path edits still need confirmation per `protected-paths.md`.
