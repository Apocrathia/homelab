# Renovate config (consumer contract)

The repo-root `renovate.json` is the per-repo source of truth. This is the
reusable half of the module — the same contract applies to any `Apocrathia/*`
repo under the operator. Reference config:
[`renovate.json`](../../../../../../renovate.json); standing rule:
[`.agents/rules/renovate.md`](../../../../../../.agents/rules/renovate.md).

## Anatomy

- `extends` — presets, applied in order: built-in (`config:recommended`,
  `:dependencyDashboard`, `security:*`, `docker:pinDigests`) or shareable
  (repo-hosted JSON/JSON5/JSONC).
- `packageRules` — match (datasource/package/update-type/dep-type) → action
  (group, pin, `versioning` override, automerge, disable).
- `customManagers` — regex managers for things Renovate doesn't natively parse
  (helm release fields, image refs, plain version fields, crossplane packages).

## The regex comment contract

A manager only sees a field when the comment above it matches a `matchStrings`
pattern exactly. Shape:

```
# renovate: datasource=<ds> [registryUrl=<url>] [depName=<name>] [packageName=<name>] [versioning=<scheme>]
<field>: <value>
```

`datasource` is required; the rest optional. What the value may hold
(`tag`, `tag@sha256:…`, bare `latest`) is fixed per manager by its
`currentValueTemplate` / `autoReplaceStringTemplate`. If a pin stops updating,
the comment/field pairing has drifted from `matchStrings` — fix the comment,
don't hand-edit the field.

## Dashboard + automerge

- `dependencyDashboard: true` → one "Dependencies Dashboard 🤖" issue with
  checkboxes; it also enables the approval workflow for updates.
- Automerge is **off** today: the minor/patch `packageRule` pins
  `automerge: false`. Top-level `platformAutomerge: true` is set but inert —
  it only changes _how_ an enabled automerge merges, not whether it merges.
