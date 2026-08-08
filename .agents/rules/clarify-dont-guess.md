---
alwaysApply: true
description: When a request is ambiguous, ask. Do not silently pick the most likely interpretation. Distinguish advice from action.
---

# Clarify, don't guess

When the operator's request has two or more reasonable interpretations, **do not guess**. Ask per [`.agents/context/questions.md`](../context/questions.md) and `question-format.mdc` (prefer the structured-question tool when it is in the tool list). Prove what you can first ([`ground-before-asking.md`](./ground-before-asking.md)); flag irreducible ambiguity with `[NEEDS CLARIFICATION]` ([`ambiguity-goes-back-to-source.md`](./ambiguity-goes-back-to-source.md)).

## Triggers

- Two valid scopes for the same instruction (e.g. "fix the dashboard" — which one).
- Two valid approaches with different tradeoffs.
- A constraint that conflicts with another constraint.
- A reference to a file, manifest, or service whose identity isn't obvious.
- A success criterion you can't measure without more information.

## Distinguish advice from action

When the operator uses consultative language — "advice", "please advise", "what should I do", "considering", "thinking about" — provide options and recommendations only. **Do not implement or mutate repo state** (no edits, commits, staging, or worktree creation). Read-only investigation is allowed: read files, run diagnostics, reproduce behavior. Wait for an explicit request to implement.

An explicit implement instruction in the same message overrides consultative phrasing (e.g. "please advise, then fix it" → fix it).

## Permission-question discipline

If you ask a permission question — "Want me to…?", "Should I…?", "Do you want me to…?" — **stop and wait for the answer**. Never batch the permission ask with the action itself. A previous "proceed" on a different topic does not carry forward.

## Extended ambiguity

When ambiguity spans several **dependent** decisions (not one clarify question or several independent facts), use [`alignment`](../skills/alignment/SKILL.md) instead of ad-hoc back-and-forth. For several independent gaps, use one structured-question turn (or one prose Ask) covering them. Alignment is read-only until the operator asks to proceed.

## Not ambiguity

Low-stakes details where the choice is unambiguous (one matching file path, one obvious variable name, ordering of unrelated steps) — pick it, mention briefly, proceed. If multiple files match a path reference, ask; do not default.
