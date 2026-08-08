---
name: create-agent
description: >-
  Create a new agent persona under .agents/agents/. Use when the user says
  create agent, new agent, add a persona, or when a recurring delegation pattern
  needs its own subagent charter.
disable-model-invocation: true
---

# Create agent

Create a sub-agent persona in `.agents/agents/` so the parent can delegate a
recurring role by name (`/name`) instead of hand-writing cold-start prompts each
time.

Homelab prefers the directory layout:

```text
.agents/agents/<name>/agent.md
```

Do **not** create flat `.agents/agents/<name>.md` files unless the operator
explicitly asks — that layout is for older scaffolds and breaks discovery
parity with [`.agents/README.md`](../../README.md).

There is no `agent-personas` context module in this repo. Use the **Format**
section below (and existing personas under `.agents/agents/`) as the charter
contract. Related modules that _do_ exist:
[`.agents/context/questions.md`](../../context/questions.md),
[`.agents/context/voice.md`](../../context/voice.md),
[`.agents/context/output.md`](../../context/output.md),
[`.agents/rules/subagents.md`](../../rules/subagents.md).

## When to create a persona

| Signal                                                                     | Action           |
| -------------------------------------------------------------------------- | ---------------- |
| You delegate the same role 3+ times with similar prompts                   | Create a persona |
| A role needs project-specific context the parent cannot cold-start quickly | Create a persona |
| The `subagents` rule table has no row for a task type                      | Create a persona |

**Do not create a persona when:**

- A one-off delegation (unique task, unlikely to recur). Write a cold-start
  prompt instead.
- An existing persona covers the role with minor wording differences. Extend
  the existing one.
- The task is procedural (multi-step workflow). That is a **skill**, not a
  persona. Use [`create-skill`](../create-skill/SKILL.md) instead.

## Personas vs skills

|         | Persona                                      | Skill                                       |
| ------- | -------------------------------------------- | ------------------------------------------- |
| What    | A role charter: who, what, boundaries        | A procedure: steps to follow, in order      |
| Runs in | A sub-agent (own context window)             | The parent agent (or a delegated sub-agent) |
| Invoked | `/name` by the parent or operator            | `/name` by the operator or model-invoked    |
| Returns | Evidence and findings to the parent          | A completed workflow (MR, issue, report)    |
| Lives   | `.agents/agents/<name>/agent.md` (preferred) | `.agents/skills/<name>/SKILL.md`            |

## Procedure

1. **Name the persona.** Use a role noun, not a verb phrase: `debugger`, not
   `debug-issues`. One word or kebab role name when possible. Check
   `.agents/agents/` for name collisions.

2. **Create the directory and file:**

   ```text
   .agents/agents/<name>/agent.md
   ```

3. **Write the frontmatter:**

   ```yaml
   ---
   name: <persona-name>
   description: <what it does; include trigger phrases the parent matches on>
   model: inherit # or "fast" for cheap read-only scouts
   readonly: true # if the persona should not edit files
   ---
   ```

4. **Write the body.** Structure every persona the same way:

   - **Opening line** — one sentence: what the persona is and does.
   - **Context to load** — which `.agents/context/` modules, skills, or docs to
     read before working. Link, do not copy.
   - **Method / focus areas** — what the persona does, as direct commands.
   - **Repo notes** (optional) — project-specific gotchas, toolchain details,
     naming conventions.
   - **Boundaries** — what the persona does not do (edit files, run state-
     changing commands, etc.).
   - **Return to parent** — the structured return format. Lead with 1-3 sentences
     answering the question. Then evidence, not narration.

5. **Keep it under 60 lines.** A persona is a charter, not a manual. If it grows
   past 60 lines, the role is too broad — split into two personas or move
   reference content to a linked doc.

6. **Update the routing table.** Add the persona to
   [`.agents/rules/subagents.md`](../../rules/subagents.md) and the
   `AGENTS.md` routing row if needed:

   ```markdown
   | `<persona-name>` | <when to delegate to it> |
   ```

7. **Wire discovery.** For Cursor, add a symlink under `.cursor/agents/` (or
   the adapter path this repo uses for personas) pointing at the new
   `agent.md`. Claude discovers via `.claude/` adapter links. Run discovery
   checks after wiring.

8. **Validate.** Run `check_links.py` (and `check_discovery.py` if discovery
   changed):

   ```bash
   python3 .agents/skills/reconcile-context/scripts/check_links.py
   python3 .agents/skills/reconcile-context/scripts/check_discovery.py
   ```

`.agents/**` and adapter paths are protected — summarize the change set and
get confirmation before writing
([`protected-paths`](../../rules/protected-paths.md)). Edit in a worktree
([`worktrees.md`](../../rules/worktrees.md)).

## Format

```markdown
---
name: <persona-name>
description: <what it does; include trigger phrases>
model: inherit
readonly: true
---

<One sentence: what the persona is and does.>

## Context to load

<Which .agents/context/ modules, skills, or docs to read. Link, do not copy.>

## <Focus areas or method>

<Direct commands: what the persona does.>

## Repo notes

<!-- Project-specific gotchas, toolchain details, naming conventions. -->

## Boundaries

<What the persona does not do.>

## Return to parent

<Structured return format. Lead with 1-3 sentences answering the question.
Then evidence, not narration.>
```

| Field         | Values                         | Notes                                          |
| ------------- | ------------------------------ | ---------------------------------------------- |
| `name`        | Role noun (e.g. `debugger`)    | Matches directory name; one word when possible |
| `description` | What it does + trigger phrases | The only trigger surface; no body duplication  |
| `model`       | `inherit` or `fast`            | `fast` for cheap read-only scouts              |
| `readonly`    | `true` or `false`              | `true` when the persona should not edit files  |

## Template references

Use existing homelab personas as format references (not upstream
`templates/agents/*.tmpl`, which are not present in this consuming repo):

```text
.agents/agents/manifest-implementer/agent.md
.agents/agents/manifest-verifier/agent.md
.agents/agents/documentation-reviewer/agent.md
.agents/agents/context-steward/agent.md
```

## Return to parent

Lead with the persona name and one-sentence description. Then:

- **File** — path created (`.agents/agents/<name>/agent.md`)
- **Routing** — confirm the `subagents` rule (and `AGENTS.md` if needed) was updated
- **Discovery** — confirm Cursor/Claude adapter links
- **Next** — suggest the first delegation to test the persona
