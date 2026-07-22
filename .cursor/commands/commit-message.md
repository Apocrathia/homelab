---
description: Generate a conventional commit message for staged changes
---

Analyze `git diff --staged` and generate a commit message following the
Conventional Commits spec in
[`.cursor/rules/conventional-commit-messages.mdc`](../rules/conventional-commit-messages.mdc)
and the message quality bar in
[`.agents/skills/draft-commit/SKILL.md`](../../.agents/skills/draft-commit/SKILL.md)
(§ Conventional Commit draft).

For a full lap handoff (evidence gate, include/exclude, optional MR body), use
the [`draft-commit`](../../.agents/skills/draft-commit/SKILL.md) skill instead.
This command is the thin staged-diff path.

## Requirements

- Use the appropriate type: `feat`, `fix`, `docs`, `chore`, `refactor`,
  `style`, `perf`, `test`, `build`, `ci`
- Include a scope in parentheses when changes are localized (e.g. directory,
  component, or feature area)
- Description: imperative mood, lowercase, no period, max 72 chars
- **Always include a detailed body** that explains:
  - The context and motivation for the change
  - Key implementation details or configuration choices
  - Important notes about how the change works (e.g. why `prune: false`, why
    patches are used)
  - Use bullet points for multiple implementation details
- Mark breaking changes with `!` after scope or in a `BREAKING CHANGE:` footer
- Never run `git commit` / `git push` — return the message only

## Output

Return ONLY the commit message in a fenced code block — no preamble.
