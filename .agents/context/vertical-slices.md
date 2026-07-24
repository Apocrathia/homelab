# Vertical slices

How to slice work so each piece delivers end-to-end behavior, not a horizontal
layer. Applies to plans, MRs, and Launch briefs from
[`find-work`](../skills/find-work/SKILL.md).

## The principle

A vertical slice goes through every layer needed for an observable outcome.
A horizontal slice finishes one layer for the whole feature before the next.

**Vertical:** "user can create an issue and see it in the list" (API + storage +
UI + check).
**Horizontal:** "set up the database schema" (one layer only).

In this lab, a slice is often: one Flux app change + local render/lint + Trivy
on changed paths + docs/issue close — not "rewrite all Helm values."

## Why vertical

- Each slice is independently shippable and testable.
- Integration risk shows up early.
- Agent laps stay small (one Launch brief → one PR-sized change when shipping).

## In plans

Each unchecked checkbox should be one vertical slice. If a step only touches one
layer ("write the models," "write the API"), split until each step has an
observable feedback loop.

## In MRs / attended main pushes

One slice per ship unit. A change that touches five related files end-to-end
beats a fifty-file single-layer dump.

## In find-work

Scout laps **find** work; they do not own remediation end-to-end. Ranked Launch
briefs are agent-sized vertical slices (docs, review, authoring, plan,
implement, research, reconcile). Broad findings (e.g. whole-repo Trivy) default
to [`file-issue`](../skills/file-issue/SKILL.md); implement only when already
one slice with a named feedback loop.

See [`development-loop.md`](./development-loop.md).
