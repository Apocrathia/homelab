# `.cursor/` — Agent context system

This directory is the discovery surface for AI agents working in this repo. `AGENTS.md` at the repo root points here.

## Subdirectories

Each area has a nested **README** with conventions and a file index — start there before adding or pulling individual files.

| Path        | What it holds                                                       | README                                     | When to consult                                                                                   |
| ----------- | ------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `rules/`    | `.mdc` rule files with scoping frontmatter                          | [rules/README.md](./rules/README.md)       | Always-on and glob-scoped rules load automatically; requestable rules use `description:` metadata |
| `agents/`   | Persona definitions (charters, system prompts)                      | [agents/README.md](./agents/README.md)     | When a task fits a defined persona, adopt it and open the linked charter                          |
| `skills/`   | Project-specific procedural skills                                  | [skills/README.md](./skills/README.md)     | When a recurring procedure is documented as a skill, follow it                                    |
| `commands/` | Cursor slash commands                                               | [commands/README.md](./commands/README.md) | When the user invokes a slash command, or when a documented command fits the job                  |
| `memories/` | Lessons learned and gotchas captured during prior work              | [memories/README.md](./memories/README.md) | Before working in a domain, check for relevant memories                                           |
| `plans/`    | Living plan documents produced by the project-planner               | [plans/README.md](./plans/README.md)       | When scoping new work or revisiting an in-flight plan                                             |
| `hooks/`    | Cursor hook scripts; companion config is `hooks.json` in `.cursor/` | [hooks/README.md](./hooks/README.md)       | When changing hook scripts, matchers, or Ruff config for hooks                                    |

Paths in the first column are relative to `.cursor/`.

## How loading works

- **Rules** load via Cursor's native frontmatter system. `alwaysApply: true` rules inject every turn. `globs:` rules inject when matching files are touched. Agent-requestable rules surface via their `description:` and are pulled on demand. Catalog: [rules/README.md](./rules/README.md).
- **Agents, skills, commands, memories, plans** are not auto-loaded as a group. Skills under `skills/<name>/SKILL.md` are indexed by Cursor from frontmatter and may auto-invoke when a task matches their description. Agents, commands, memories, and plans are discovered through each subdir's README (table above), then opened explicitly. Cursor's planning UI also surfaces files under `plans/` natively.
- **Hooks** use [hooks/README.md](./hooks/README.md) plus [hooks.json](./hooks.json) one level up in `.cursor/`. Python under `hooks/` is formatted with Ruff (`hooks/pyproject.toml`); commands and pre-commit wiring are documented in the hooks README.

## Adding new content

- **Rules:** add a `.mdc` under `rules/` with the right frontmatter, then register it in [rules/README.md](./rules/README.md).
- **Agents, skills, commands, memories, plans:** add the file and append to that subdir's README ([agents](./agents/README.md), [skills](./skills/README.md), [commands](./commands/README.md), [memories](./memories/README.md), [plans](./plans/README.md)).
- **Hooks:** change [hooks.json](./hooks.json) and/or scripts under `hooks/`; document behavior in [hooks/README.md](./hooks/README.md).
- Empty index sections are fine — agents read "no entries yet" as accurate, not broken.
