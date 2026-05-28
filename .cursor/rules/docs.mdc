---
globs: **/*.md
alwaysApply: false
description: "Documentation standards: style, formatting, prettier workflow, no duplicated tunables"
---

# Documentation standards

## Style and content

- High-level, concise overviews with minimal technical detail.
- Match the style and verbosity of existing project READMEs.
- Provide enough context to reorient future developers.
- Practical and actionable — real examples and commands.
- Security-focused when appropriate.
- Make writeups straightforward and context-independent.
- **Do not describe problems that were fixed or improvements made** — this confuses future developers and AI agents.

## Avoid duplicating tunable configuration

- **Resource limits, volume sizes, replica counts, image versions** belong in manifests only — they get tuned and will drift.
- Static values like URLs and hostnames are fine — set once, don't change.
- Ask: "Will this value be tuned over time?" If yes, keep it in the manifest only.
- GitOps means manifests **are** the source of truth for tunable configuration.
- **Do not duplicate configuration info in README files** when config files are located adjacent — avoids updating versions in two places.

## Prettier workflow

- **When `*.md` files are created or modified, run `prettier -w`** on those changed files before final response.
- **Before marking markdown work complete, run `prettier --check`** on changed files and report the result.
- **If Prettier fails or is unavailable, report the exact command/error and stop** — do not claim markdown changes are complete.
- **Do not run repo-wide markdown formatting** unless explicitly requested. Format only files changed in the current task.
