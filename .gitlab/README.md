# GitLab CI/CD Pipeline

This directory contains the GitLab CI/CD configuration files for the homelab project.

## Pipeline Structure

### Main Pipeline File

- **`.gitlab-ci.yml`** - Orchestrates all jobs via includes

### Pipeline Components

| File                           | Stage         | Trigger                     | Purpose                                          |
| ------------------------------ | ------------- | --------------------------- | ------------------------------------------------ |
| `no-op.gitlab-ci.yml`          | test          | MR (fallback)               | Ensures pipeline passes when no other jobs apply |
| `chart-tag.gitlab-ci.yml`      | tag           | `Chart.yaml` changes        | Creates Git tags for Helm chart releases         |
| `kustomize-diff.gitlab-ci.yml` | verify        | MR (manifest changes)       | Posts rendered manifest diffs to MR comments     |
| `scorecard.gitlab-ci.yml`      | verify        | MR (manifest changes)       | Runs OpenSSF Scorecard on changed dependencies   |
| `tofu.gitlab-ci.yml`           | verify/deploy | MR/main (terraform changes) | OpenTofu plan/apply for Proxmox VMs              |

### Disabled Pipelines

| File                     | Purpose            | Status                         |
| ------------------------ | ------------------ | ------------------------------ |
| `renovate.gitlab-ci.yml` | Dependency updates | Commented out in main pipeline |

## Stages

```yaml
stages:
  - test # Validation, no-op fallback
  - verify # Kustomize diff, Scorecard, Tofu plan
  - tag # Chart tagging
  - deploy # Tofu apply (manual)
```

## Pipeline Details

### Kustomize Diff

Runs on MRs that modify `flux/manifests/**/*`. Builds kustomize overlays for both source and target branches, diffs them, and posts results as an MR comment.

**Requirements**:

- `KUSTOMIZE_TOKEN` - Personal access token with API scope for posting comments

### OpenSSF Scorecard

Runs on MRs that modify manifests or `renovate.json`. Extracts GitHub/GitLab repository references from changed files and runs Scorecard security analysis.

**Requirements**:

- `GITHUB_TOKEN` - GitHub token for API access
- `SCORECARD_TOKEN` - Personal access token for posting MR comments

### OpenTofu/Terragrunt

Manages Proxmox VM infrastructure. Runs validation and plan on MRs, manual apply on main branch.

**Jobs**:

- `tofu-validate` - Validates Terragrunt configuration
- `tofu-plan` - Runs plan and posts output to MR
- `tofu-apply` - Manual apply on main branch (uses `resource_group` to prevent concurrent applies)

**Requirements**:

- `TOFU_MR_TOKEN` - Personal access token for posting MR comments
- Proxmox credentials configured in Terragrunt

### Chart Tagging

Creates Git tags when `helm/generic-app/Chart.yaml` version changes. Tag format: `generic-app-X.Y.Z`

**Requirements**:

- `GITLAB_TOKEN` - Token with push access for creating tags

### No-Op

Fallback job that runs when an MR has no other applicable jobs. Prevents empty pipelines.

## GitLab Agent

The `agents/homelab/config.yaml` configures the GitLab Kubernetes Agent for:

- CI/CD access from this project
- Flux integration
- User access to the cluster

## Required CI/CD Variables

| Variable          | Purpose              | Scope          |
| ----------------- | -------------------- | -------------- |
| `KUSTOMIZE_TOKEN` | MR comment access    | kustomize-diff |
| `SCORECARD_TOKEN` | MR comment access    | scorecard      |
| `TOFU_MR_TOKEN`   | MR comment access    | tofu-plan      |
| `GITHUB_TOKEN`    | Scorecard API access | scorecard      |
| `GITLAB_TOKEN`    | Git tag push access  | chart-tag      |

Configure in **Settings > CI/CD > Variables**.

## Troubleshooting

### Pipeline Not Starting

- Verify `.gitlab-ci.yml` syntax: **CI/CD > Editor > Validate**
- Check that file change patterns match the modified files
- Empty stages are skipped automatically

### MR Comments Not Posting

- Verify token has `api` scope
- Check **Settings > CI/CD > Token Access** for job token permissions
- Look for curl errors in job logs

### Tofu Apply Stuck

- Only one apply runs at a time (resource group)
- Check for existing running/pending jobs
- Manual jobs require clicking "Play" in the UI
