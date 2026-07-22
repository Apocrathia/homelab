---
title: Short human title
kind: assessment # assessment | experiment
status: draft # draft | running | complete
found_at: YYYY-MM-DD
area: flux # flux | helm | observability | security | storage | networking | other
---

# <Title>

> Research note (Month YYYY). <One sentence: what was surveyed or tested>.
> Follow-ups are proposals until they land as issues/plans or in the tree.

## Sources

| Source | URL / path | Role |
| ------ | ---------- | ---- |
| …      | …          | …    |

## Hypothesis and setup

<!-- For kind: experiment — paste contract fields + baseline metric + budgets.
     For kind: assessment — state the question surveyed. -->

- Hypothesis:
- In-scope paths:
- Eval command: (shell **or** Grafana MCP)
- Metric (name / direction / baseline):
- Grafana (if runtime): datasource / query / range / extract
- Budgets:
- Raw data: `experiments/<slug>/` (experiment only)

## Experiment summary

<!-- Experiment only. Assessment: delete this section. -->

| ID  | Description | Metric | Δ baseline | Status |
| --- | ----------- | ------ | ---------- | ------ |
| 0   | baseline    | …      | —          | keep   |

## What already aligns

<!-- Assessment: validate existing choices. Experiment: optional. -->

## Key findings

What worked, failed, or surprised.

## Conclusion

`proven` | `disproven` | `exhausted` | `inconclusive` — with evidence.

## Recommendations

Actionable follow-ups → [`file-issue`](../../.agents/skills/file-issue/SKILL.md)
candidates (separate lap). Link issue paths when filed.

## What not to do

Explicit anti-recommendations.
