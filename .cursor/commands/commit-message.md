---
description: Generate a conventional commit message for staged changes
---

Analyze `git diff --staged` and generate a commit message following the Conventional Commits spec from `.cursor/rules/conventional-commit-messages.mdc`.

## Requirements

- Use the appropriate type: `feat`, `fix`, `docs`, `chore`, `refactor`, `style`, `perf`, `test`, `build`, `ci`
- Include a scope in parentheses when changes are localized (e.g., directory, component, or feature area)
- Description: imperative mood, lowercase, no period, max 72 chars
- **Always include a detailed body** that explains:
  - The context and motivation for the change
  - Key implementation details or configuration choices
  - Important notes about how the change works (e.g., why `prune: false`, why patches are used, etc.)
  - Use bullet points for multiple implementation details
- Mark breaking changes with `!` after scope or in footer

## Output

Return ONLY the commit message in a code block—no explanations, no markdown fencing, no preamble.
