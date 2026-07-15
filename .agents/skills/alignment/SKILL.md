---
name: alignment
description: >-
  Interview the operator about a topic until shared understanding, walking each
  branch of the decision tree one at a time. Use when stress-testing an idea,
  design, or requirement; resolving open questions before acting; or when the
  user says alignment, /alignment, or wants to get aligned.
disable-model-invocation: true
---

# Alignment

Read-only. Do not edit files, apply to the cluster, or implement until alignment
is reached and the operator explicitly asks to proceed.

Interview relentlessly until shared understanding, one decision branch at a
time ([grill-me](https://www.aihero.dev/my-grill-me-skill-has-gone-viral)
pattern). Explore the tree when that answers the question; do not ask the
operator to repeat what the repo already shows.

For each question, use **Context → Ask → Suggestion → Gaps/concerns** (omit Gaps
when none). On Cursor, that is `question-format.mdc`.

## When to run

| Trigger                            | Examples                                                    |
| ---------------------------------- | ----------------------------------------------------------- |
| New app or wide change             | Desired state unclear, multiple valid approaches            |
| Plan needed                        | Rough idea; acceptance not writable yet                     |
| Security / protected-path tradeoff | Anything touching talos, generic-app, bootstrap, `.agents/` |
| Implement gate                     | Manifest work while expectations still open                 |

**Skip** when acceptance is already explicit. Do not re-run in the same thread
if a summary already exists.

## Output

Short summary: decisions made, open items, suggested next step (plan →
`project-planner`, implement → `manifest-implementer`, recover → matching
restore skill, still fuzzy → more alignment).
