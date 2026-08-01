---
name: clock-out
description: >-
  Tear down the agent worktree and stop after a merged MR. Use when the user
  says clock out, /clock-out, clean up your workspace, or sends the post-merge
  dismissal.
disable-model-invocation: true
---

# Clock out

The MR merged. Good work. Clean up your workspace and clock out.

This skill runs once at session end. Stop anything you still have running, tear
down git state, then stop. Do not start new work, spawn subagents, or open
follow-up tasks after cleanup.

Session teardown only. For bulk inventory of unused worktrees and merged
branches, use [`cleanup-worktrees`](../cleanup-worktrees/SKILL.md). Create/use
rules live in [`.agents/rules/worktrees.md`](../../rules/worktrees.md).

## Scope

Clean up **this session's** worktree and its disposable sandboxes only. Do not
sweep other agents' trees, `mr/*-review` worktrees you did not create, or
anything still marked in-progress unless the user names it.

## Workflow

Copy this checklist and work it in order:

```
- [ ] 0. Stop in-flight subagents and shells from this session
- [ ] 1. Identify the session worktree and branch (capture sync_main)
- [ ] 2. Sync main while session worktree still exists
- [ ] 3. Remove nested Macroscope review sandboxes for this branch
- [ ] 4. Remove the agent worktree
- [ ] 5. Delete the session branch
- [ ] 6. Prune stale worktree metadata
- [ ] 7. Report what was removed and stop
```

### 0. Stop in-flight subagents and shells

Only stop work **you** started this session. Do not kill other agents'
terminals, shells, or subagents.

Do not proceed to step 1 while anything below is still running unless you have
explicitly stopped it.

**Subagents (Task tool):**

- Collect every subagent you spawned this session, including background Tasks
  (`run_in_background: true`) and review-loop / implement-change fan-outs.
- If one is still running and its output still matters, wait for the completion
  notification or poll with `Await` until it finishes.
- If the session is done and the output no longer matters (merged MR, user
  dismissal), interrupt it with `interrupt: true` on `resume` rather than leaving
  it orphaned.
- Do not spawn new subagents for clock-out itself; git cleanup is parent work.

**Background shells (Shell tool):**

- Read the terminals folder for shells you started: commands launched with
  `block_until_ms: 0`, dev servers (`make run`, `cargo run`, gateway binds),
  long Macroscope/Codex reviews, or anything else still attached to a terminal
  file.
- In each terminal file you started, check whether the job is still live:
  - **Running:** header includes `command` and `running_for_ms`, and the file
    has no trailing footer block with `ended_at`.
  - **Finished:** footer block with `exit_code` and `ended_at` (ignore header
    `running_for_ms`; it may linger after exit).
- Stop each live shell you own: `kill` the `pid` from the file header (SIGTERM,
  then SIGKILL if needed), or send interrupt through the Shell tool if you still
  have the shell id. Prefer stopping over leaving orphans.
- If you used `Await` on a background shell, poll until it completes or stop the
  process.

**Gate:** Step 0 is done when no subagent or background shell from this session
is still running.

### 1. Identify the session worktree

Set the primary checkout path first. Steps 3–6 require **`repo_root`**; never
run them with it unset.

```bash
repo_root=$(git worktree list --porcelain | awk '/^worktree / { sub(/^worktree /, ""); print; exit }')
wt_root="$(git rev-parse --show-toplevel)"
sync_main="$repo_root/scripts/sync-main.sh"
if [[ ! -x "$sync_main" && -x "$wt_root/scripts/sync-main.sh" ]]; then
  sync_main="$wt_root/scripts/sync-main.sh"
fi
```

If **`repo_root`** is empty, stop and ask the user which worktree to remove.

Record **`session_branch`** and **`session_worktree_path`** from conversation
context first (branch name, worktree path, MR IID). Prefer this over git
inference.

If conversation context is unclear, infer from git only when the current
directory is an agent worktree under `.worktrees/` (never the primary/human
checkout). Reject Macroscope review sandboxes (`*/macroscope-review-*`): if cwd
is inside one, do not treat it as the session; use conversation context or stop
and ask.

```bash
cwd_toplevel=$(git rev-parse --show-toplevel)
if [[ "$cwd_toplevel" == "$repo_root/.worktrees/"* ]] &&
   [[ "$cwd_toplevel" != */macroscope-review-* ]]; then
  session_worktree_path="$cwd_toplevel"
  session_branch=$(git -C "$session_worktree_path" branch --show-current)
fi
```

If **`session_worktree_path`** or **`session_branch`** is still unset, or
`session_worktree_path` equals `$repo_root`, stop and ask the user which
worktree to remove. Do not proceed with destructive cleanup.

Do not derive the worktree path from the branch name. Most agent branches
mirror under `.worktrees/` (`feat/foo` → `.worktrees/feat/foo`), but
`mr/<iid>-review` sessions check out a distinct tracking branch at
`.worktrees/mr/<iid>-review`, not at the MR head path (e.g. not
`.worktrees/fix/foo`). Use the actual path from context or a validated
`.worktrees/` path, not a guessed mirror or the primary checkout.

### 2. Sync main (before teardown)

