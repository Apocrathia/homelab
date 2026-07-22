---
name: implement-change
description: >-
  Orchestrate one Launch-brief lap: plan if needed, implement, verify,
  security when warranted. Use after find-work selects a brief.
disable-model-invocation: true
---

# Implement change

One Launch-brief lap: plan if needed → implement → verify → security when
warranted. Orchestrate existing personas/skills; do not paste their bodies
here.

Loop contract:
[`.agents/context/development-loop.md`](../../context/development-loop.md).

## Preconditions

- A **Launch brief** (from [`find-work`](../find-work/SKILL.md)) or an
  operator-equivalent scope with acceptance + a **named feedback loop**.
- No edits until that scope exists. Fuzzy →
  [`alignment`](../alignment/SKILL.md) first (skip unattended).
- One lap = **one logical MR**. Target ~**1000 absolute** changed lines
  (add+del). Split if larger.

## Homelab non-negotiables

- Never `git commit` / push — hand off to ship path; operator commits.
- Ask before cluster mutate (`kubectl apply` / `delete`, `flux reconcile`,
  mutating MCP).
- Protected paths need confirm before edit (operator request counts;
  summarize first).
- Ponytail / surgical: touch only what the brief requires.
- Stop-loss: 3 identical failures → stop and surface.

## Orchestration map

Invoke by path; read the target, do not invent parallel procedures.

| When                        | Invoke                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------- |
| Scope fuzzy / HITL          | [`alignment`](../alignment/SKILL.md)                                                    |
| Plan missing or stale       | [`project-planner`](../../agents/project-planner/agent.md) → **`docs/plans/`** (D1 SoT) |
| Manifest / Flux / Kustomize | [`manifest-implementer`](../../agents/manifest-implementer/agent.md)                    |
| Local verify evidence       | [`manifest-verifier`](../../agents/manifest-verifier/agent.md)                          |
| Security-sensitive change   | [`security-analyst`](../../agents/security-analyst/agent.md)                            |
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
- [ ] 4. Implement via domain skill/persona (manifest-implementer, helm-, mcp-, …)
- [ ] 5. Verify via named feedback loop + manifest-verifier when manifests moved
- [ ] 6. If security-sensitive → security-analyst (or Trivy on changed paths)
- [ ] 7. Hand off Wave 4 siblings in order (link even if skill body lands in parallel):
         review-loop → reconcile-docs → reconcile-context → draft-commit
- [ ] 8. Stop — do not commit, push, merge, or invent the next lap
```

### Sibling handoffs (Wave 4)

After edits land and verify is green enough to ship-propose:

1. [`review-loop`](../review-loop/SKILL.md) — local gates / fix iters
2. [`reconcile-docs`](../reconcile-docs/SKILL.md) — behavior docs; delete satisfied issues/plans
3. [`reconcile-context`](../reconcile-context/SKILL.md) — agent context / links
4. [`draft-commit`](../draft-commit/SKILL.md) — propose Conventional Commit + optional draft MR (stage only if the operator asked); **never** commit/push

Those sibling skills may not exist yet in the same session — keep the paths;
do not fabricate their procedures here.

## Out of scope

- Inventing work when no brief / empty queue
- Auto-merge, auto-commit, auto-push
- Editing protected paths unattended
- Cluster mutation without explicit ask
- Running find-work tightly after an empty-queue stop
