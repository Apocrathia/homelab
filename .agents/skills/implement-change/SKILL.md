---
name: implement-change
description: >-
  Orchestrate one Launch-brief lap: plan if needed, implement↔reviewer pair,
  verifier arbiter, domain review when warranted. Use after find-work selects a
  brief.
disable-model-invocation: true
---

# Implement change

One Launch-brief lap: plan if needed → implementer↔reviewer pair → verifier
arbiter → domain review when warranted. The parent orchestrates only: frame
scope, fan out Tasks, gate on results. Do not paste persona/skill bodies here —
invoke by path and read the target.

Prompt contract (Slice / Goal / Bar / Role / Artifact / Return):
[`.agents/rules/subagents.md`](../../rules/subagents.md).

Loop contract:
[`.agents/context/development-loop.md`](../../context/development-loop.md).
Ship model (hybrid): unauthorized → [`draft-commit`](../draft-commit/SKILL.md);
authorized MR contribute → [`ship-work`](../ship-work/SKILL.md) — see
[Ship model](../../context/development-loop.md#ship-model).

## Preconditions

- A **Launch brief** (from [`find-work`](../find-work/SKILL.md)) or an
  operator-equivalent scope with acceptance + a **named feedback loop**.
- No edits until that scope exists. Fuzzy →
  [`alignment`](../alignment/SKILL.md) first (skip unattended).
- One lap = **one logical MR**. Target ~**1000 absolute** changed lines
  (add+del). Split if larger; name merge order in the plan. If the request
  holds two unrelated outcomes, split and run this skill once each. Do not
  pack a whole plan phase into one MR because the checkbox is one slice.

## Homelab non-negotiables

- Open a worktree before editing
  ([`worktrees.md`](../../rules/worktrees.md)). Isolation does not authorize
  ship.
- Never `git commit` / push directly. Hand off to
  [`draft-commit`](../draft-commit/SKILL.md) — draft by default, ships only
  when the operator authorizes
  ([`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship)).
- Ask before cluster mutate (`kubectl apply` / `delete`, `flux reconcile`,
  mutating MCP).
- Protected paths need confirm before edit (operator request counts;
  summarize first). Without confirmation, leave the finding **blocked**.
- Ponytail / surgical: touch only what the brief requires. No scope creep
  beyond acceptance.
- Stop-loss: 3 identical failures → stop and surface. Also stop the pair /
  verify loops when reviewers are clean, a fix fails repeatedly, stop-loss
  fires, a **Valid** finding is **blocked** on a protected path, or the
  operator stops the run.

## Roles

Homelab persona names (update this table if personas rename):

| Job       | Subagent                                                                                                                                    | Parent does                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Plan      | [`project-planner`](../../agents/project-planner/agent.md)                                                                                  | Spawn when plan missing/stale; read the plan     |
| Implement | [`manifest-implementer`](../../agents/manifest-implementer/agent.md) (or parent for non-manifest)                                           | Spawn per independent unit                       |
| Review    | [`reviewer`](../../agents/reviewer/agent.md)                                                                                                | Spawn after each implementer (pair; gap loop)    |
| Verify    | [`manifest-verifier`](../../agents/manifest-verifier/agent.md)                                                                              | Spawn after every unit's reviewers return `pass` |
| Domain    | [`security-analyst`](../../agents/security-analyst/agent.md), [`documentation-reviewer`](../../agents/documentation-reviewer/agent.md), SRE | Role=`reviewer` splits; after acceptance `pass`  |

Also invoke by path when the surface matches:

| When                 | Invoke                                                                         |
| -------------------- | ------------------------------------------------------------------------------ |
| Scope fuzzy / HITL   | [`alignment`](../alignment/SKILL.md)                                           |
| New / changed Helm   | [`helm-deployment`](../helm-deployment/SKILL.md)                               |
| MCP / kmcp / LiteLLM | [`mcp-deployment`](../mcp-deployment/SKILL.md)                                 |
| Domain restore       | matching restore skill                                                         |
| Incident / Flux      | [`site-reliability-engineer`](../../agents/site-reliability-engineer/agent.md) |

Interactive IDE drafts may still land under `.cursor/plans/`; durable
executable plans for the lap live under `docs/plans/`.

## Workflow

```
- [ ] 0. Open or create a worktree on a dedicated branch (do not edit workspace root)
- [ ] 1. Confirm Launch brief (or operator scope): acceptance + named feedback loop
- [ ] 2. If fuzzy → alignment; stop if unattended and still fuzzy
- [ ] 3. If no executable plan → project-planner → docs/plans/<slug>.md
- [ ] 4. Implement via manifest-implementer / parent (parallel where independent)
- [ ] 5. Review via reviewer (acceptance + domain as needed), then verify via
         manifest-verifier
- [ ] 6. Fold gaps / verifier issues back into implement → review → verify
- [ ] 7. Report review-ready; hand off Wave 4 siblings in order:
         review-loop → reconcile-docs → reconcile-context → draft-commit
- [ ] 8. Stop — do not commit, push, merge, or invent the next lap
```

### 0. Worktree

Before any file edit, open or create a git worktree under `.worktrees/` on the
brief's `Branch:` (or a new `type/slug`). Do not edit the workspace root
checkout. See [`.agents/rules/worktrees.md`](../../rules/worktrees.md). Pass the
worktree **absolute path** to every implement / review / verify Task.

### 4. Implement

One implementer Task per **independent** unit (see
[`subagents.md`](../../rules/subagents.md)). Parallelize units that touch
different files; serialize coupled surfaces. Prefer
[`manifest-implementer`](../../agents/manifest-implementer/agent.md) for
Flux/Helm/Kustomize; parent may implement trivial non-manifest units in the
worktree. Each implementer may smoke-check locally; **pass against the Bar is
the reviewer's job**, not self-grading.

```text
Slice: <short id for this unit>
Role: implementer
Goal: Produce this unit so a reviewer can judge it against the Bar.
Bar: <acceptance / named feedback loop / inspectable conditions from the brief>
Artifact: <files / HelmReleases / namespaces this unit owns>
Worktree: <absolute path>
Feedback loop: <named check from the brief — failing check first when behavior changes>
Constraints: <protected paths, GitOps, from the plan>
Findings: <relevant explore output only — facts, not prior agent narrative>

Return: summary, paths touched, commands run and outcome, open questions,
whether reviewer / security-analyst / documentation-reviewer / SRE should run.
```

A single known file with an obvious edit may skip planner and run in the
parent — protected paths still need confirm.

### 5. Review and verify

After implementers return, run the **acceptance reviewer gap loop**, then any
applicable **domain reviewers**, then the **verifier arbiter**. When step 4
launched parallel implementers in the same worktree, wait for **all** of them
to finish before starting review — and wait for **every** unit's acceptance and
applicable domain reviewers to reach `pass` before verification.

#### Reviewer gap loop

For each implementer unit, spawn a **new**
[`reviewer`](../../agents/reviewer/agent.md) Task (fresh context) with the same
Slice, Bar, and Artifact. Do not pass implementer rationale.

```text
Slice: <same id>
Role: reviewer
Goal: Judge the Artifact against the Bar. Return pass or the single biggest gap.
Bar: <same as implementer>
Artifact: <same as implementer — surfaces this unit owns>
Worktree: <absolute path>

Return: pass | gap: <one miss>; evidence.
```

On `gap`, spawn a **new** implementer (step 4) with only the gap + Bar +
Artifact, then a **new** reviewer. Repeat until `pass` or stop-loss / operator
stop.

#### Domain review

Domain personas fill the same **reviewer** pair slot (see
[`subagents.md`](../../rules/subagents.md)); they are not a post-verify stage.

After the acceptance reviewer returns **pass** for a unit, spawn a **new**
domain reviewer Task when the diff warrants it:

| Surface                                         | Persona                                                   |
| ----------------------------------------------- | --------------------------------------------------------- |
| Auth, secrets, RBAC, network policy, trust edge | `security-analyst`                                        |
| Docs / README standards                         | `documentation-reviewer`                                  |
| Incident / Flux health / capacity               | `site-reliability-engineer` (unpaired unless given a Bar) |

Skip when none apply. Goal is always judge-against-Bar (`pass` | `gap`); do not
inherit implementer narrative. On `gap`, spawn a **new** implementer (step 4)
with only the gap + that reviewer's Bar + Artifact, then a **new** Task for the
**same** domain persona. After any domain-gap recovery that changed the
Artifact, re-run **that unit's** acceptance reviewer gap loop (then applicable
domain reviewers) before verify.

Before any protected-path fix, name the path, summarize the change, wait for
confirm — else leave **blocked** (still a gap against the Bar).

#### Verifier arbiter

After **every** unit's acceptance reviewer returns `pass`, and after every
applicable domain reviewer for those units also returns `pass`, spawn a **new**
[`manifest-verifier`](../../agents/manifest-verifier/agent.md) Task (fresh
context) with the **cumulative** Artifact — union of every unit's touched
paths, including gap-round edits — but **no Slice**, and a distinct Bar: the
brief's named feedback loop / local gates for touched surfaces (not the pair's
acceptance Bar). Do not start the verifier while any sibling unit is still in a
gap round.

Also run the brief's named feedback loop (Prettier/yamllint/`helm template`/
Trivy/etc. as applicable). Prefer verifier evidence over vibes.

```text
Role: verifier
Goal: Independently verify the Artifact against the named feedback loop / local gates.
Bar: <named feedback loop + local checks for touched surfaces>
Artifact: <worktree path + union of all units' touched paths>
Worktree: <absolute path>

Return: pass | issue: <what failed>; commands run and outcome.
```

On `issue`, map the failure to affected unit(s) from the verifier's evidence.
Spawn a **new** implementer (step 4) **per affected unit** with the issue +
that unit's acceptance Bar + Artifact, then re-run **that unit's** reviewer gap
loop (acceptance, then applicable domain). When every recovered unit has
returned `pass`, spawn a **new** verifier with the cumulative Artifact. If no
unit's Artifact overlaps the failing paths, open a **new**
implementer↔reviewer pair scoped to the failing evidence, or stop / escalate —
do not re-enter verification with an empty affected set. Repeat until `pass` or
stop-loss / operator stop.

### Sibling handoffs (Wave 4)

After edits land and verify is green enough to ship-propose:

1. [`review-loop`](../review-loop/SKILL.md) — local gates / fix iters
2. [`reconcile-docs`](../reconcile-docs/SKILL.md) — behavior docs; delete satisfied issues/plans
3. [`reconcile-context`](../reconcile-context/SKILL.md) — agent context / links
4. [`draft-commit`](../draft-commit/SKILL.md) — propose Conventional Commit + optional draft MR; commits/pushes only when the operator authorizes that lap ([`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship))

Those sibling skills may not exist yet in the same session — keep the paths;
do not fabricate their procedures here.

### Report

```markdown
## Implement change

**Goal:** <one sentence>
**Scope:** <paths / namespaces>
**Result:** review-ready | blocked

### Steps

- plan: <done | skipped>
- implement: <units, paths>
- review: <acceptance + domain: pass | gaps folded | n/a>
- verify: <pass | fail + commands>

### Left open

- <blocker or unattributed verifier issue>

### Next

- Run `review-loop` → `reconcile-docs` → `reconcile-context` → `draft-commit`
  (commits only when the operator authorizes).
```

## Out of scope

- Inventing work when no brief / empty queue
- Auto-merge, auto-commit, auto-push
- Editing protected paths unattended
- Cluster mutation without explicit ask
- Replacing local `review-loop` gates with Macroscope/Bugbot/Codex defaults
- Running find-work tightly after an empty-queue stop
