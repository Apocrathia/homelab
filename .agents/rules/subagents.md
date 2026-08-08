---
description: Prefer defined personas; fan out parallel subagents; implementer↔reviewer pairs with Prompt contract
alwaysApply: true
---

# Subagents / personas

Subagent delegation is graph orchestration: each subagent is a node, the parent
wires the edges, and atomic tasks report back for compilation by the parent or
another node. This is graph engineering — multiple agents, each running their
own loop, connected through a directed acyclic graph (DAG). A single agent
doing everything is a degenerate graph (one node). The work graph in
[`development-loop.md`](../context/development-loop.md) is the full DAG.

The parent agent coordinates; it does not hoard context. Delegate before you
burn turns on exploration, shell work, or review. When subagents return,
summarize outcomes for the operator; do not restate their full output (see
[`response-shape.md`](./response-shape.md)).

**Worktrees after alignment, before edits.** If scope is unclear, run
`alignment` before opening a worktree. Once the operator asks to proceed, before
spawning implementers (or editing files in the parent), open or create a git
worktree on a dedicated branch under `.worktrees/`. Do not edit in the workspace
root checkout. See [`worktrees.md`](./worktrees.md).

When a task clearly matches a persona under [`.agents/agents/`](../agents/),
adopt it (or delegate) instead of freelancing a weaker process.

| Persona                     | Use for                                                              | Role        |
| --------------------------- | -------------------------------------------------------------------- | ----------- |
| `project-planner`           | Scoping, living plans                                                | unpaired    |
| `manifest-implementer`      | Flux/Helm/Kustomize edits (implementer role)                         | implementer |
| `reviewer`                  | Acceptance Bar judge for a Slice; returns `pass` \| `gap`; readonly  | reviewer    |
| `manifest-verifier`         | Local validation evidence (verifier arbiter after pair returns pass) | verifier    |
| `site-reliability-engineer` | Incidents, Flux health, capacity                                     | unpaired    |
| `security-analyst`          | Adversarial / threat review (domain reviewer split)                  | reviewer    |
| `documentation-reviewer`    | Doc standards audit (domain reviewer split)                          | reviewer    |
| `context-steward`           | Context drift detect; propose-only on protected paths                | unpaired    |

Roles: `implementer` \| `reviewer` \| `verifier` \| unpaired.
`manifest-implementer` and `reviewer` form an inseparable pair;
`manifest-verifier` is a separate arbiter after the pair returns pass.
Domain reviewers (`security-analyst`, `documentation-reviewer`) still fill the
**reviewer** slot — do not invent parallel role names for the same jobs.

Invoke by name or delegate explicitly. Run independent agents in parallel in
one message.

## Fan-out mandate

When a task has **2+ independent domains** (different files, skills, or research
areas that do not share write locks), the parent **MUST** launch parallel
subagents (Task tool / harness equivalent) — one agent per domain — rather than
serially exploring alone.

**Fan out when:** multi-file harvest; parallel research; independent
implement/verify; multi-deliverable waves.

**Do not fan out when:** single-file edit; tightly coupled debugging where
shared state matters; exploratory "what is broken?" before domains are known.

## When to stay in the parent

The parent may coordinate, answer questions, or make a trivial edit without
spawning a subagent — but **any file edit still requires a worktree first**
(see [`worktrees.md`](./worktrees.md)). Trivial single-file edits skip subagent
delegation, not worktree setup.

- Single known file, single edit, no discovery — parent may edit directly in
  the worktree.
- Operator asked you not to delegate.
- Subagent would need conversation context the prompt cannot carry (rare;
  write a detailed cold-start prompt instead).

## Prompt contract (always-on)

Subagents start cold. Every Task prompt includes these fields:

| Field        | Meaning                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Slice**    | Shared id for an implementer↔reviewer pair (omit for verifier and unpaired roles)                                         |
| **Goal**     | Role-specific: what _this_ agent must do                                                                                   |
| **Bar**      | Inspectable standard (acceptance, suite, constraints, threat model, clean CLI reviewers, reference behavior). Never vibes. |
| **Role**     | `implementer` \| `reviewer` \| `verifier` \| unpaired (`scout`, `planner`, …)                                              |
| **Artifact** | Concrete thing to produce or inspect (paths, commands, diff, rendered output)                                              |
| **Return**   | Structured evidence handoff                                                                                                |

