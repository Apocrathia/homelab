---
name: draft-commit
description: >-
  Handoff a green-enough lap: confirm review evidence, analyze git status/diff,
  draft Conventional Commit + optional draft MR body, list include/exclude
  files. Never commit, push, or merge. Operator owns commit.
disable-model-invocation: true
---

# Draft commit

Last step on the ship path before the operator commits. Produce a **ready-to-
paste** Conventional Commit message (and optional draft MR body). Stop there.

Loop contract:
[`.agents/context/development-loop.md`](../../context/development-loop.md).

Message style SoT for this skill:
[`.cursor/rules/conventional-commit-messages.mdc`](../../../.cursor/rules/conventional-commit-messages.mdc)
plus the quality bar below (same bar as
[`.cursor/commands/commit-message.md`](../../../.cursor/commands/commit-message.md)
for staged-diff quick drafts).

## CRITICAL — operator owns commit

**Never** run `git commit`, `git push`, or create a **non-draft** merge /
merge request that lands on the default branch.

| Action                          | Allowed?                                       |
| ------------------------------- | ---------------------------------------------- |
| `git status` / `git diff` / log | Yes (read-only)                                |
| Draft commit message            | Yes                                            |
| `git add` / stage               | Only if operator explicitly asked to stage     |
| `git commit` / `git push`       | **Never**                                      |
| Create draft MR (GitLab)        | Only if operator explicitly asked; still draft |
| Merge / approve / undraft MR    | **Never**                                      |

Prefer **draft the message first**. Stage only when asked. Even after staging:
**do not commit**.

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
- [ ] 4. Optional: draft MR body (Summary + Test plan) — do not push/create unless asked
- [ ] 5. List include vs exclude files; warn on secrets / .env / unrelated dirty trees
- [ ] 6. Hand off: "Ready for you to commit" with the message
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

Do **not** run that command.

### 4. Optional draft MR (GitLab)

When useful (or asked), draft:

```markdown
## Summary

- …

## Test plan

- [ ] …
```

Do **not** push or create the MR unless the operator explicitly asks. If they
ask: create **draft** only; never merge.

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
5. Exact closer: **Ready for you to commit** (operator runs commit).

## Homelab constraints

- Never `git commit` / push / non-draft merge (operator commits).
- Ask before cluster mutate — this skill does not apply or reconcile.
- Protected paths: do not expand the ship set into unconfirmed protected edits.
- Advice language from the operator earlier in the session does not authorize
  commit or push.
