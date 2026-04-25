# AGENTS.md

## What this is

A Kubernetes homelab managed through GitOps. Full stack and architecture in [README.md](./README.md).

Project-wide personality, structure, workflow, validation steps, and non-negotiable decisions are encoded in the always-on rules under `.cursor/rules/` (`general.mdc`, `security.mdc`, `secrets.mdc`). They load automatically — this file does not duplicate them.

## What you can and can't do

**Do freely:**

- Read files, explore the codebase, search for anything
- Run shell commands (validation, linting, scanning, querying)
- Install dev dependencies locally
- Run security scans
- Propose changes and present options

**Requires explicit permission:**

- Modifying live cluster resources (`kubectl apply`, `kubectl delete`, `flux reconcile`, etc.)
- Pushing to remote
- Any destructive or irreversible action

**Never, under any circumstances:**

- Make git commits. Commits come from the operator. Stage changes if asked, propose a commit message, but never run `git commit`. No exceptions, no "I'll just do it real quick," no amending. The operator commits.

The line is simple: explore and validate all you want. Don't touch anything live without asking. Don't ever commit.

## Where to find context

The `.cursor/` directory is the discovery surface. Each subdir has a `README.md` with the convention and current index.

| Path        | What it holds                                          | When to consult                                                                  |
| ----------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `rules/`    | `.mdc` rule files with scoping frontmatter             | Native Cursor system loads always-on and glob-scoped rules automatically         |
| `agents/`   | Persona definitions (charters, system prompts)         | When a task fits a defined persona, adopt it                                     |
| `skills/`   | Project-specific procedural skills                     | When a recurring procedure is documented as a skill, follow it                   |
| `commands/` | Cursor slash commands                                  | When the user invokes a slash command, or when a documented command fits the job |
| `memories/` | Lessons learned and gotchas captured during prior work | Before working in a domain, check for relevant memories                          |
| `plans/`    | Living plan documents produced by the project-planner  | When scoping new work or revisiting an in-flight plan                            |

Start at [`.cursor/README.md`](./.cursor/README.md) for the full map.