Run sync **before** steps 3–5 remove the session worktree. When the primary
checkout lacks `scripts/sync-main.sh`, step 1 may set `sync_main` to the session
worktree's copy; that path is invalid after step 4.

Use **`sync_main`** and **`repo_root`** from step 1. Do not re-resolve `wt_root`
after teardown.

```bash
cd "$repo_root"
sync_rc=0
if [[ -x "$sync_main" ]]; then
  "$sync_main" "$repo_root" || sync_rc=$?
else
  if ! git fetch origin --prune; then
    sync_rc=1
  elif ! git show-ref --verify --quiet refs/remotes/origin/main; then
    sync_rc=3
  else
    origin_main="$(git rev-parse origin/main)"
    if git show-ref --verify --quiet refs/heads/main; then
      local_main="$(git rev-parse main)"
      if [[ "$local_main" != "$origin_main" ]]; then
        if git merge-base --is-ancestor main origin/main 2>/dev/null; then
          main_worktree="$(git worktree list --porcelain | awk '
            /^worktree / { wt = substr($0, 10); branch = "" }
            /^branch / { branch = substr($0, 8) }
            branch == "refs/heads/main" { print wt; exit }
          ')"
          if [[ -n "$main_worktree" ]]; then
            if [[ -n "$(git -C "$main_worktree" status --porcelain)" ]]; then
              sync_rc=3
            elif ! git -C "$main_worktree" merge --ff-only origin/main; then
              sync_rc=3
            fi
          else
            git branch -f main "$origin_main" || sync_rc=3
          fi
        else
          sync_rc=2
        fi
      fi
    else
      git branch main "$origin_main" || sync_rc=3
    fi
  fi
fi
```

When `sync-main` exists, it runs `git fetch origin --prune` and fast-forwards
local `main` to `origin/main` without checking out `main`. When the script is
missing or not executable, `git fetch origin --prune` still runs and follows the
same fast-forward path, including a checked-out `main` worktree. Requires
network; retry with network permissions if fetch fails. Do not abort clock-out on
sync failure; record `sync_rc` and report it in step 7.

### 3. Remove Macroscope review sandboxes

Only sandboxes nested under **`session_worktree_path`**. Do not run a global
sweep in a shared clone. Macroscope sandboxes live under
`.worktrees/macroscope-review-*`.

```bash
cd "$repo_root"
expected="macroscope/review-${session_branch}-"
for wt in "$repo_root"/.worktrees/macroscope-review-*; do
  [ -d "$wt" ] || continue
  branch=$(git -C "$wt" branch --show-current 2>/dev/null) || continue
  if [[ "$branch" == "${expected}"* ]]; then
    suffix="${branch#"$expected"}"
    if [[ "$suffix" =~ ^[0-9a-f]+$ ]]; then
      git worktree remove "$wt" --force
      git branch -D "$branch"
      rm -f "/tmp/macroscope-review-wip-${suffix}.patch"
    fi
  fi
done
```

Replace `${session_branch}` with the branch you are clocking out (e.g.
`fix/reprovision-crash-fix`).

### 4. Remove the agent worktree

Use `git worktree remove`, never `rm -rf`. See
[`.agents/rules/worktrees.md`](../../rules/worktrees.md).

```bash
cd "$repo_root"
git worktree remove "$session_worktree_path" --force
```

`cd` out of the worktree before removing it. If removal fails because you are
still inside that directory, `cd "$repo_root"` and retry.

### 5. Delete local branches

After the worktree is gone:

```bash
cd "$repo_root"
git branch -D "$session_branch"
```

If this session used a `mr/<iid>-review` tracking branch, `"$session_branch"`
is that name (e.g. `mr/72-review`); delete it once the upstream MR is merged.

Do not delete branches that still have open MRs or that another worktree
checks out.

### 6. Prune

```bash
cd "$repo_root"
git worktree prune
```

Never run `git clean -ffdX` from the main checkout; it deletes all of
`.worktrees/`.

### 7. Clock out

Reply briefly:

1. Any subagents interrupted or shells stopped (or "none running")
2. What worktree and branch were removed
3. Any Macroscope sandboxes or `mr/*-review` branches deleted
4. Whether `main` synced to `origin/main` (report `sync_rc`: 0 success, 1
   transient/stale, 2 divergence, 3 fatal config)
5. Confirmation you are done and not continuing

Keep it short. No new tasks, no "want me to..." offers.

## Examples

**User:** `merged. good work. clean up your workspace and clock out.`

**Agent:** Interrupts a background `/rust-verifier` Task still running, stops a
`make run` shell from verification, identifies
`.worktrees/fix/reprovision-crash-fix`, removes its Macroscope sandbox, removes
the worktree, deletes `fix/reprovision-crash-fix`, prunes, reports, stops.

**User:** `/clock-out` (after merging MR !72 from a `mr/72-review` worktree)

**Agent:** Confirms no shells or subagents still running, sets
`session_branch=mr/72-review` and
`session_worktree_path=$repo_root/.worktrees/mr/72-review`, removes its
Macroscope sandbox, removes that worktree, deletes `mr/72-review`, prunes,
reports, stops.
