# `.cursor/` — Agent context system

This directory is the discovery surface for AI agents working in this repo. `AGENTS.md` at the repo root points here.

## Subdirectories

| Path        | What it holds                                          | When to consult                                                                  |
| ----------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `rules/`    | `.mdc` rule files with scoping frontmatter             | Native Cursor system loads always-on and glob-scoped rules automatically         |
| `agents/`   | Persona definitions (charters, system prompts)         | When a task fits a defined persona, adopt it                                     |
| `skills/`   | Project-specific procedural skills                     | When a recurring procedure is documented as a skill, follow it                   |
| `commands/` | Cursor slash commands                                  | When the user invokes a slash command, or when a documented command fits the job |
| `memories/` | Lessons learned and gotchas captured during prior work | Before working in a domain, check for relevant memories                          |

Each subdir has its own `README.md` with the convention and current index.

## How loading works

- **Rules** load via Cursor's native frontmatter system. `alwaysApply: true` rules inject every turn. `globs:` rules inject when matching files are touched. Agent-requestable rules surface via their `description:` and are pulled on demand.
- **Agents, skills, commands, memories** are not auto-loaded. Agents discover them by reading the relevant `README.md` and pulling the specific file.

## Adding new content

- New rule: drop a `.mdc` file in `rules/` with appropriate frontmatter, then add a row to `rules/README.md`.
- New persona, skill, command, or memory: create the file, add an entry to that subdir's README.
- Empty index sections are fine — agents read "no entries yet" as accurate, not broken.
