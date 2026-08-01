---
name: ship-work
description: >-
  Commit, push, open a GitLab MR, then watch it until merged or dismissed. Use
  after review-loop is clean, when asked to ship, open an MR, or watch a branch
  MR.
disable-model-invocation: true
---

# Ship work

Take a review-ready branch from the worktree through commit, push, MR creation,
then hand off to [`watch-mr`](../watch-mr/SKILL.md) until merged or dismissed.
The parent orchestrates; subagents run git, GitLab MCP / `glab`, reviewers, and
fixes.

**Upstream:** [`review-loop`](../review-loop/SKILL.md) should report **clean**
before you commit, unless the operator explicitly overrides. **Downstream:**
after merge, run [`clock-out`](../clock-out/SKILL.md).

For MR-only maintenance (branch already pushed, MR open, no new commits to
author), [`watch-mr`](../watch-mr/SKILL.md) alone is enough. Prefer this skill
when you also need commit, push, or MR creation.

Loop contract:
[`.agents/context/development-loop.md`](../../context/development-loop.md).
Authorization:
[`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship).

**Hybrid ship model:** this skill is the authorized contribute path (commit →
push → MR → watch). When the lap is **not** ship-authorized, stop at
[`draft-commit`](../draft-commit/SKILL.md) instead — do not run this skill's
commit/push steps. Soft ship language ("ship it", "LGTM", "looks good", "go
ahead") or explicit `commit` / `push` / `/ship-work` / `/self-improve` authorizes
this lap. Never merge or approve the MR unless the operator names that action.

## Non-Cursor agents

This skill assumes Cursor's subagent system (`shell`, `bugbot`, fix subagents).
Agents without that layer run git and GitLab tools directly from the shell.

- **Step 0:** resolve MR via GitLab MCP (`user-gitlab`) or `glab mr view` on the
  host. Prefer MCP.
- **Step 1** ("Bugbot: `Diff: uncommitted changes`"): Bugbot is a Cursor
  subagent type. Skip it outside Cursor; run local reviewers only. See
  [`review-loop`](../review-loop/SKILL.md).
- **Step 3** (`watch-mr`): same Bugbot skip outside Cursor.

## Roles

| Job                               | Subagent                             | Parent does                                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commit message draft              | parent                               | Read diff; follow Conventional Commits ([`.cursor/rules/conventional-commit-messages.mdc`](../../../.cursor/rules/conventional-commit-messages.mdc)) and [`draft-commit`](../draft-commit/SKILL.md) message quality |
| Push / open MR                    | `shell` (local system with git auth) | Spawn with worktree **absolute path**; prefer GitLab MCP for MR create                                                                                                                                              |
| Local reviewers (optional re-run) | `shell` + `bugbot`                   | After substantial watch-mr fixes                                                                                                                                                                                    |
| GitLab thread triage              | `shell` + fix subagents              | Same rules as `watch-mr`                                                                                                                                                                                            |
| MR watch loop                     | parent or `shell`                    | [`watch-mr`](../watch-mr/SKILL.md) until merged or dismissed                                                                                                                                                        |

## Prerequisites

- Worktree on a `type/short-slug` feature branch under `.worktrees/` (not
  workspace root). See [`worktrees.md`](../../rules/worktrees.md).
- `review-loop` clean on the branch diff, or operator override.
- GitLab MCP (`user-gitlab`) preferred; `glab` authenticated on the host as
  fallback.
- Protected paths: name and confirm before editing per
  [`protected-paths.md`](../../rules/protected-paths.md).
- Lap is ship-authorized (see hybrid model above).

## Workflow

```
- [ ] 0. Confirm worktree, branch, review-loop status, authorization
- [ ] 1. Stage and commit (HEREDOC message)
- [ ] 2. Push branch; create MR if none exists (draft by default for autonomous)
- [ ] 3. Watch MR until merged or dismissed ([`watch-mr`](../watch-mr/SKILL.md))
- [ ] 4. Report; hand off clock-out after human merge
```

### 0. Confirm scope

```bash
wt_root=$(git rev-parse --show-toplevel)
branch=$(git branch --show-current)
repo_root=$(git worktree list --porcelain | awk '/^worktree / { sub(/^worktree /, ""); print; exit }')
```

Resolve existing MR for `$branch` via GitLab MCP
(`list_merge_requests` / `get_merge_request`) or:

```bash
mr=$(glab mr view --json iid -q .iid 2>/dev/null || true)
```

Record `wt_root`, `branch`, `mr` (empty if none yet). Stop if checkout is
`main`, workspace root, or branch is not `type/short-slug` (reject platform
defaults like `featurehomelab-self-improve-lap-*`). Pass **absolute**
`$wt_root` to every subagent.

### 1. Commit

Only when the lap is ship-authorized. Stage the intended diff.

Run a final uncommitted review pass if anything changed since `review-loop`
(Macroscope / Bugbot / Codex per [`review-loop`](../review-loop/SKILL.md);
non-Cursor agents skip Bugbot).

Commit with Conventional Commits (imperative subject, body covering why /
non-obvious choices). Use a HEREDOC. Do not `--no-verify` unless the operator
asks. Soft attribution: prefer
`Co-authored-by: Composer <composer@cursor.com>`.

Hard stops even when authorized: secrets, force-push to `main`, amending
someone else's or already-pushed commit, staging unrelated WIP — see
[`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship).

