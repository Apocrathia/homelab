---
alwaysApply: false
description: MCP tools usage; when to prefer MCP over CLI, tool selection, performance considerations
---

# MCP Tools Usage

- **Use MCP tools wherever applicable before relying on CLI commands.**
- Use MCP tools when they add value for the task.
- Do not force their usage.
- Choose the right tool for the task rather than using all available tools.
- Combine tools where it helps.
- Use local MCP tools over external model features when possible (performance,
  cost).
- **Use DeepWiki to get more in-depth information about a GitHub repository.**
- **Prefer Flux MCP** (`reconcile_flux_helmrelease`,
  `reconcile_flux_kustomization`, `reconcile_flux_source`, suspend/resume)
  for Flux reconciliation. MCP HelmRelease reconcile already force-reconciles
  (`forceAt`); do not use `flux reconcile … --force` or `kubectl annotate`
  unless MCP fails or cannot express the action.
- **Use Kubernetes-native methods for retrieving resource lists** rather than custom scripts or workarounds.
