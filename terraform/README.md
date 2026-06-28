# Terraform (OpenTofu + Terragrunt)

Infrastructure as Code for Proxmox VMs using OpenTofu and Terragrunt.

> **Navigation**: [← Home](../README.md) | [Talos Setup →](../talos/README.md)

## Overview

OpenTofu configurations for Proxmox virtual machines: the Talos Kubernetes cluster and other cluster workloads.

| Tool                                                                           | Purpose                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [OpenTofu](https://opentofu.org/)                                              | Infrastructure as Code engine (Linux Foundation fork of Terraform) |
| [Terragrunt](https://terragrunt.gruntwork.io/)                                 | Thin wrapper for DRY configurations and multi-module orchestration |
| [bpg/proxmox](https://registry.terraform.io/providers/bpg/proxmox/latest/docs) | Proxmox provider for OpenTofu                                      |

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

Per-VM CPU, memory, disk, and network settings live in each deployment's `terragrunt.hcl`.

### Future Scope

- Proxmox cluster configuration
- Network/VLAN configuration
- DNS records

## Architecture

### Why OpenTofu?

HashiCorp switched Terraform to BSL 1.1 in August 2023. OpenTofu is the Linux Foundation's MPL 2.0 fork with full Terraform compatibility.

### Why Terragrunt?

Terragrunt wraps OpenTofu to reduce duplication. Backend configuration is automatic — no copy-paste of backend blocks across deployments.

Terragrunt auto-detects OpenTofu when both are installed.

### Modules

| Module       | Use case                                                           |
| ------------ | ------------------------------------------------------------------ |
| `talos-vm`   | Talos Kubernetes nodes; node placement is intentional and enforced |
| `proxmox-vm` | General cluster VMs; optional Proxmox HA; ignores placement drift  |

The `proxmox-vm` module can attach a `proxmox_haresource` when `ha.enabled = true` (Home uses HA group `Primary`).

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

State keys follow the deployment path (e.g. `homelab-deployments-proxmox-talos-cluster-talos-01`, `homelab-deployments-proxmox-home`).

## Directory Structure

```
terraform/
├── README.md
├── root.hcl                            # Root config (backend, provider)
├── modules/
│   ├── talos-vm/                       # Pinned Talos nodes
│   └── proxmox-vm/                     # Cluster-portable VMs (+ optional HA)
└── deployments/
    └── proxmox/
        ├── home/
        │   └── terragrunt.hcl
        ├── game/
        │   └── terragrunt.hcl
        └── talos-cluster/
            ├── common.hcl              # Shared Talos inputs
            ├── talos-01/
            │   └── terragrunt.hcl
            ├── talos-02/
            │   └── terragrunt.hcl
            ├── talos-03/
            │   └── terragrunt.hcl
            └── talos-04/
                └── terragrunt.hcl
```

### Configuration Hierarchy

**Talos** (shared defaults via `common.hcl`):

```
root.hcl
    └── deployments/proxmox/talos-cluster/common.hcl
            └── talos-XX/terragrunt.hcl  → modules/talos-vm
```

**Home / Game** (self-contained `terragrunt.hcl` per VM):

```
root.hcl
    └── deployments/proxmox/{home,game}/terragrunt.hcl  → modules/proxmox-vm
```

## Prerequisites

### Version Requirements

```bash
tofu version          # >= 1.6.0
terragrunt --version  # >= 0.52.0
```

### Installation

```bash
brew install opentofu terragrunt
```

### Proxmox API Token

Create an API token in Proxmox (Datacenter → Permissions → API Tokens → Add).

**Option A**: Uncheck "Privilege Separation" to inherit user permissions.

**Option B**: Keep privilege separation and add explicit permissions:

| Path       | Role               |
| ---------- | ------------------ |
| `/vms`     | `PVEVMAdmin`       |
| `/storage` | `PVEDatastoreUser` |

## Environment Variables

### Local Development

Create a `.env` file in the `terraform/` directory (gitignored):

```bash
# Proxmox API (for curl commands)
export PROXMOX_API_URL=https://pve.example.com:8006
export PROXMOX_API_TOKEN_ID=serviceaccount@pam!terraform
export PROXMOX_API_TOKEN_SECRET=your-secret-here

# Proxmox Provider (bpg/proxmox reads these directly)
export PROXMOX_VE_ENDPOINT=${PROXMOX_API_URL}
export PROXMOX_VE_API_TOKEN=${PROXMOX_API_TOKEN_ID}=${PROXMOX_API_TOKEN_SECRET}
export PROXMOX_VE_INSECURE=true

# GitLab HTTP State Backend
export TF_HTTP_USERNAME=your-gitlab-username
export TF_HTTP_PASSWORD=glpat-your-token-here
export TF_HTTP_ADDRESS=https://gitlab.com/api/v4/projects/PROJECT_ID/terraform/state/homelab
```

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

The script upserts these keys with **Protected** and scope `*`. Values that meet GitLab standard masking rules are masked; Proxmox API tokens use **masked raw** (`!` is not allowed in standard masks). Tokens are **hidden** on first create when standard masking applies. `TOFU_MR_TOKEN` in `.env` maps to `TOFU_TOKEN` in GitLab. `TOFU_DRIFT_WEBHOOK_URL` is synced when present in `.env` (Discord webhook for scheduled drift alerts).

| Variable                 | Type     | Protected | Masked |
| ------------------------ | -------- | --------- | ------ |
| `TF_HTTP_ADDRESS`        | Variable | Yes       | Yes    |
| `TF_HTTP_USERNAME`       | Variable | Yes       | Yes    |
| `TF_HTTP_PASSWORD`       | Variable | Yes       | Yes    |
| `PROXMOX_VE_ENDPOINT`    | Variable | Yes       | Yes    |
| `PROXMOX_VE_API_TOKEN`   | Variable | Yes       | Yes    |
| `PROXMOX_VE_INSECURE`    | Variable | Yes       | No     |
| `TOFU_TOKEN`             | Variable | Yes       | Yes    |
| `TOFU_DRIFT_WEBHOOK_URL` | Variable | Yes       | Yes    |

Manual setup: GitLab → Settings → CI/CD → Variables.

## Local Development

### Single VM Operations

```bash
cd terraform/deployments/proxmox/talos-cluster/talos-01
terragrunt init
terragrunt plan
terragrunt apply
```

Home and Game follow the same pattern under `deployments/proxmox/home` and `deployments/proxmox/game`.

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

VMs already exist in Proxmox — import them into state rather than recreate.

### Step 1: Capture Current VM Configuration

```bash
curl -sk \
  -H "Authorization: PVEAPIToken=${PROXMOX_API_TOKEN_ID}=${PROXMOX_API_TOKEN_SECRET}" \
  "${PROXMOX_API_URL%/}/api2/json/nodes/{node}/qemu/{vmid}/config" | jq
```

Use the node where the VM is running at import time. For cluster-portable VMs, that is bootstrap metadata only; Terraform ignores placement drift afterward.

### Step 2: Import Existing Resources

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

### Step 3: Verify Plan

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

### Step 4: Commit Lock Files

```bash
git add deployments/**/.terraform.lock.hcl
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

| Stage  | Job             | Trigger              | Description                                  |
| ------ | --------------- | -------------------- | -------------------------------------------- |
| verify | `tofu-validate` | MRs (terraform/\*\*) | Syntax and configuration validation          |
| verify | `tofu-plan`     | MRs (terraform/\*\*) | Plan posted as MR comment                    |
| deploy | `tofu-drift`    | Schedule (daily)     | Drift detection; notifies only, non-blocking |
| deploy | `tofu-apply`    | Manual (main only)   | Apply with `--parallelism 1`                 |

### Required CI/CD Variables

| Variable               | Description                     |
| ---------------------- | ------------------------------- |
| `TF_HTTP_ADDRESS`      | GitLab state base URL           |
| `TF_HTTP_USERNAME`     | GitLab username                 |
| `TF_HTTP_PASSWORD`     | GitLab access token (api scope) |
| `PROXMOX_VE_ENDPOINT`  | Proxmox API URL                 |
| `PROXMOX_VE_API_TOKEN` | Full Proxmox API token          |
| `PROXMOX_VE_INSECURE`  | `true` for self-signed certs    |
| `TOFU_MR_TOKEN`        | Token for posting MR comments   |

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

Test Proxmox API access:

```bash
curl -sk \
  -H "Authorization: PVEAPIToken=${PROXMOX_API_TOKEN_ID}=${PROXMOX_API_TOKEN_SECRET}" \
  "${PROXMOX_API_URL%/}/api2/json/version" | jq
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
- [GitLab Terraform State](https://docs.gitlab.com/ee/user/infrastructure/iac/terraform_state.html)
- [Proxmox API Documentation](https://pve.proxmox.com/pve-docs/api-viewer/)
