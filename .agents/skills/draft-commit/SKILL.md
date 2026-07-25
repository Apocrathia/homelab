---
name: draft-commit
description: >-
  Handoff a green-enough lap: confirm review evidence, analyze git status/diff,
  draft Conventional Commit + optional draft MR body, list include/exclude
  files. Draft-only by default; commits/pushes only when the operator
  authorizes this lap.
disable-model-invocation: true
---

# Draft commit

Last step on the ship path. Run from the lap **worktree** (not the workspace
root) so status/diff reflect the change under review. Default: produce a
**ready-to-paste** Conventional Commit message (and optional draft MR body) and
stop there — operator commits. When the operator authorizes shipping this lap,
may run the commit/push per mode (see CRITICAL below).

Loop contract:
[`.agents/context/development-loop.md`](../../context/development-loop.md).

Message style SoT for this skill:
[`.cursor/rules/conventional-commit-messages.mdc`](../../../.cursor/rules/conventional-commit-messages.mdc)
plus the quality bar below (same bar as
[`.cursor/commands/commit-message.md`](../../../.cursor/commands/commit-message.md)
for staged-diff quick drafts).

## CRITICAL — draft by default, ship only when authorized

**Default (no authorization):** never run `git commit`, `git push`, or create
a **non-draft** merge / MR. Draft the message, stop, hand off.

**Authorized** — soft ship language ("ship it", "LGTM", "looks good", "go
ahead") or explicit `commit` / `push`; full contract:
[`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship).
Authorization from earlier in the session on a different topic does not carry
forward. When authorized, may commit/push per mode:

| Mode           | May do                                                                                                                                                                                                                                                   | Never                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Attended**   | Commit + push to `main`. Diverged `main` → stash/rebase/push recipe below                                                                                                                                                                                | Force-push to `main`                         |
| **Autonomous** | Create/use a feature branch; commit; open a **draft** MR when shipping is authorized. Ready/undraft only when ship is authorized for this lap (same soft ship language or explicit `commit`/`push`) — not on a bare "ready the MR" / "undraft" ask alone | Commit/push directly to `main`; merge the MR |

Regardless of mode: **never merge or approve the MR** — that's always the
operator's call.

Hard stops even when authorized (full list in
[`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship)):
secrets / credential-looking files, force-push to `main`/`master`, amending
someone else's or an already-pushed commit, staging unrelated WIP. Hooks
always run — never `--no-verify`. Attribution (soft, not a hard stop): prefer
`Co-authored-by: Composer <composer@cursor.com>` on agent-shipped commits.

### Diverged-main recipe (attended)

When `origin/main` moved since the branch started, and unrelated WIP is
dirty in the tree:

```bash
git stash push -u -m "wip: unrelated changes"   # only if unrelated WIP is dirty
git fetch origin main
git rebase origin/main
git push origin main
git stash pop                                    # restore WIP, if stashed
```

No force-push to `main` — resolve rebase conflicts normally. If the rebase
gets messy, stop and surface instead of forcing.

| Action                          | Allowed?                                                                                                                                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git status` / `git diff` / log | Yes (read-only), always                                                                                                                                                                                                                                                                                 |
| Draft commit message            | Yes, always                                                                                                                                                                                                                                                                                             |
| `git add` / stage               | Only when asked, or as part of an authorized ship                                                                                                                                                                                                                                                       |
| `git commit`                    | Only when authorized (see modes above)                                                                                                                                                                                                                                                                  |
| `git push`                      | Only when authorized (see modes above)                                                                                                                                                                                                                                                                  |
| Create draft MR (GitLab)        | When asked, or as part of an authorized autonomous ship                                                                                                                                                                                                                                                 |
| Ready / undraft MR              | Only when ship is authorized for this lap (soft ship language or explicit `commit`/`push`). Bare "ready the MR" / "undraft" without ship auth → refuse; point at [`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship); operator can ready in the UI or authorize ship first |
| Merge, approve MR               | **Never** — operator's call, always                                                                                                                                                                                                                                                                     |

Not authorized → draft the message and stop.

## When to run

- After [`review-loop`](../review-loop/SKILL.md) (and usually
  [`reconcile-docs`](../reconcile-docs/SKILL.md) /
  [`reconcile-context`](../reconcile-context/SKILL.md)).
- When the operator asks to draft a commit / MR handoff.
- Skip inventing a handoff when review evidence is red and blockers are
  unfixed — surface blockers instead.

Quick staged-only message (no lap handoff): `/commit-message` slash command is
enough. This skill is the full include/exclude + evidence gate.

