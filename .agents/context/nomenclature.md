# Nomenclature

Shared vocabulary so agents do not invent parallel terms.

| Term           | Meaning here                                                                  |
| -------------- | ----------------------------------------------------------------------------- |
| Operator       | You, the human who owns the lab and commits                                   |
| GitOps truth   | Files under `flux/` (and related Helm values) that Flux reconciles            |
| generic-app    | Shared Helm chart for typical app deploys                                     |
| Gateway API    | HTTPRoute / Gateway resources, not Ingress                                    |
| 1Password Item | CR that materializes secrets; preferred over hand-written Secret YAML         |
| Bootstrap      | `flux/manifests/01-bootstrap/`: CRDs and foundation                           |
| Apply loop     | Validate and optionally apply to the live cluster before the operator commits |
| Context        | Modules under `.agents/context/` (start at [`README.md`](./README.md))        |
| Persona        | Sub-agent charter under `.agents/agents/<id>/agent.md`                        |
| Skill          | Procedural workflow under `.agents/skills/<id>/SKILL.md`                      |

K8s / Flux object names should match existing manifest naming in the same
namespace. Copy neighbors; do not rebrand.

## Authentik tofu consumers

The provider-opentofu pattern is a per-app file pair in the app dir:

- `crossplane.yaml` — `OnePasswordItem authentik-terraform-token`,
  `ProviderConfig <app>-authentik`, `Workspace <app>-authentik`.
- `authentik.tf` — the root HCL, single source of truth: partial
  `backend "kubernetes" {}` block required (without it tofu falls back to
  the LOCAL backend and plans a duplicate create set), no import blocks
  (state carries the objects), values inline — no varmap.
- The kustomization stitch: `configMapGenerator` named
  `<app>-authentik-module` from `files: [authentik.tf]`, replacements
  (`data.[authentik.tf]`) into `Workspace spec.forProvider.module`
  (`source: Inline`, `module: ""` placeholder).
