# Terraform (OpenTofu + Terragrunt)

Infrastructure as Code for Proxmox VMs using OpenTofu and Terragrunt.

> **Navigation**: [← Home](../README.md) | [Talos Setup →](../talos/README.md)

## Overview

OpenTofu configurations for managing Proxmox virtual machines running the Talos Kubernetes cluster.

| Tool                                                                           | Purpose                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [OpenTofu](https://opentofu.org/)                                              | Infrastructure as Code engine (Linux Foundation fork of Terraform) |
| [Terragrunt](https://terragrunt.gruntwork.io/)                                 | Thin wrapper for DRY configurations and multi-module orchestration |
| [bpg/proxmox](https://registry.terraform.io/providers/bpg/proxmox/latest/docs) | Proxmox provider for OpenTofu                                      |

### Current Scope

| Resource  | Count | Description                                     |
| --------- | ----- | ----------------------------------------------- |
| Talos VMs | 4     | Control plane nodes (talos-01 through talos-04) |

### VM Inventory

| VM       | VMID | Proxmox Node | IP Address  |
| -------- | ---- | ------------ | ----------- |
| talos-01 | 801  | node-01      | 10.100.1.80 |
| talos-02 | 802  | node-02      | 10.100.1.81 |
| talos-03 | 803  | node-03      | 10.100.1.82 |
| talos-04 | 804  | node-04      | 10.100.1.83 |

### Future Scope

- Additional VMs (storage, utility nodes)
- Proxmox cluster configuration
- Network/VLAN configuration
- DNS records

## Architecture

### Why OpenTofu?

HashiCorp switched Terraform to BSL 1.1 in August 2023. OpenTofu is the Linux Foundation's MPL 2.0 fork - truly open source, drop-in compatible, community governed.

### Why Terragrunt?

- **DRY configurations** - define common settings once, inherit everywhere
- **Automatic backend configuration** - no copy-paste of backend blocks
- **Input inheritance** - common VM specs in parent, unique values per-VM

Terragrunt auto-detects OpenTofu when both are installed.

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

This creates unique state files per VM (e.g., `homelab-deployments-proxmox-talos-cluster-talos-01`).

## Directory Structure

```
terraform/
├── README.md
├── root.hcl                            # Root config (backend, provider)
├── modules/
│   └── talos-vm/
│       ├── main.tf                     # VM resource definition
│       ├── variables.tf                # Input variables
│       └── outputs.tf                  # Outputs (VM ID, IPs, etc.)
└── deployments/
    └── proxmox/
        └── talos-cluster/
            ├── common.hcl              # Shared inputs (CPU, RAM, network)
            ├── talos-01/
            │   └── terragrunt.hcl      # VM-specific: hostname, VMID, MAC
            ├── talos-02/
            │   └── terragrunt.hcl
            ├── talos-03/
            │   └── terragrunt.hcl
            └── talos-04/
                └── terragrunt.hcl
```

### Configuration Hierarchy

```
root.hcl
    └── Backend config (GitLab HTTP state with dynamic keys)
    └── Provider config (Proxmox API via env vars)
            │
            ▼
deployments/proxmox/talos-cluster/common.hcl
    └── Shared VM inputs (CPU, RAM, disk size, storage pool)
            │
            ▼
deployments/proxmox/talos-cluster/talos-XX/terragrunt.hcl
    └── Per-VM inputs (hostname, VMID, Proxmox node, MAC address)
    └── terraform { source = "../../../../modules/talos-vm" }
```

Each VM runs on a dedicated Proxmox node, so `proxmox_node` is a per-VM input.

## Prerequisites

### Version Requirements

```bash
tofu version          # >= 1.6.0
terragrunt --version  # >= 0.52.0
```

### Installation (macOS)

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

### GitLab CI/CD Variables

Configure in GitLab (Settings → CI/CD → Variables):

| Variable               | Type     | Protected | Masked |
| ---------------------- | -------- | --------- | ------ |
| `TF_HTTP_ADDRESS`      | Variable | Yes       | No     |
| `TF_HTTP_USERNAME`     | Variable | Yes       | No     |
| `TF_HTTP_PASSWORD`     | Variable | Yes       | Yes    |
| `PROXMOX_VE_ENDPOINT`  | Variable | Yes       | No     |
| `PROXMOX_VE_API_TOKEN` | Variable | Yes       | Yes    |
| `PROXMOX_VE_INSECURE`  | Variable | Yes       | No     |

## Local Development

### Single VM Operations

```bash
cd terraform/deployments/proxmox/talos-cluster/talos-01
terragrunt init
terragrunt plan
terragrunt apply
```

### All Deployments

Use `run --all` from the deployments directory:

```bash
cd terraform/deployments

# Plan all
terragrunt run --all -- plan

# Apply all (MUST use --parallelism 1 for control plane nodes!)
terragrunt run --all --parallelism 1 --non-interactive -- apply -auto-approve
```

> **⚠️ CRITICAL**: Always use `--parallelism 1` when applying to control plane nodes. Parallel applies will reboot all nodes simultaneously, causing cluster outage and potential etcd quorum loss.

### Validate Configuration

```bash
cd terraform
terragrunt hcl fmt --check

cd deployments/proxmox/talos-cluster/talos-01
terragrunt validate
```

## Import Strategy

VMs already exist in Proxmox - import them into state rather than recreate.

### Step 1: Capture Current VM Configuration

```bash
curl -sk \
  -H "Authorization: PVEAPIToken=${PROXMOX_API_TOKEN_ID}=${PROXMOX_API_TOKEN_SECRET}" \
  "${PROXMOX_API_URL}/api2/json/nodes/{node}/qemu/{vmid}/config" | jq
```

### Step 2: Import Existing Resources

Import ID format: `node_name/vm_id` (e.g., `node-01/801`)

```bash
cd deployments/proxmox/talos-cluster/talos-01
terragrunt init -lock=false
terragrunt import -lock=false proxmox_virtual_environment_vm.this node-01/801
```

Batch import all VMs:

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

Expected drift after import (intentional additions):

| Attribute         | Change                           | Notes                    |
| ----------------- | -------------------------------- | ------------------------ |
| `tags`            | Adding `["talos", "kubernetes"]` | Organizational tags      |
| `keyboard_layout` | Adding `en-us`                   | Provider default         |
| `agent.type`      | Adding `virtio`                  | Transport type (default) |
| `cdrom`           | Explicit block                   | Matches existing config  |

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

> **TODO**: Create `.gitlab/tofu.gitlab-ci.yml` and add to `.gitlab-ci.yml` includes.

| Stage    | Job             | Trigger            | Description                         |
| -------- | --------------- | ------------------ | ----------------------------------- |
| validate | `tofu-validate` | All MRs            | Syntax and configuration validation |
| plan     | `tofu-plan`     | All MRs            | Generate and display execution plan |
| apply    | `tofu-apply`    | Manual (main only) | Apply changes to infrastructure     |

Key considerations:

- Use image with OpenTofu + Terragrunt (e.g., `alpine/terragrunt`)
- Cache `.terragrunt-cache` directory
- Store plan output as artifact
- Post plan output as MR comment for reviewer visibility
- Require manual approval for apply on main
- **CRITICAL**: Use `--parallelism 1` for applies to prevent simultaneous control plane reboots

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

### Provider Authentication

Test Proxmox API access:

```bash
curl -sk \
  -H "Authorization: PVEAPIToken=${PROXMOX_API_TOKEN_ID}=${PROXMOX_API_TOKEN_SECRET}" \
  "${PROXMOX_API_URL}/api2/json/version" | jq
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

Match module inputs exactly to the output, paying attention to:

- `cpu` type (e.g., `host`, `x86-64-v2-AES`)
- `scsihw` (SCSI controller type)
- `boot` order
- `memory` and `balloon` settings
- `disk.cache` (often `none` after import)

## References

- [OpenTofu Documentation](https://opentofu.org/docs/)
- [Terragrunt Documentation](https://terragrunt.gruntwork.io/docs/)
- [Terragrunt CLI Redesign Migration](https://terragrunt.gruntwork.io/docs/migrate/cli-redesign/)
- [bpg/proxmox Provider](https://registry.terraform.io/providers/bpg/proxmox/latest/docs)
- [GitLab Terraform State](https://docs.gitlab.com/ee/user/infrastructure/iac/terraform_state.html)
- [Proxmox API Documentation](https://pve.proxmox.com/pve-docs/api-viewer/)
