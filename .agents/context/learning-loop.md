# Learning loop

How agents learn from outcomes and failures. Three tiers: patterns → rules →
structural enforcement. Accumulate and prune.

The [`retrospective`](../skills/retrospective/SKILL.md) skill is the
operational trigger — outcome review, git history for external changes,
classification, and routing (local context, rule/skill/enforcement proposals, or
upstream contributions to prime-context).

## Outcome review (required)

When closing a piece of work, do a short outcome review: what actually happened,
one or two lessons, or an explicit "no lessons; no pattern."

## Git history review (required after external changes)

Changes land on `main` without this agent's involvement — human commits, other
agents' MRs, hotfixes. Mine git / GitLab history for significant changes to
context surfaces (`AGENTS.md`, `.agents/`, `docs/`). For each: what / why /
whether context still matches. See
[`retrospective`](../skills/retrospective/SKILL.md).

## Pattern extraction

1. **Classify** — maps to existing type, or propose a new type (human approves).
2. **Process vs domain** — transferable process vs lab-specific (Flux, Talos, …).
3. **Criterion** — success **and** (2+ similar past successes, or human judgment).
4. **Action** — propose; after approval, write
   [`.agents/memories/<topic>.md`](../memories/README.md).

## Anti-pattern extraction

One process failure is enough. Propose a classified anti-pattern; after approval,
add to memories.

## Upstream contributions

Generic improvements (shared rules/skills/scripts that apply beyond this lab)
are upstream candidates:

1. File an issue on prime-context (default).
2. Open a PR on prime-context when small and well-defined.
3. Record a local memory even if upstream is deferred.

Pull side: [`integrate-upstream`](../skills/integrate-upstream/SKILL.md).
Only Layer 1/2 content goes upstream; Layer 3 stays local.

## Promotion path

```text
Memory (lesson) → recurs 3+ times → Rule (.md) → fails repeatedly → Hook (structural)
```

See [`enforcement.md`](./enforcement.md).

## Pruning

Delete a memory when it is structurally enforced. The enforcement IS the
documentation.
