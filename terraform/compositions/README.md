# Compositions

Broader collections of resources that wire several interconnected
[`modules/`](../modules/) into one coherent unit. A composition is a Terraform
**root module**: deployments point Terragrunt at it instead of at a leaf
module.

**This folder is intentionally empty.** A composition gets created when a real
use case needs multiple modules working together — never to pad a
single-module stack. Single-module stacks point straight at `modules/` (e.g.
`deployments/cloudflare/dns` → `modules/cloudflare-dns`).

## When to use which folder

| Folder          | What it is                                            | Example                                     |
| --------------- | ----------------------------------------------------- | ------------------------------------------- |
| `modules/`      | Single-purpose building block (leaf module)           | `cloudflare-dns`, `tailscale-tailnet`       |
| `compositions/` | Root module wiring 2+ interconnected modules          | _(none yet — see candidates below)_         |
| `deployments/`  | Terragrunt stack: state key, provider include, inputs | `deployments/cloudflare/dns/terragrunt.hcl` |

Reach for a composition when resources must reference each other across
modules, or when one concept spans several providers/modules. Otherwise keep
the deployment pointed at the leaf module.

## Conventions (for when the first one lands)

- **No provider blocks inside compositions.** Providers are generated into the
  deployment by the matching [`providers/*.hcl`](../providers/) include.
  Ephemeral credentials stay in that layer, never in composition code.
- Compositions declare `variables.tf` / `outputs.tf` like modules; the
  deployment's `inputs = {}` feeds them.
- One composition per concern, named for the concern (`gcp-account`, not
  `main` or `stack-1`).
- Terragrunt `source` needs the `//` copy-root syntax (e.g.
  `../../..//compositions/<name>`) so relative `../../modules/` references
  survive the terragrunt cache copy.
- Keep each composition README current with **what it manages today** and
  **what's next**.

## Candidates for the first composition

Roughly in the order they'd become real (each earns its place when the work
is actually wanted):

- **`gcp-account`** — org/billing lookup plus a budget tripwire, and later
  folders/projects/IAM. Becomes a composition when the second resource
  (e.g. `google_billing_budget` fed by the billing account id, or a
  `google_project` attached to the org) is wanted for real.
- **`cluster-app`** — hypothetical: DNS record + Tailscale ACL entry +
  whatever else a cross-provider app rollout keeps needing together. Only if
  that pattern actually repeats.
