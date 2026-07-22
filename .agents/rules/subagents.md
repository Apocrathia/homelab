---
description: Prefer defined personas; parents MUST fan out parallel subagents for multi-domain work
alwaysApply: true
---

# Subagents / personas

When a task clearly matches a persona under [`.agents/agents/`](../agents/),
adopt it (or delegate) instead of freelancing a weaker process.

| Persona                     | Use for                                               |
| --------------------------- | ----------------------------------------------------- |
| `project-planner`           | Scoping, living plans                                 |
| `manifest-implementer`      | Flux/Helm/Kustomize edits                             |
| `manifest-verifier`         | Local validation evidence                             |
| `site-reliability-engineer` | Incidents, Flux health, capacity                      |
| `security-analyst`          | Adversarial / threat review                           |
| `documentation-reviewer`    | Doc standards audit                                   |
| `context-steward`           | Context drift detect; propose-only on protected paths |

## Fan-out mandate

When a task has **2+ independent domains** (different files, skills, or research
areas that do not share write locks), the parent **MUST** launch parallel
subagents (Task tool / harness equivalent) — one agent per domain — rather than
serially exploring alone.

**Fan out when:** multi-file harvest; parallel research; independent
implement/verify; multi-deliverable waves.

**Do not fan out when:** single-file edit; tightly coupled debugging where
shared state matters; exploratory "what is broken?" before domains are known.

## Parent duties

- Craft self-contained prompts (children lack parent chat context).
- Summarize children for the operator; never dump full child output.
- Resolve conflicts across children before reporting.

Return contracts: lead with 1–3 sentences, then Evidence / Proposed edits /
Blockers as needed. Parents summarize child output for the operator.
