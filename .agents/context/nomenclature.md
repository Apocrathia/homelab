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
