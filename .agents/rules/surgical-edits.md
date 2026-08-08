---
alwaysApply: true
description: Write the minimum code that solves the problem; touch only what the request requires
---

# Surgical edits

Two discipline rules for code changes (simplicity first + touch only what you
must), derived from [Andrej Karpathy's
observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding
pitfalls. Complements [`ponytail.md`](./ponytail.md) — that rule is the YAGNI
ladder and lazy-senior voice; this rule is the edit-scope contract.

Pairs with [`clarify-dont-guess.md`](./clarify-dont-guess.md) (think before
coding) and goal-driven execution in the development loop.

**Tradeoff:** these bias toward caution over speed. For trivial tasks, use
judgment.

## Simplicity first

Minimum code that solves the problem. Nothing speculative.

Before writing anything, climb the
[ponytail ladder](./ponytail.md) (stop at the first rung that holds):

1. Does this need to exist at all? Speculative need = skip it.
2. Already in this codebase? Reuse it — look before you write.
3. Stdlib does it? Use it.
4. Native platform feature covers it? Use that over a dependency.
5. Already-installed dependency solves it? Use it. Never add one for what a few lines can do.
6. Can it be one line? One line.
7. Only then: the minimum code that works.

Then apply these constraints to whatever you write:

- No features beyond what was asked.
- No abstractions for single-use code.
- No flexibility or configurability that wasn't requested.
- No speculative branches for states that can't occur (dead `if`/`else`, unused
  YAML keys, defensive match arms for impossible inputs).
- If you write 200 lines and it could be 50, rewrite your own new code.
- Push back when a simpler approach exists; say so before implementing.

The test: would a senior engineer say this is overcomplicated? If yes,
simplify.

## Surgical changes

Touch only what you must. Clean up only your own mess.

When editing existing code or manifests:

- Don't improve adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it; don't delete it.

When your changes create orphans:

- Remove imports, variables, or functions that your changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the request.

## Scope

**Simplicity first** applies to code you are writing now (introduced in the
current change). **Surgical changes** applies to existing code you are touching.
You may rewrite aggressively within your own new code; touch surgically when
editing code that was already there. "Your own new code" means code introduced
in the current change, not just the current file.

## When this applies

Code, manifests, scripts, and config edits. Not docs; see
[`humanizer.md`](./humanizer.md) and [`voice.md`](../context/voice.md).
