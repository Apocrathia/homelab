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
The pre-create step (before `git worktree add`) is **own-scope only**: this
session's own old worktrees plus merged orphan branches with no worktree.
Other sessions' trees are protected by their
[worktree leases](../../rules/worktrees.md#worktree-leases); a repo-wide sweep
requires an explicit operator ask. Do not touch the workspace-root checkout's
uncommitted WIP. Never delete `main`. Never `rm -rf` a worktree path.

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

Before deleting anything, check whether each candidate branch still heads an
open MR/PR (`glab mr list` / GitLab MCP, or `gh pr list` / GitHub MCP when the
host is GitHub); the classification table keeps those branches. Homelab
defaults to **MR** / GitLab. When no MR/PR lookup is available, keep or ask
rather than relying on the merged/content-equivalent checks alone.

### 3. Classify each non-main worktree / local branch

For each candidate branch `B` (skip `main`, the primary checkout, and any
worktree registered outside `$repo_root/.worktrees/` — an external checkout
belongs to its owner's workflow, so keep or ask rather than classify it here):

| Check              | How                                                                                                                                                                 | Outcome                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Active session     | Newest of branch reflog (`git reflog show "$B" -1 --date=unix`) and worktree HEAD reflog (`git -C <path> reflog show HEAD -1 --date=unix`) is newer than 60 min ago | **Keep** — a live session may own it                                           |
| Live lease         | `.scratch/worktree-leases/<branch>.lock` mtime < 24h (see [`worktrees.md`](../../rules/worktrees.md#worktree-leases))                                               | **Keep**; report holder — merged + clean is NOT enough under parallel sessions |
| Fully merged       | `git merge-base --is-ancestor "$B" "$base"`                                                                                                                         | Safe (clean or force-ok below) only outside the active/lease window            |
| Content-equivalent | Cherry-equivalent **or** squash-equivalent (see below)                                                                                                              | Treat as safe; tip need not be an ancestor                                     |
| Unique WIP         | Not fully merged and not content-equivalent                                                                                                                         | **Keep** or ask                                                                |
| Dirty worktree     | `git -C <path> status --porcelain --ignored`                                                                                                                        | See force rules                                                                |
| Open MR/PR         | MR (or PR) still open for that head                                                                                                                                 | **Keep** unless operator says abandon                                          |

**Content-equivalent** (either path is enough):

1. **Cherry-equivalent:** `git cherry "$base" "$B"` prints no `+` lines
   (every commit is `-` — same patch already on `$base` under a different SHA)
   **and** `git merge-tree --write-tree "$base" "$B"` equals `"$base^{tree}"`.
2. **Squash-equivalent:** the combined patch from the merge-base to `$B`
   matches some single commit already on `$base` (squash merges) **and**
   `git diff --quiet "$c" "$B"` against that matched commit. Per-commit
   `git cherry` misses this — a squash commit's patch-id does not equal the
   individual pre-squash commits.

```bash
# Cherry-equivalent (patch-id via cherry + exact tree containment)
if ! git cherry "$base" "$B" | grep -q '^+'; then
  tree=$(git merge-tree --write-tree "$base" "$B") &&
    [ "$tree" = "$(git rev-parse "$base^{tree}")" ] &&
    echo content-equivalent
fi
# Squash-equivalent (combined patch-id + exact tip-tree match)
mb=$(git merge-base "$base" "$B")
pid=$(git diff "$mb" "$B" | git patch-id --stable | awk '{print $1}')
while read -r c; do
  cpid=$(git diff-tree -p "$c" | git patch-id --stable | awk '{print $1}')
  [ -n "$pid" ] && [ "$cpid" = "$pid" ] && git diff --quiet "$c" "$B" && echo content-equivalent && break
done < <(git rev-list "$mb".."$base")
```

The tree guards above are mandatory before delete: patch equivalence ignores
whitespace, and whitespace is semantic in YAML/Python. Keep or ask when a
guard fails.

Run the active-session check first. A freshly created worktree points at the
base with no unique commits, so the merged/content-equivalent checks alone
classify it as safe while its owning session is still working. Check both
reflogs: a session working from a worktree moves its HEAD reflog (commits,
checkouts) without necessarily moving the branch ref, so the branch reflog
alone undercounts live sessions. Reflogs still miss a session that only reads,
so treat a barely-expired window, any sign of life, or any live lease as
keep-or-ask; the checks prove abandonment, never activity.

The dirty check must include ignored entries (`--ignored`): plain porcelain
output hides them, and even non-force `git worktree remove` discards ignored
files. Ignored build outputs are disposable; ignored worktree-local state such
as `config/state/`, `secrets.local.yaml`, logs, or `.scratch/` means keep or
ask.

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
# Revalidate the tip immediately before deleting: a resumed session can commit
# between classification and removal (TOCTOU). `git branch -d` tests
# mergedness into the *current checkout*, not $base, so re-run
# `git merge-base --is-ancestor <type>/<slug> "$base"` (fully merged) or both
# content-equivalent checks with their tree guards against the current tip.
# Delete only when the re-check still passes; keep the branch otherwise.
git branch -D <type>/<slug>
```

Orphan local branches (no worktree) get the same tip revalidation against
`$base` before delete, then `git branch -D <name>` only when the re-check still
holds.

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
- Never remove a worktree with a live lease (< 24h) whose holder is not this
  session — report the holder instead. "Merged + clean" does not mean "not in
  use" when sessions run in parallel.
- Pre-create runs are own-scope (this session's trees + merged orphans);
  repo-wide sweeps need an explicit operator ask.
- Do not `git switch` in the workspace root to "free" a branch lock as part of
  cleanup.
- Do not push branch deletions to remotes unless the operator explicitly asks
  to delete remote refs.

## Related

- Create/use contract: [`worktrees.md`](../../rules/worktrees.md)
- Post-lap reflection (separate): [`retrospective`](../retrospective/SKILL.md)
