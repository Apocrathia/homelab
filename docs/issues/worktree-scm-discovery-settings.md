---
title: "Agent worktrees are invisible in harness SCM without opt-in settings"
kind: spec
status: open
severity: medium
source: dogfood
found_at: 2026-07-25
found_by: agent
area: agents
slice: hitl
---

# Agent worktrees are invisible in harness SCM without opt-in settings

## Problem / desired state

[`worktrees.md`](../../.agents/rules/worktrees.md) requires agents to edit inside
a linked git worktree under `.worktrees/<type>/<slug>`. Git tracks those trees
correctly, but an editor's source control UI does not show them unless the
operator opts in. The operator can therefore run several agents in isolation and
still have no way to review their uncommitted work from the UI.

Desired state: the rule tells the reader which harness settings make agent
worktrees visible, so isolation and reviewability ship together.

## Repro

1. From the primary checkout, create a linked worktree:
   `git worktree add -b docs/example .worktrees/docs/example main`.
2. Edit a file inside that worktree.
3. Open the primary checkout in Cursor and look at Source Control.

`git worktree list` shows both trees. Source Control shows only the primary
checkout.

## Acceptance

- `.agents/rules/worktrees.md` documents the harness settings required to see
  linked worktrees in source control, alongside the existing create/cleanup
  steps.
- A reader following the rule end to end can both create a worktree and review
  its changes in the UI without further research.
- The Cursor-specific settings and their defaults are named explicitly, since
  the defaults are the blocker.

## Feedback loop

- `git worktree list` — the linked tree is registered.
- `git -C .worktrees/<type>/<slug> status --short` — changes exist on disk.
- After a window reload, the worktree appears as its own entry in Source
  Control.
- `python3 .agents/skills/reconcile-context/scripts/check_links.py` — rule links
  resolve.
- `prettier --check .agents/rules/worktrees.md docs/issues/*.md`

## Implementation hint

Cursor's bundled git extension ships these defaults:

| Setting                       | Default       | Effect                                                           |
| ----------------------------- | ------------- | ---------------------------------------------------------------- |
| `git.autoRepositoryDetection` | `openEditors` | No folder walk; repos appear only when a file in them is open    |
| `git.detectWorktrees`         | `false`       | Linked worktrees are not opened as repositories                  |
| `git.detectWorktreesLimit`    | `50`          | Cap on auto-opened worktrees                                     |
| `git.showCursorWorktrees`     | `false`       | Cursor-managed agent worktrees hidden from the Repositories view |

Recommended user settings (both):

- `git.detectWorktrees: true` and `git.showCursorWorktrees: true` — Cursor path;
  both default to `false`. After a window reload, linked and Cursor-managed
  worktrees appear in Source Control.
- `git.repositoryScanMaxDepth: 4` — still useful for straight VS Code (and any
  harness where `git.autoRepositoryDetection` is `true` or `subFolders`). Our
  layout is `.worktrees/<type>/<slug>` (depth 3); 4 gives headroom. On Cursor
  alone this knob is inert because Cursor overrides
  `git.autoRepositoryDetection` to `openEditors` via `configurationDefaults`, so
  the depth-limited folder scan never runs.

Add a short "Seeing worktrees in your editor" section to the rule. Keep it
harness-neutral in the prose and name both the Cursor opt-ins and the VS Code
scan-depth setting as concrete examples.

## Notes

Upstream candidate. The same gap exists in
[prime-context](https://github.com/PrimeIntellect-ai/prime-context) `rules/worktrees.md`,
which is the source this repo's rule derives from. That repo has no local issue
ledger, so contributing back means a GitHub issue or PR against
`PrimeIntellect-ai/prime-context`. Keep the upstream version harness-neutral —
name the setting keys as an example rather than assuming Cursor.

Homelab's ship model stays operator-gated regardless; this issue is about
visibility, not about granting agents commit authority.
