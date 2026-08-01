---
name: cleanup-worktrees
description: >-
  Inventory and remove unused git worktrees and local branches that are fully
  merged (or content-equivalent) on main. Required before creating a new
  worktree (see worktrees.md). Also use when the user asks to clean up
  worktrees, prune merged branches, remove stale worktrees, or tidy .worktrees/.
---

# Cleanup worktrees

Housekeeping for agent worktrees under `.worktrees/` and leftover local
branches. Complements
[`.agents/rules/worktrees.md`](../../rules/worktrees.md) (create/use rules);
this skill is the **remove** path. Agents run it **before creating a new
worktree**, not only when the operator asks for a tidy-up.

Operator ask to clean up is authorization to remove **safe** candidates only.
When running as the pre-create step, the same safe/keep/ask rules apply.
Do not touch the workspace-root checkout's uncommitted WIP. Never delete
`main`. Never `rm -rf` a worktree path.

## Workflow

```
- [ ] 1. Resolve primary root + fetch
- [ ] 2. Inventory worktrees and local branches
- [ ] 3. Classify each candidate (safe / keep / ask)
- [ ] 4. Remove safe worktrees, then delete their branches
- [ ] 5. Delete orphan merged branches (no worktree)
- [ ] 6. Prune metadata + empty .worktrees/<type> dirs
- [ ] 7. Report what went / what stayed
```

### 1. Resolve primary root + fetch

```bash
repo_root=$(git worktree list --porcelain | awk '/^worktree / { sub(/^worktree /, ""); print; exit }')
cd "$repo_root"
git fetch origin --prune
base=$(git rev-parse --verify origin/main 2>/dev/null || echo main)
```

If local `main` and `origin/main` have diverged in a confusing way, **stop and
ask** — do not guess the merge base.

### 2. Inventory

From `$repo_root`:

```bash
git worktree list
git branch -vv
git branch --merged "$base"
```

Optional: check open MRs for each branch name (`glab mr list` / GitLab MCP)
before deleting anything that still has an open MR head.

### 3. Classify each non-main worktree / local branch

For each candidate branch `B` (skip `main` and the primary checkout):

| Check              | How                                                                                             | Outcome                                    |
| ------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Fully merged       | `git merge-base --is-ancestor "$B" "$base"`                                                     | Safe (if clean or force-ok below)          |
| Content-equivalent | Unique patch already on `$base` (same file hunk under a different SHA — cherry-pick / recommit) | Treat as safe; tip need not be an ancestor |
| Unique WIP         | `git log --oneline "$base..$B"` has commits whose **tree/diff** is not on `$base`               | **Keep** or ask                            |
| Dirty worktree     | `git -C <path> status --porcelain`                                                              | See force rules                            |
| Open MR            | MR still open for that head                                                                     | **Keep** unless operator says abandon      |

**Force remove (`git worktree remove --force`) only when:**

- Branch is safe (merged or content-equivalent), **and**
- Dirtiness is not unique WIP (e.g. vanished tracked files / checkout
  corruption), **and**
- Operator asked for cleanup (this skill's trigger).

If dirtiness looks like real uncommitted work, **ask** — do not force.

### 4–5. Remove

Order matters: remove the worktree first, then delete the branch.

```bash
# Prefer without --force; add --force only per rules above
git worktree remove [.worktrees/<type>/<slug> | --force ...]
git branch -D <type>/<slug>
```

Orphan local branches (no worktree) that are fully merged / content-equivalent:
`git branch -D <name>` only.

### 6. Prune

```bash
git worktree prune
# Remove empty type dirs under .worktrees/ if empty (rmdir only, never rm -rf)
rmdir .worktrees/docs .worktrees/feat .worktrees/fix .worktrees/chore 2>/dev/null || true
rmdir .worktrees 2>/dev/null || true
```

### 7. Report

Lead with counts. List removed worktrees/branches and anything kept (with why).
Confirm only the primary checkout remains when that is the intent.

## Hard rules

- Never `rm -rf` a worktree directory — always `git worktree remove`.
- Never delete `main` or remove the primary worktree.
- Never discard unique unmerged commits or real uncommitted WIP without an
  explicit operator call.
- Do not `git switch` in the workspace root to "free" a branch lock as part of
  cleanup.
- Do not push branch deletions to remotes unless the operator explicitly asks
  to delete remote refs.

## Related

- Create/use contract: [`worktrees.md`](../../rules/worktrees.md)
- Post-lap reflection (separate): [`retrospective`](../retrospective/SKILL.md)
