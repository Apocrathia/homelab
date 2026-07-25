---
title: Document that Flux always reasserts Git state
kind: bug
status: open
severity: high
source: dogfood
found_at: 2026-07-25
area: agents
slice: hitl
---

# Document that Flux always reasserts Git state

## Problem / desired state

Agent context says local edits do nothing until applied or pushed, but does not
state the stronger operational rule: direct cluster applies are temporary when
they differ from Git. Parent Flux resources can also restore a suspended child,
so repeatedly applying or suspending resources is not a viable way to preserve
uncommitted desired state.

## Repro

1. Change a Flux-managed manifest locally without pushing it.
2. Apply the local render directly and suspend its child Kustomization.
3. Observe a parent Flux reconciliation restore the child and reapply the
   repository version.

## Acceptance

- Agent context explicitly says not to fight Flux: commit and push validated
  desired state before expecting it to persist.
- Context warns that suspending only a child Kustomization may not hold when a
  parent manages that object.
- The documented development loop distinguishes short-lived observation from
  durable GitOps state.

## Feedback loop

- Search `.agents/context/` and `.agents/rules/` for the explicit rule.
- Run the context reconciliation checks after updating protected agent context.

## Implementation hint

Add the warning to `.agents/context/traps.md` and cross-check the GitOps
development loop for consistent wording.
