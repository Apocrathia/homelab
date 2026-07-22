---
description: Prefer defined personas for plan / implement / verify / SRE / security / docs work
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

Return contracts: lead with 1–3 sentences, then Evidence / Proposed edits /
Blockers as needed. Parents summarize child output for the operator.