Ask for evidence (file paths, command output, root cause), not vibes.

> **Migration note:** skills that predate the Prompt contract may omit fields
> when the parent supplies equivalent context inline.
> [`implement-change`](../skills/implement-change/SKILL.md) already uses the
> full contract (implementer↔reviewer pair → verifier arbiter). Other skills
> (reconcile-docs, ship-work, …) are still catching up.

### Implementer ↔ reviewer pairs

For each **independent** unit of work, `manifest-implementer` (or another
parent implementer) and `reviewer` are an **inseparable pair**. Project-specific
reviewer splits (`security-analyst`, `documentation-reviewer`, …) and CLI
reviewers (Macroscope / Bugbot / Codex) still fill the **reviewer** slot.

```
implementer → reviewer → pass | gap
                ↑___________|  (new Tasks both sides on gap)
```

- **Same Bar and Artifact; different Goals.** The implementer changes the
  artifact toward the Bar. The reviewer judges the artifact against the Bar and
  returns `pass` or `gap` (the single biggest remaining miss).
- **Implementer never grades itself.** Pass against the Bar is the reviewer's
  job. Local smoke checks are fine; they are not a pass.
- **Reviewer does not inherit implementer rationale.** Give Goal, Bar,
  Artifact, constraints — not the implementer's narrative.
- **Each round is a new Task for both sides.** On `gap`, spawn a **new**
  implementer (gap + Bar + Artifact — omit prior-round narrative) and then a
  **new** reviewer.
- **Fan out only independent slices.** Coupled surfaces get one implementer
  (sequential). Reviewers stay fresh either way.
- **Pair stop** when the reviewer returns `pass`, or when stop-loss / an
  explicit skill cap / the operator stops the run.

### Verifier (arbiter)

`manifest-verifier` is **not** in the pair. It runs **after** the
implementer↔reviewer pair returns `pass`. It independently observes and
assesses the Artifact (local format/template/lint/scan evidence), then reports
to the **orchestrator** (parent). It does not drive the gap loop and does not
send work directly to a new implementer.

- On **pass**: orchestrator continues (next Slice, review-loop, ship path, …).
- On **issue**: report to the orchestrator; the parent decides (new Slice/pair,
  stop, or ignore).

Role on the Task prompt is `verifier`. Fresh Task every time; no implementer
or reviewer narrative.

Unpaired roles (planners, SRE, context-steward, scouts) still fill Goal, Bar,
Role, Artifact, and Return. Their Bar is usually coverage of the scoped sources
with evidence.

## Parent duties

- Craft self-contained prompts (children lack parent chat context).
- Summarize children for the operator; never dump full child output.
- Resolve conflicts across children before reporting.

Return contracts: lead with 1–3 sentences, then Evidence / Proposed edits /
Blockers as needed. Parents summarize child output for the operator.

## Typical pipeline

**Unclear scope or expectations:** [`alignment`](../skills/alignment/SKILL.md)
(read-only) until the operator confirms proceed, then hand off to
[`implement-change`](../skills/implement-change/SKILL.md).

**Non-trivial work (scope already clear):**
[`implement-change`](../skills/implement-change/SKILL.md) (alignment gate when
needed → worktree → implementer↔reviewer pair → verifier arbiter). Prefer the
skill over hand-rolling the fan-out.

**Trivial** (single file, obvious edit): skip subagent delegation; parent
edits in the worktree directly (worktree setup still required).

## Anti-patterns

- Editing files in the workspace root checkout instead of a worktree.
- Parent jumps to implementation on a vague ask without alignment.
- Sequential `Read`/`Grep` across many files when an explorer subagent fits.
- Implementer starts without a Bar, acceptance criteria, or file paths from the parent.
- Implementer grades its own work against the Bar (skips the reviewer Task).
- Putting `manifest-verifier` inside the implementer↔reviewer gap loop.
- Reusing the same implementer or reviewer context across gap rounds.
- Parallel implementers on coupled surfaces that share assumptions.
- Skipping the verifier arbiter after the pair returns pass.
- Parent pastes subagent output or tool-call narration into the operator reply.
