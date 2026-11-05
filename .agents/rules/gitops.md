---
description: GitOps workflow principles for the homelab
globs: flux/**
alwaysApply: false
---

# GitOps Workflow

- While the project uses Flux for GitOps, **iterative development may require direct cluster testing**. Have the operator apply changes directly for testing when needed; changes will be committed to the repository by the operator.
- Direct applies are observation only. Flux reasserts Git on reconcile — commit and push before expecting persistence. Suspending a child Kustomization alone may not hold if a parent manages it.
- This balances development efficiency with GitOps principles.
- **When referencing secrets in Flux manifests, use Flux's `fromValues` function** to reference secret values — never include the actual values.
- **Configurations should be explicitly defined** in config files rather than relying on implicit configuration.

## Manifest comments

- **Manifests show current state only.** When removing something, delete the
  lines outright — never leave "removed because <reason>" blocks or
  commented-out resources with notes.
- **No history or rationale comments** ("pinned back to X because <incident>",
  "changed from Y on <date>"). Git history (Conventional Commits body) is the
  record; if a why is not findable there, update `.agents/` context, never the
  manifest.
- **Allowed:** comments documenting live config semantics the reader needs to
  use the value correctly (chart behavior, field meaning, operating
  constraints), and tooling directives (`renovate:` lines). Test: history
  explains how the value got there; semantics explain what it does.
- **Durable object facts only** — never narrate cross-system architecture
  (split-DNS behavior, IdP routing, exposure) in app manifests. That story
  lives once in the owning system's README or plan docs.
