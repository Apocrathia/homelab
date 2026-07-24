---
description: GitOps workflow principles for the homelab
globs: flux/**
alwaysApply: false
---

# GitOps Workflow

- While the project uses Flux for GitOps, **iterative development may require direct cluster testing**. Have the operator apply changes directly for testing when needed; changes will be committed to the repository by the operator.
- This balances development efficiency with GitOps principles.
- **When referencing secrets in Flux manifests, use Flux's `fromValues` function** to reference secret values — never include the actual values.
- **Configurations should be explicitly defined** in config files rather than relying on implicit configuration.
