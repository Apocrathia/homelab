# Terraform (OpenTofu + Terragrunt)

Infrastructure as Code for Proxmox VMs, Cloudflare DNS, Okta, GitLab, and
Tailscale using OpenTofu and Terragrunt.

> **Navigation**: [← Home](../README.md) | [Talos Setup →](../talos/README.md)

## Overview

OpenTofu configurations for Proxmox virtual machines (Talos Kubernetes cluster
and other cluster workloads), Cloudflare DNS zones, Okta org settings, a
GitLab project scaffold, and the Tailscale tailnet policy.

| Tool                                                                                   | Purpose                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [OpenTofu](https://opentofu.org/)                                                      | Infrastructure as Code engine (Linux Foundation fork of Terraform) |
| [Terragrunt](https://terragrunt.gruntwork.io/)                                         | Thin wrapper for DRY configurations and multi-module orchestration |
| [bpg/proxmox](https://registry.terraform.io/providers/bpg/proxmox/latest/docs)         | Proxmox provider for OpenTofu                                      |
| [cloudflare/cloudflare](https://registry.terraform.io/providers/cloudflare/cloudflare) | Cloudflare provider for OpenTofu                                   |
| [okta/okta](https://registry.terraform.io/providers/okta/okta)                         | Okta provider for OpenTofu                                         |
| [gitlabhq/gitlab](https://registry.terraform.io/providers/gitlabhq/gitlab)             | GitLab provider for OpenTofu                                       |
| [tailscale/tailscale](https://registry.terraform.io/providers/tailscale/tailscale)     | Tailscale provider for OpenTofu                                    |
| [1Password/onepassword](https://registry.terraform.io/providers/1Password/onepassword) | Read vault items (ephemeral) for provider credentials              |

### Managed VMs

| Deployment | VMID | Module       | Placement                                        |
| ---------- | ---- | ------------ | ------------------------------------------------ |
| talos-01   | 801  | `talos-vm`   | Pinned to `node-01`                              |
| talos-02   | 802  | `talos-vm`   | Pinned to `node-02`                              |
| talos-03   | 803  | `talos-vm`   | Pinned to `node-03`                              |
| talos-04   | 804  | `talos-vm`   | Pinned to `node-04`                              |
| home       | 100  | `proxmox-vm` | Cluster-portable (`initial_node` at import only) |
| game       | 103  | `proxmox-vm` | Cluster-portable (`initial_node` at import only) |

Talos nodes are pinned one VM per physical host. Home and Game use the `proxmox-vm` module, which ignores `node_name` drift so Proxmox HA and live migration can move them without Terraform fighting placement.

Per-VM CPU, memory, disk, and network settings live in each deployment's `terragrunt.hcl`. Auth is **1Password Connect** → ephemeral item `proxmox-terraform-secrets` (API Credential **credential** field; value format `user@pam!tokenname=secret`). Endpoint and `insecure` live in `providers/proxmox.hcl`. Do not export `PROXMOX_VE_API_TOKEN`.

### Managed DNS

| Deployment       | Module           | Notes                                                        |
| ---------------- | ---------------- | ------------------------------------------------------------ |
| `cloudflare/dns` | `cloudflare-dns` | Zone + public RRsets in HCL; handmade records stay unmanaged |

Public DNS records (Okta custom domain, etc.) live in the deployment
`terragrunt.hcl`. Auth is **1Password Connect** → ephemeral item
`cloudflare-terraform-secrets` (API Credential **credential** field) — same
pattern as GitLab. Do not export `CLOUDFLARE_API_TOKEN`. Do not manage
cert-manager `_acme-challenge` records for other names here — the cluster owns
those. Okta's own `_acme-challenge.okta` challenge is an exception
(vendor-owned verification).

### Managed Okta

| Deployment | Module     | Notes                                               |
| ---------- | ---------- | --------------------------------------------------- |
| `okta/org` | `okta-org` | OIDC apps + Everyone assignment; org settings later |

Org name and base URL live in `providers/okta.hcl`. Auth is **1Password
Connect** → ephemeral item `okta-terraform-secrets` (API Credential
**credential** field) — same pattern as GitLab / Cloudflare. Do not export
`OKTA_API_TOKEN`.

### Managed GitLab

| Deployment       | Module           | Notes                                                                  |
| ---------------- | ---------------- | ---------------------------------------------------------------------- |
| `gitlab/homelab` | `gitlab-project` | Pattern spike: 1Password ephemeral → GitLab token; project label later |

Auth for this stack: **1Password Connect** (no `op` CLI). Set
`OP_CONNECT_HOST` (CI default:
`http://onepassword-connect.onepassword-system.svc:8080` — in-cluster
Service; runners are on the cluster) and `OP_CONNECT_TOKEN`. Vault is looked
up by **name** (`Secrets` — no UUID in git). Put the GitLab PAT in a 1Password
API Credential item **credential** field and set
`onepassword_gitlab_pat_item_title` in the deployment `terragrunt.hcl`. Do not
export `GITLAB_TOKEN`. See
[`docs/plans/tofu-1password-provider.md`](../docs/plans/tofu-1password-provider.md).

```bash
# From a pod/runner on the cluster (same as CI). Local: port-forward first.
export OP_CONNECT_HOST=http://onepassword-connect.onepassword-system.svc:8080
export OP_CONNECT_TOKEN=…
export TF_HTTP_ADDRESS=… TF_HTTP_USERNAME=… TF_HTTP_PASSWORD=…
cd terraform/deployments/gitlab/homelab && terragrunt plan
```

### Managed Tailscale

| Deployment         | Module             | Notes                                     |
| ------------------ | ------------------ | ----------------------------------------- |
| `tailscale/policy` | `tailscale-policy` | Tailnet policy; import before first apply |

Set `tailscale_tailnet` in the deployment to the intended tailnet ID or name.
The checked-in review placeholder fails provider variable validation so a plan
cannot silently target another tailnet.

Auth uses 1Password Connect and the `tailscale-terraform-secrets` API
Credential item. Its **username** field is the OAuth client ID and its
**credential** field is the OAuth client secret. Do not export
`TAILSCALE_OAUTH_CLIENT_ID` or `TAILSCALE_OAUTH_CLIENT_SECRET`.

The policy resource refuses to replace an existing policy during creation and
does not reset the tailnet policy when destroyed. `policy.hujson` is the full
desired policy file, not a patch. Before the first apply:

1. Set and review `tailscale_tailnet`.
2. Import the live policy into state.
3. Replace `policy.hujson` with the live HuJSON from the admin console (or
   `terragrunt state show` / API export).
4. Edit that file in place (default-deny grants, `tagOwners`, shared HTTPS
   rules). Do not apply the checked-in starter until it matches live intent.
5. `terragrunt plan` must show only the intentional grant/tagOwners delta.

```bash
cd terraform/deployments/tailscale/policy
terragrunt init
terragrunt import tailscale_acl.this acl
# Replace policy.hujson with the live policy, then edit.
terragrunt plan
```

Machine sharing is a beta Tailscale feature and is not managed by this stack.
Share and revoke individual untagged machines manually from the Tailscale admin
console. Operator-managed Kubernetes proxies are tagged and cannot be shared.
The policy permits shared users to reach HTTPS port 443 only; Tailscale machine
sharing limits `dst = ["*"]` to machines explicitly shared with each recipient.
Do not add recipient email addresses to the policy.

### Future Scope

- Proxmox cluster configuration
- Network/VLAN configuration
- Import remaining handmade Cloudflare records
- Additional Cloudflare zones as needed
- Okta authenticator / policy / app resources
- Broader GitLab project settings after the label spike
- Wire Proxmox / Okta through the same 1Password ephemeral pattern

## Architecture

### Why OpenTofu?

HashiCorp switched Terraform to BSL 1.1 in August 2023. OpenTofu is the Linux Foundation's MPL 2.0 fork with full Terraform compatibility.

### Why Terragrunt?

Terragrunt wraps OpenTofu to reduce duplication. Backend configuration is automatic — no copy-paste of backend blocks across deployments.

Terragrunt auto-detects OpenTofu when both are installed.

### Modules

| Module             | Use case                                                           |
| ------------------ | ------------------------------------------------------------------ |
| `talos-vm`         | Talos Kubernetes nodes; node placement is intentional and enforced |
| `proxmox-vm`       | General cluster VMs; optional Proxmox HA; ignores placement drift  |
| `cloudflare-dns`   | Zone lookup + `for_each` DNS records (explicit map only)           |
| `okta-org`         | Okta org settings (scaffold; resources added over time)            |
| `gitlab-project`   | Existing GitLab project lookup + optional ownership label          |
| `tailscale-policy` | Complete tailnet policy with safe create/destroy behavior          |

The `proxmox-vm` module can attach a `proxmox_haresource` when `ha.enabled = true` (Home uses HA group `Primary`).

### Providers

`root.hcl` configures remote state only. Each stack includes the provider it needs:

| Include                    | Used by                     |
| -------------------------- | --------------------------- |
| `providers/proxmox.hcl`    | `deployments/proxmox/**`    |
| `providers/cloudflare.hcl` | `deployments/cloudflare/**` |
| `providers/okta.hcl`       | `deployments/okta/**`       |
| `providers/gitlab.hcl`     | `deployments/gitlab/**`     |
| `providers/tailscale.hcl`  | `deployments/tailscale/**`  |

### State Backend

GitLab-managed Terraform state via HTTP backend. Each deployment gets a unique state key based on its path.

The `root.hcl` configures the backend with dynamic state keys:

```hcl
locals {
  base_address = get_env("TF_HTTP_ADDRESS", "")
  state_key    = replace(path_relative_to_include(), "/", "-")
  address      = "${local.base_address}-${local.state_key}"
}

remote_state {
  backend = "http"
  config = {
    address        = local.address
    lock_address   = "${local.address}/lock"
    unlock_address = "${local.address}/lock"
    username       = get_env("TF_HTTP_USERNAME", "")
    password       = get_env("TF_HTTP_PASSWORD", "")
    lock_method    = "POST"
    unlock_method  = "DELETE"
  }
}
```

State keys follow the deployment path (e.g. `homelab-deployments-proxmox-talos-cluster-talos-01`, `homelab-deployments-cloudflare-dns`, `homelab-deployments-okta-org`).

## Directory Structure

```
terraform/
├── README.md
├── root.hcl                            # Remote state only
├── providers/
│   ├── proxmox.hcl                     # bpg/proxmox provider generate
│   ├── cloudflare.hcl                  # cloudflare + onepassword (ephemeral token)
│   ├── okta.hcl                        # okta/okta provider generate
│   ├── gitlab.hcl                      # gitlab + onepassword (ephemeral PAT)
│   └── tailscale.hcl                   # tailscale + onepassword (ephemeral OAuth)
├── modules/
│   ├── talos-vm/                       # Pinned Talos nodes
│   ├── proxmox-vm/                     # Cluster-portable VMs (+ optional HA)
│   ├── cloudflare-dns/                 # Zone + explicit DNS records
│   ├── okta-org/                       # Okta org settings (scaffold)
│   ├── gitlab-project/                 # Project data + optional label
│   └── tailscale-policy/               # Tailnet policy
└── deployments/
    ├── proxmox/
    │   ├── home/
    │   │   └── terragrunt.hcl
    │   ├── game/
    │   │   └── terragrunt.hcl
    │   └── talos-cluster/
    │       ├── common.hcl              # Shared Talos inputs
    │       ├── talos-01/
    │       │   └── terragrunt.hcl
    │       ├── talos-02/
    │       │   └── terragrunt.hcl
    │       ├── talos-03/
    │       │   └── terragrunt.hcl
    │       └── talos-04/
    │           └── terragrunt.hcl
    ├── cloudflare/
    │   └── dns/
    │       └── terragrunt.hcl
    ├── okta/
    │   └── org/
    │       └── terragrunt.hcl
    ├── gitlab/
    │   └── homelab/
    │       └── terragrunt.hcl
    └── tailscale/
        └── policy/
            ├── policy.hujson
            └── terragrunt.hcl
```

### Configuration Hierarchy

**Talos** (shared defaults via `common.hcl`):

```
root.hcl + providers/proxmox.hcl
    └── deployments/proxmox/talos-cluster/common.hcl
            └── talos-XX/terragrunt.hcl  → modules/talos-vm
```

**Home / Game** (self-contained `terragrunt.hcl` per VM):

```
root.hcl + providers/proxmox.hcl
    └── deployments/proxmox/{home,game}/terragrunt.hcl  → modules/proxmox-vm
```

**Cloudflare DNS**:

```
root.hcl + providers/cloudflare.hcl
    └── deployments/cloudflare/<zone>/terragrunt.hcl  → modules/cloudflare-dns
```

**Okta org**:

```
root.hcl + providers/okta.hcl
    └── deployments/okta/org/terragrunt.hcl  → modules/okta-org
```

**GitLab project**:

```
root.hcl + providers/gitlab.hcl
    └── deployments/gitlab/homelab/terragrunt.hcl  → modules/gitlab-project
```

**Tailscale policy**:

```
root.hcl + providers/tailscale.hcl
    └── deployments/tailscale/policy/terragrunt.hcl  → modules/tailscale-policy
```

## Prerequisites

### Version Requirements

```bash
tofu version          # >= 1.11.0 (ephemeral resources; gitlab stack)
terragrunt --version  # >= 0.52.0
```

### Installation

```bash
brew install opentofu terragrunt
```

### Proxmox API Token

Create an API token in Proxmox (Datacenter → Permissions → API Tokens → Add).
Store the full token (`user@pam!tokenname=secret`) in the
`proxmox-terraform-secrets` API Credential **credential** field (vault
`Secrets`) — not in git or GitLab CI.

**Option A**: Uncheck "Privilege Separation" to inherit user permissions.

**Option B**: Keep privilege separation and add explicit permissions:

| Path       | Role               |
| ---------- | ------------------ |
| `/vms`     | `PVEVMAdmin`       |
| `/storage` | `PVEDatastoreUser` |

### Cloudflare API Token

Create a scoped API token (My Profile → API Tokens → Create Token):

| Permission                        | Access |
| --------------------------------- | ------ |
| Zone → DNS                        | Edit   |
| Zone → Zone                       | Read   |
| Account → Cloudflare Zones (opt.) | Read   |

Restrict the token to the target zone. Prefer a dedicated token for Terraform
(separate from the cert-manager DNS-01 token in the cluster). Store the token
in 1Password — not in git. Public DNS RRsets belong in the deployment HCL.

### Okta API Token

Create an API token in Okta (Security → API → Tokens). Store it in the
`okta-terraform-secrets` API Credential **credential** field (vault
`Secrets`) — not in git or GitLab CI. Org name and base URL live in
`providers/okta.hcl` (same identity already present in the Cloudflare CNAME
for the custom domain).

### Tailscale OAuth Client

Create a dedicated OAuth client with the minimum scopes needed to manage the
tailnet policy. Store it in the `tailscale-terraform-secrets` API Credential
item in vault `Secrets`: client ID in **username**, client secret in
**credential**. The tailnet ID or name is non-secret and belongs in the
deployment HCL after operator review.

## Environment Variables

### Local Development

Create a `.env` file in the `terraform/` directory (gitignored), filled from
1Password:

```bash
# Proxmox API (optional curl helpers only — provider uses Connect)
export PROXMOX_API_URL=https://node-01.services.apocrathia.com:8006

# All provider stacks: Connect only (no PROXMOX_VE_* / CLOUDFLARE / OKTA / GITLAB / TAILSCALE credentials).
# export OP_CONNECT_HOST=… OP_CONNECT_TOKEN=…

# GitLab HTTP State Backend
export TF_HTTP_USERNAME=your-gitlab-username
export TF_HTTP_PASSWORD=glpat-your-token-here
export TF_HTTP_ADDRESS=https://gitlab.com/api/v4/projects/PROJECT_ID/terraform/state/homelab
```

Template: [`terraform/.env.example`](./.env.example).

Source before running terragrunt:

```bash
source terraform/.env
```

When using `curl`, strip a trailing slash from `PROXMOX_API_URL` or use `${PROXMOX_API_URL%/}/api2/...`.

### GitLab CI/CD Variables

Sync from `terraform/.env` (values piped to glab; not echoed):

```bash
./scripts/terraform/sync-gitlab-ci-variables.sh --dry-run   # preview
./scripts/terraform/sync-gitlab-ci-variables.sh -y          # write
```

The script upserts these keys with **Protected** and scope `*`. Values that meet GitLab standard masking rules are masked; tokens are **hidden** on first create when standard masking applies. `TOFU_MR_TOKEN` in `.env` maps to `TOFU_TOKEN` in GitLab. `TOFU_DRIFT_WEBHOOK_URL` is synced when present in `.env` (Discord webhook for scheduled drift alerts). Provider tokens (`PROXMOX_VE_*`, `CLOUDFLARE_API_TOKEN`, `OKTA_API_TOKEN`, GitLab PAT) are **not** synced — those stacks use Connect ephemeral.

| Variable                 | Type     | Protected | Masked |
| ------------------------ | -------- | --------- | ------ |
| `TF_HTTP_ADDRESS`        | Variable | Yes       | Yes    |
| `TF_HTTP_USERNAME`       | Variable | Yes       | Yes    |
| `TF_HTTP_PASSWORD`       | Variable | Yes       | Yes    |
| `TOFU_TOKEN`             | Variable | Yes       | Yes    |
| `TOFU_DRIFT_WEBHOOK_URL` | Variable | Yes       | Yes    |
| `OP_CONNECT_TOKEN`       | Variable | Yes       | Yes    |

Manual setup: GitLab → Settings → CI/CD → Variables.

## Local Development

### Single VM Operations

```bash
# Connect auth (same as other stacks). Local: port-forward Connect first.
export OP_CONNECT_HOST=http://onepassword-connect.onepassword-system.svc:8080
export OP_CONNECT_TOKEN=…
export TF_HTTP_ADDRESS=… TF_HTTP_USERNAME=… TF_HTTP_PASSWORD=…
cd terraform/deployments/proxmox/talos-cluster/talos-01
terragrunt plan
```

Do not export `PROXMOX_VE_API_TOKEN`. Home and Game follow the same pattern under `deployments/proxmox/home` and `deployments/proxmox/game`.

### Cloudflare DNS

```bash
# Connect auth (same as GitLab stack). Local: port-forward Connect first.
export OP_CONNECT_HOST=http://onepassword-connect.onepassword-system.svc:8080
export OP_CONNECT_TOKEN=…
export TF_HTTP_ADDRESS=… TF_HTTP_USERNAME=… TF_HTTP_PASSWORD=…
cd terraform/deployments/cloudflare/dns
terragrunt plan
```

Edit public records in that deployment's `terragrunt.hcl`. Do not export
`CLOUDFLARE_API_TOKEN`.

### Okta org

```bash
# Connect auth (same as GitLab / Cloudflare). Local: port-forward Connect first.
export OP_CONNECT_HOST=http://onepassword-connect.onepassword-system.svc:8080
export OP_CONNECT_TOKEN=…
export TF_HTTP_ADDRESS=… TF_HTTP_USERNAME=… TF_HTTP_PASSWORD=…
cd terraform/deployments/okta/org
terragrunt plan
```

Do not export `OKTA_API_TOKEN`.

### Tailscale policy

```bash
# Connect auth. Local: port-forward Connect first.
export OP_CONNECT_HOST=http://onepassword-connect.onepassword-system.svc:8080
export OP_CONNECT_TOKEN=…
export TF_HTTP_ADDRESS=… TF_HTTP_USERNAME=… TF_HTTP_PASSWORD=…
cd terraform/deployments/tailscale/policy
terragrunt plan
```

Set and review `tailscale_tailnet`, then import the current policy before the
first apply. Do not export Tailscale OAuth credentials.

### All Deployments

Use `run --all` from the deployments directory:

```bash
cd terraform/deployments

# Plan all
terragrunt run --all -- plan

# Apply all (MUST use --parallelism 1 when Talos nodes are included!)
terragrunt run --all --parallelism 1 --non-interactive -- apply -auto-approve
```

> **⚠️ CRITICAL**: Always use `--parallelism 1` when applying Talos control plane nodes. Parallel applies will reboot all nodes simultaneously, causing cluster outage and potential etcd quorum loss. Home and Game can be applied individually without that constraint.

### Validate Configuration

```bash
cd terraform
terragrunt hcl fmt --check

cd deployments
terragrunt run --all -- validate
```

## Import Strategy

### Proxmox VMs

VMs already exist in Proxmox — import them into state rather than recreate.

#### Step 1: Capture Current VM Configuration

```bash
TOKEN=$(op read 'op://Secrets/proxmox-terraform-secrets/credential')
curl -sk \
  -H "Authorization: PVEAPIToken=${TOKEN}" \
  "https://node-01.services.apocrathia.com:8006/api2/json/nodes/{node}/qemu/{vmid}/config" | jq
```

Use the node where the VM is running at import time. For cluster-portable VMs, that is bootstrap metadata only; Terraform ignores placement drift afterward.

#### Step 2: Import Existing Resources

VM import ID format: `{node}/{vmid}` (e.g. `node-01/801`).

**Talos example:**

```bash
cd deployments/proxmox/talos-cluster/talos-01
terragrunt init -lock=false
terragrunt import -lock=false proxmox_virtual_environment_vm.this node-01/801
```

**Home** (VM + HA resource):

```bash
cd deployments/proxmox/home
terragrunt init -lock=false
terragrunt import -lock=false proxmox_virtual_environment_vm.this node-02/100
terragrunt import -lock=false 'proxmox_haresource.this[0]' vm:100
```

**Game:**

```bash
cd deployments/proxmox/game
terragrunt init -lock=false
terragrunt import -lock=false proxmox_virtual_environment_vm.this node-03/103
```

Batch import Talos VMs:

```bash
for i in 1 2 3 4; do
  vm="talos-0${i}"
  node="node-0${i}"
  vmid="80${i}"
  echo "=== ${vm} ==="
  cd "/path/to/terraform/deployments/proxmox/talos-cluster/${vm}"
  terragrunt init -lock=false
  terragrunt import -lock=false proxmox_virtual_environment_vm.this "${node}/${vmid}"
done
```

#### Step 3: Verify Plan

```bash
terragrunt plan
```

Tune the deployment's `terragrunt.hcl` until the plan shows no unintended changes. Common acceptable drift after import:

| Attribute          | Change                        | Notes                                    |
| ------------------ | ----------------------------- | ---------------------------------------- |
| `tags`             | Adding organizational tags    | Talos only; proxmox-vm ignores tag drift |
| `keyboard_layout`  | Adding `en-us`                | Provider default                         |
| `agent.type`       | Adding `virtio`               | Transport type (default)                 |
| `cdrom`            | Explicit block                | Matches existing config                  |
| `description`      | Removing installer HTML notes | Home (community-scripts template)        |
| `haresource.group` | Assigning HA group            | Home if group was unset in API           |

Apply minor normalization changes when the plan is understood and low risk.

#### Step 4: Commit Lock Files

```bash
git add deployments/**/.terraform.lock.hcl
```

### Cloudflare DNS records

Handmade records stay out of state until you add them to `dns_records` in the
deployment `terragrunt.hcl` and import:

```bash
cd terraform/deployments/cloudflare/dns
# Import ID format for cloudflare_dns_record: <zone_id>/<record_id>
terragrunt import 'cloudflare_dns_record.this["okta-cname"]' ZONE_ID/RECORD_ID
```

## Pre-commit Hooks

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/gruntwork-io/pre-commit
    rev: v0.1.23
    hooks:
      - id: tflint
  - repo: https://github.com/tofuutils/pre-commit-opentofu
    rev: v2.1.0
    hooks:
      - id: tofu_fmt
      - id: tofu_validate
```

> **Note**: Terragrunt CLI was redesigned in v0.52+. Use `terragrunt hcl fmt` for HCL formatting.

Run manually:

```bash
pre-commit run --all-files
```

## CI/CD Pipeline

Pipeline defined in `.gitlab/tofu.gitlab-ci.yml`.

| Stage  | Job             | Trigger              | Description                                   |
| ------ | --------------- | -------------------- | --------------------------------------------- |
| verify | `tofu-validate` | MRs (terraform/\*\*) | Syntax and configuration validation           |
| verify | `tofu-plan`     | MRs (terraform/\*\*) | Summary + per-unit plan details as MR comment |
| deploy | `tofu-drift`    | Schedule (daily)     | Drift detection; notifies only, non-blocking  |
| deploy | `tofu-apply`    | Manual (main only)   | Apply with `--parallelism 1`                  |

### Required CI/CD Variables

| Variable           | Description                          |
| ------------------ | ------------------------------------ |
| `TF_HTTP_ADDRESS`  | GitLab state base URL                |
| `TF_HTTP_USERNAME` | GitLab username                      |
| `TF_HTTP_PASSWORD` | GitLab access token (api scope)      |
| `OP_CONNECT_TOKEN` | 1Password Connect token (vault read) |
| `TOFU_TOKEN`       | Token for posting MR comments        |

## Troubleshooting

### State Lock Issues

For initial setup, use `-lock=false`:

```bash
terragrunt init -lock=false
terragrunt import -lock=false proxmox_virtual_environment_vm.this node-01/801
```

To force unlock:

```bash
terragrunt force-unlock LOCK_ID
```

### Import Failures

```bash
terragrunt state list
terragrunt state rm proxmox_virtual_environment_vm.this
```

For Home, also remove the HA resource if re-importing:

```bash
terragrunt state rm 'proxmox_haresource.this[0]'
```

### Provider Authentication

Test Proxmox API access (pull token from 1Password, not `.env`):

```bash
TOKEN=$(op read 'op://Secrets/proxmox-terraform-secrets/credential')
curl -sk \
  -H "Authorization: PVEAPIToken=${TOKEN}" \
  "https://node-01.services.apocrathia.com:8006/api2/json/version" | jq
```

Test Cloudflare token (lists zones; pull from 1Password, not `.env`):

```bash
TOKEN=$(op read 'op://Secrets/cloudflare-terraform-secrets/credential')
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones?name=apocrathia.com" | jq
```

Test Okta API token (pull from 1Password, not `.env`):

```bash
TOKEN=$(op read 'op://Secrets/okta-terraform-secrets/credential')
curl -s -H "Authorization: SSWS ${TOKEN}" \
  "https://integrator-5477892.okta.com/api/v1/users/me" | jq
```

### Terragrunt Cache Issues

```bash
find terraform -name ".terragrunt-cache" -type d -exec rm -rf {} +
terragrunt init
```

### Drift After Import

If plan shows unexpected changes, capture the actual VM config:

```bash
qm config 801  # On the Proxmox node
```

Match module inputs in the deployment's `terragrunt.hcl` to the output, paying attention to:

- `cpu` type (e.g. `host`, `x86-64-v2-AES`)
- `scsihw` (SCSI controller type)
- `boot` order
- `memory` and `balloon` settings
- `disk.cache` (often `none` after import)
- `bios` / `efidisk` for UEFI VMs (Home)

## References

- [OpenTofu Documentation](https://opentofu.org/docs/)
- [Terragrunt Documentation](https://terragrunt.gruntwork.io/docs/)
- [Terragrunt CLI Redesign Migration](https://terragrunt.gruntwork.io/docs/migrate/cli-redesign/)
- [bpg/proxmox Provider](https://registry.terraform.io/providers/bpg/proxmox/latest/docs)
- [bpg/proxmox Multi-Node Guide](https://registry.terraform.io/providers/bpg/proxmox/latest/docs/guides/multi-node)
- [Cloudflare Provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)
- [Okta Provider](https://registry.terraform.io/providers/okta/okta/latest/docs)
- [Tailscale Provider](https://registry.terraform.io/providers/tailscale/tailscale/latest/docs)
- [Tailscale machine sharing](https://tailscale.com/kb/1084/sharing)
- [GitLab Terraform State](https://docs.gitlab.com/ee/user/infrastructure/iac/terraform_state.html)
- [Proxmox API Documentation](https://pve.proxmox.com/pve-docs/api-viewer/)
