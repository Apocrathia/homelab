---
alwaysApply: true
description: Flag ambiguity rather than guessing — use [NEEDS CLARIFICATION] when two reasonable interpretations exist.
---

# Ambiguity goes back to source

When requirements, constraints, or instructions are ambiguous, **do not guess**.
Flag the ambiguity with `[NEEDS CLARIFICATION]` and surface the question to the
user.

This applies to: design inputs, acceptance criteria, gate thresholds, and any
place where two reasonable interpretations exist. If you can resolve the
ambiguity by reading the source (see `ground-before-asking.md`), do that first.
Only surface to the user when the ambiguity is irreducible from available data.
