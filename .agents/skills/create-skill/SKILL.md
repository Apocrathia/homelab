---
name: create-skill
description: >-
  Create a new skill under .agents/skills/. Use when the user says create skill,
  new skill, add a skill, or when a repeated multi-step procedure should become
  a reusable, invocable workflow instead of being re-explained each session.
disable-model-invocation: true
---

# Create skill

Create a procedural skill in `.agents/skills/<name>/SKILL.md` so the parent can
invoke a repeatable workflow by name (`/name`) instead of re-deriving the steps
each session.

Homelab prefers directory skills only:

```text
.agents/skills/<name>/SKILL.md
```

Optionally add `references/` for long reference material or `scripts/` for
executable checks. Do not add `README.md`, `CHANGELOG.md`, or other non-agent
files inside the skill folder.

There is no `skill-authoring` context module in this repo. Use the **Authoring
principles** section below. Related modules that _do_ exist:
[`.agents/context/questions.md`](../../context/questions.md),
[`.agents/context/output.md`](../../context/output.md),
[`.agents/context/loading.md`](../../context/loading.md).

## When to create a skill

| Signal                                                        | Action                         |
| ------------------------------------------------------------- | ------------------------------ |
| A multi-step procedure runs 3+ sessions, same steps each time | Create a skill                 |
| The parent re-derives the same workflow from scratch each lap | Create a skill                 |
| Another skill needs to call this procedure by name            | Create a skill (model-invoked) |

**Do not create a skill when:**

- The procedure is one or two steps. Put it in a rule or context module.
- The task is a single role's charter (what it does, not how to do it). That is
  a **persona**, not a skill. Use [`create-agent`](../create-agent/SKILL.md).
- The workflow is project-specific and unlikely to recur. Keep it in chat or a
  plan file.

## Authoring principles

- **Conciseness** — write only what the agent needs. Prefer bullets and short
  steps over long paragraphs.
- **Invocation choice** — set `disable-model-invocation: true` when only the
  operator should invoke the skill by name. Omit it when the agent should
  discover the skill autonomously, or when another skill needs to call it.
  Each model-invoked description sits in the context window every turn.
- **Progressive disclosure** — keep `SKILL.md` lean; move long catalogs to
  `references/` and load only when the step needs them.
- **Information hierarchy** — (1) ordered steps with completion criteria,
  (2) in-skill reference tables, (3) external `references/` files.
- **Description as the only trigger** — put trigger phrases in frontmatter
  `description`; do not duplicate a "When to Use" section in the body.
- **Imperative voice** — "Read the file and extract…", not "This skill reads…".
- **Consistent terminology** — align with `AGENTS.md` and existing skills.

## Procedure

1. **Name the skill.** Use a verb phrase or noun describing the workflow:
   `find-work`, `review-loop`, `ship-work`. Check `.agents/skills/` for
   collisions.

2. **Create the directory:**

   ```text
   .agents/skills/<name>/SKILL.md
   ```

3. **Write the frontmatter:**

   ```yaml
   ---
   name: <skill-name>
   description: >-
     <what it does; include trigger phrases the agent or operator matches on.
     This is the only trigger surface — do not duplicate it in the body.>
   disable-model-invocation: true
   ---
   ```

   Set `disable-model-invocation: true` for operator-only skills. Omit it for
   model-invoked or skill-to-skill call targets.

4. **Write the body.** Structure:

   - **Opening** — one or two sentences: what the skill does and its boundary
     (read-only, creates worktree, etc.).
   - **Steps** — ordered, numbered. Each step ends on a completion criterion the
     agent can check (done vs not-done).
   - **Reference** — non-ordered material (tables, pattern catalogs) consulted
     during a step. Keep in the skill or move to `references/` if long.
   - **Return** — what the skill hands back to the parent or operator.

5. **Update routing.** If the skill should be discoverable via `AGENTS.md`,
   add a routing table row pointing at the skill.

6. **Wire discovery.** For Cursor, add
   `.cursor/skills/<name>` → `../../.agents/skills/<name>`. Claude skills
   discover via the `.claude/skills` directory symlink. Update
   `.cursor/skills/README.md` (and related indexes) as needed.

7. **Validate:**

   ```bash
   python3 .agents/skills/reconcile-context/scripts/check_links.py
   python3 .agents/skills/reconcile-context/scripts/check_discovery.py
   ```

`.agents/**` and adapter paths are protected — summarize the change set and
get confirmation before writing
([`protected-paths`](../../rules/protected-paths.md)). Edit in a worktree
([`worktrees.md`](../../rules/worktrees.md)).

## Return to parent

Lead with the skill name and one-sentence description. Then:

- **File** — path created
- **Routing** — whether `AGENTS.md` was updated (and the row added)
- **Discovery** — Cursor symlink / Claude discovery status
- **Next** — suggest a first invocation to test the skill
