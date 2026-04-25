# `.cursor/agents/` — Persona definitions

Agent personas for tasks that benefit from a focused charter (system prompt, scope, success criteria, guardrails). When a task fits a defined persona, adopt it.

## When to define a persona

- The task recurs and benefits from a consistent approach across sessions.
- The task needs a narrower scope or stricter guardrails than the default agent behavior.
- Multiple agents/operators should converge on the same approach when doing this work.

If a persona is only useful once, write a one-shot prompt instead.

## File convention

Each persona is a single markdown file:

```
.cursor/agents/<persona-name>.md
```

Recommended sections:

- **Purpose** — one-sentence charter.
- **When to adopt** — triggers, file patterns, task types.
- **Scope** — what's in, what's out.
- **Process** — how the persona operates step by step.
- **Guardrails** — what the persona must never do.

## Current personas

| Persona                     | Purpose                                                                                                                                   | Triggers                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `project-planner.md`        | Front-door planner: takes a rough idea, clarifies requirements interactively, and produces a living plan doc in `.cursor/plans/<slug>.md` | New work that needs scoping; vague ideas; multi-step changes that touch the cluster |
| `security-analyst.md`       | Senior security analyst for adversarial review of the cluster, manifests, supply chain, and CI/CD                                         | Security audits, threat modeling, scan-driven investigations, attack-path analysis  |
| `documentation-reviewer.md` | Documentation quality reviewer auditing READMEs and docs against `docs/documentation-standards.md` and the template                       | Periodic doc audits, before/after large changes, when standards drift is suspected  |