### 2. Push and open MR

Run on the local system with network. Prefer **feature-branch + MR** (never
direct `main` on autonomous / self-improve laps). Attended soft-ship to `main`
still uses [`draft-commit`](../draft-commit/SKILL.md) attended path when the
operator wants that — this skill's default contribute path is branch + MR.

```bash
cd "$wt_root"
branch=$(git branch --show-current)
pre_line=$(git ls-remote origin "refs/heads/$branch") || exit 1
pre_oid=$(printf '%s\n' "$pre_line" | awk '{print $1}')
git push -u origin HEAD
push_ok=$?
if [ "$push_ok" -ne 0 ]; then
  echo "push failed (exit $push_ok)" >&2
  exit "$push_ok"
fi
post_line=$(git ls-remote origin "refs/heads/$branch") || exit 1
post_oid=$(printf '%s\n' "$post_line" | awk '{print $1}')
pushed_new=0
if [ -n "$post_oid" ] && [ "$pre_oid" != "$post_oid" ]; then
  pushed_new=1
fi
```

If `mr` is empty, create a **draft** MR (Summary + Test plan). Prefer GitLab
MCP `create_merge_request`; fallback:

```bash
glab mr create --draft --title "$mr_title" --description "$(cat "$mr_body_file")" --source-branch "$branch" --target-branch main
```

Record `push_ok=0` when `git push` exits 0 (including "Everything up-to-date").
Stop the lap on push failure; do not proceed to step 3.

**Hard gate:** refuse push when `branch` is not `type/short-slug`. Create a
missing MR inside the push step; do not defer first-ship MR creation to step 3.

Optional session marker (best-effort; not required for correctness):

```bash
if [ "$pushed_new" -eq 1 ] && [ -n "${mr:-}" ]; then
  mkdir -p "$repo_root/.scratch/agent-loop"
  printf '%s\n' "{\"mr\":$mr,\"headOid\":\"$post_oid\",\"pushed_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
    > "$repo_root/.scratch/agent-loop/session-pushed.json"
fi
```

Write only when the remote ref advanced. Do not write on "Everything
up-to-date".

### 3. Watch MR until merged or dismissed

Re-resolve `mr` after step 2 if it was empty. Run
[`watch-mr`](../watch-mr/SKILL.md) with the MR IID. That skill handles threads,
CI, conflicts, draft status, and reporting. It does **not** merge.

**Hard gate:** do not report ship complete until `watch-mr` exits with
**merged**, **dismissed**, **hard-blocked**, or **skip:hot-lock**. Merge-ready
is a milestone — continue watching until a terminal. Opening the MR is not the
end of the lap.

Do not merge unless the operator explicitly asks.

### 4. Report

```markdown
## Ship work

**Branch:** `<branch>`
**MR:** !N — <url>
**Result:** merged | dismissed | hard-blocked | skip:hot-lock
**Milestone:** merge-ready at <time|n/a> (from watch-mr; non-terminal)

### Commits

- `<sha>` — <subject>

### Watch MR

- Result: merged | dismissed | hard-blocked | skip:hot-lock
- Milestone: merge-ready at <time|n/a>
- Cycles: <N>

### Next

- Human merge when Result is still open (unless operator asked you to merge)
- `/clock-out` after merge only (not after dismissal)
- `/reconcile-docs` if behavior or contracts moved
```

## Handoffs

| From                             | To                                                                 |
| -------------------------------- | ------------------------------------------------------------------ |
| `implement-change`               | `review-loop` then `ship-work` (when authorized) or `draft-commit` |
| `find-work` launch brief         | new chat → `implement-change` (not this skill)                     |
| Existing open MR, no new commits | `watch-mr` only                                                    |
| After merge                      | `clock-out`                                                        |
| Not ship-authorized              | `draft-commit` only                                                |
