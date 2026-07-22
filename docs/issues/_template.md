---
title: ""
kind: bug # bug | feature | spec | architecture
status: template # replace with open | in-flight | blocked when filing
severity: medium # low | medium | high | blocker
source: agent # agent | human | dogfood | review | architecture-review | alert | flux | ci
found_at: YYYY-MM-DD
# found_by: # optional
# area: # flux | helm | talos | observability | security | apps | networking | storage | agents
# slice: # afk | hitl
# plan: # path to living plan when one exists
# gitlab: # URL when promoted; do not create GitLab issues unless operator asks
# branch: # when in-flight
# closed_by: # MR / commit SHA while file still exists
---

# <title>

## Problem / desired state

<!-- What is wrong, or what should be true when this is done. -->

## Repro

<!-- Bugs: steps / signals. Features and architecture: N/A or omit. -->

## Acceptance

<!-- Observable done criteria. Prefer cluster/repo evidence over vibes. -->

## Feedback loop

<!-- Named verify commands, e.g.:
- kustomize build <path>
- helm template …
- yamllint <files>
- Trivy on changed paths
- Flux MCP read (Kustomization / HelmRelease status) — read-only; mutate needs ask
-->

## Implementation hint

<!-- Light pointer only — not a plan. Link plan: frontmatter when how-work exists. -->

## Notes

<!-- Optional context. No secrets — 1Password Item names only. -->
