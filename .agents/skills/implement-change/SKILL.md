---
name: implement-change
description: >-
  Orchestrate one Launch-brief lap: plan if needed, implement, verify,
  security when warranted. Use after find-work selects a brief.
disable-model-invocation: true
---

# Implement change

One Launch-brief lap: plan if needed → implement → verify → security when
warranted. The parent orchestrates only: frame scope, fan out Tasks, gate on
results. Do not paste persona/skill bodies here — invoke by path and read the
target.

Loop contract:
[`.agents/context/development-loop.md`](../../context/development-loop.md).
Ship model (locked): draft-commit, not upstream `ship-work` — see
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
- Stop-loss: 3 identical failures → stop and surface. Also stop folding when
  reviews are clean, every remaining finding is **Wrong**, any **Unsure**
  remains, a fix fails, or a **Valid** finding is **blocked** on a protected
  path.

## Orchestration map

Invoke by path; read the target, do not invent parallel procedures. Launch
independent Tasks in one parent message; serialize only on real dependencies.

| When                        | Invoke                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------- |
| Scope fuzzy / HITL          | [`alignment`](../alignment/SKILL.md)                                                    |
| Plan missing or stale       | [`project-planner`](../../agents/project-planner/agent.md) → **`docs/plans/`** (D1 SoT) |
| Manifest / Flux / Kustomize | [`manifest-implementer`](../../agents/manifest-implementer/agent.md)                    |
| Local verify evidence       | [`manifest-verifier`](../../agents/manifest-verifier/agent.md)                          |
| Security-sensitive change   | [`security-analyst`](../../agents/security-analyst/agent.md)                            |
| Incident / Flux health      | [`site-reliability-engineer`](../../agents/site-reliability-engineer/agent.md)          |
| New / changed Helm app      | [`helm-deployment`](../helm-deployment/SKILL.md)                                        |
| MCP / ToolHive / LiteLLM    | [`mcp-deployment`](../mcp-deployment/SKILL.md)                                          |
| Domain restore              | matching restore skill                                                                  |

Interactive IDE drafts may still land under `.cursor/plans/`; durable
executable plans for the lap live under `docs/plans/`.

## Workflow

```
- [ ] 1. Confirm Launch brief (or operator scope): acceptance + named feedback loop
- [ ] 2. If fuzzy → alignment; stop if unattended and still fuzzy
- [ ] 3. If no executable plan → project-planner → docs/plans/<slug>.md
- [ ] 4. Implement via domain skill/persona (parallel where independent)
- [ ] 5. Verify via named feedback loop + manifest-verifier when manifests moved
- [ ] 6. Domain review: security-analyst / SRE / Trivy when the surface warrants
- [ ] 7. Fold valid findings back into implement + verify; triage Unsure/blocked
- [ ] 8. Report review-ready; hand off Wave 4 siblings in order:
         review-loop → reconcile-docs → reconcile-context → draft-commit
- [ ] 9. Stop — do not commit, push, merge, or invent the next lap
```

### 4. Implement

One Task per independent unit. Parallelize units that touch different files;
serialize overlaps. Prompt shape:

```text
Implement one vertical slice of this change.

Goal: <one sentence — end-to-end behavior>
Acceptance: <testable conditions; name the feedback loop / verify step>
Paths: <files / HelmReleases / namespaces>
Constraints: <protected paths, GitOps, from the plan>
Findings: <relevant explore output>

Return: summary, paths touched, commands run and outcome, open questions,
whether security-analyst or SRE should run.
```

A single known file with an obvious edit may skip planner and run in the
parent — protected paths still need confirm.

### 5. Verify

After implementers return, run the brief's named feedback loop. Spawn
[`manifest-verifier`](../../agents/manifest-verifier/agent.md) when Flux/Helm
manifests moved. On failure, loop back to step 4 with the failure (stop-loss
applies).

### 6–7. Domain review and fold

Spawn security-analyst (or Trivy on changed paths) when the diff touches auth,
secrets, RBAC, network policy, or trust boundaries. Spawn SRE when the lap is
incident / Flux-health / capacity. Skip when neither surface is touched.

Triage each finding: **Valid**, **Wrong**, or **Unsure**. For Valid: fix via
the matching implementer/skill, then re-verify. Before any protected-path fix,
name the path, summarize the change, wait for confirm — else leave **blocked**
(still Valid). Treat Unsure, failed fixes, and blocked items as blocked in the
report.

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
- verify: <pass | fail + commands>
- review: <security / SRE: clean | findings | n/a>

### Left open

- <unsure finding or blocker>

### Next

- Run `review-loop` → `reconcile-docs` → `reconcile-context` → `draft-commit`
  (commits only when the operator authorizes).
```

## Out of scope

- Inventing work when no brief / empty queue
- Auto-merge, auto-commit, auto-push
- Editing protected paths unattended
- Cluster mutation without explicit ask
- Worktrees, `ship-work`, or upstream Rust/cargo pipelines
- Running find-work tightly after an empty-queue stop