## Workflow

```
- [ ] 1. Confirm review-loop / verifier evidence is green enough (or surface blockers)
- [ ] 2. git status + git diff (+ recent log for message style) — read-only
- [ ] 3. Draft Conventional Commit message (HEREDOC-ready)
- [ ] 4. Check authorization (soft ship language / explicit `commit`/`push`); default is draft-only
- [ ] 5. Optional: draft MR body (Summary + Test plan) — do not push/create unless asked or authorized
- [ ] 6. List include vs exclude files; warn on secrets / .env / unrelated dirty trees
- [ ] 7. Not authorized → hand off "Ready for you to commit" with the message.
         Authorized → commit/push per mode (see CRITICAL); report what shipped
```

### 1. Evidence gate

Accept prior [`review-loop`](../review-loop/SKILL.md) / persona verifier output
when it clearly covers this diff. If missing or red:

- Re-run the minimal applicable checks, or point at blockers.
- Do **not** draft a message that implies green when evidence is red.
- Partial green with known residual risk → say so explicitly in the handoff.

### 2. Diff analysis (read-only)

In parallel when useful:

```bash
git status
git diff
git diff --cached
git log -5 --oneline
```

Prefer `git diff --staged` when the operator already staged. Scope the ship set
to **this lap**. Unrelated dirty paths → exclude + warn.

### 3. Conventional Commit draft

Follow Conventional Commits
([`.cursor/rules/conventional-commit-messages.mdc`](../../../.cursor/rules/conventional-commit-messages.mdc))
and recent `git log` style.

**Message quality (from `/commit-message`):**

- Type: `feat` | `fix` | `docs` | `chore` | `refactor` | `style` | `perf` |
  `test` | `build` | `ci` (others only when they fit better)
- Scope in parentheses when localized (e.g. `agents`, `flux`, app/dir name)
- Description: imperative mood, lowercase, no trailing period, max ~72 chars
- Focus the subject on **why**, not a file list
- **Always include a body** that covers:
  - Context / motivation
  - Key implementation or config choices worth remembering
  - Non-obvious behavior (why this flag, why this pattern)
  - Bullets when there are multiple points
- Breaking changes: `!` after type/scope and/or `BREAKING CHANGE:` footer

Emit a HEREDOC-ready block the operator can paste:

```bash
git commit -m "$(cat <<'EOF'
<type>[optional scope]: <description>

<body>

[optional footer(s)]
EOF
)"
```

Do **not** run that command unless the operator authorized shipping this lap
(see CRITICAL). If authorized attended, run it against `main` (rebase first if
diverged); if authorized autonomous, run it against the feature branch.

### 4. Optional draft MR (GitLab)

When useful (or asked), draft:

```markdown
## Summary

- …

## Test plan

- [ ] …
```

Do **not** push or create the MR unless the operator explicitly asks, or it is
part of an authorized autonomous ship — **draft** MR by default when shipping
is authorized. Ready/undraft only when ship is authorized for this lap (same
soft ship language or explicit `commit`/`push`); a bare "ready the MR" /
"undraft" ask without ship authorization → refuse and point at
[`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship)
— operator can ready in the UI, or authorize ship first. Never merge or
approve — that stays the operator's call, always.

### 5. Include / exclude

| Include                        | Exclude / warn                                          |
| ------------------------------ | ------------------------------------------------------- |
| Paths that belong to this lap  | Unrelated dirty trees                                   |
| Satisfied issue/plan deletions | `.env`, credential files, local secrets                 |
| Docs updated for the behavior  | `.scratch/` dumps, IDE noise unless operator wants them |

Warn loudly on anything that looks like a secret or unmanaged Secret YAML.

### 6. Handoff shape

Lead with blockers if any; else:

1. Evidence status (one line).
2. Include / exclude file lists.
3. HEREDOC commit message.
4. Optional draft MR body.
5. Closer: not authorized → **Ready for you to commit**. Authorized → run the
   commit/push per mode, then report what shipped (commit SHA / branch / MR
   link).

## Homelab constraints

- Default: no commit/push (operator commits). Authorized (see CRITICAL) →
  commit/push per mode; never force-push `main`, never touch someone else's
  or an already-pushed commit, never stage unrelated WIP.
- Ask before cluster mutate — this skill does not apply or reconcile.
- Protected paths: do not expand the ship set into unconfirmed protected edits.
- Advice language, or authorization from earlier in the session on a
  different topic, does not authorize commit or push.
