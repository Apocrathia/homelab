# GitLab CI/CD Pipeline

This directory contains the GitLab CI/CD configuration files for the homelab project.

## Pipeline Structure

### Main Pipeline File

- **`.gitlab-ci.yml`** - Orchestrates all jobs via includes

### Pipeline Components

| File                              | Stage         | Trigger                     | Purpose                                          |
| --------------------------------- | ------------- | --------------------------- | ------------------------------------------------ |
| `no-op.gitlab-ci.yml`             | test          | MR (fallback)               | Ensures pipeline passes when no other jobs apply |
| `chart-tag.gitlab-ci.yml`         | deploy        | `Chart.yaml` changes        | Creates Git tags for Helm chart releases         |
| `kustomize-diff.gitlab-ci.yml`    | verify        | MR (manifest changes)       | Posts rendered manifest diffs to MR comments     |
| `mr-change-summary.gitlab-ci.yml` | verify        | MR (any)                    | Invokes git-agent (A2A) to post a change summary |
| `scorecard.gitlab-ci.yml`         | verify        | MR (manifest changes)       | Runs OpenSSF Scorecard on changed dependencies   |
| `tofu.gitlab-ci.yml`              | verify/deploy | MR/main (terraform changes) | OpenTofu plan/apply for Proxmox VMs              |
| `gitleaks.gitlab-ci.yml`          | test          | MR (all files)              | Secret scanning on MR commits                    |
| `kube-linter.gitlab-ci.yml`       | test          | MR (manifest changes)       | Kubernetes manifest security linting             |
| `trivy.gitlab-ci.yml`             | test          | MR (IaC changes)            | IaC security scanning for Terraform and K8s      |
| `shellcheck.gitlab-ci.yml`        | test          | MR (shell script changes)   | Shell script static analysis                     |
| `semgrep.gitlab-ci.yml`           | test          | MR (code changes)           | SAST for Python, Go, JS, TS                      |

### Disabled Pipelines

| File                     | Purpose            | Status                         |
| ------------------------ | ------------------ | ------------------------------ |
| `renovate.gitlab-ci.yml` | Dependency updates | Commented out in main pipeline |

## Stages

```yaml
stages:
  - test # Validation, security scanning, no-op fallback
  - verify # Kustomize diff, Scorecard, Tofu plan
  - deploy # Chart tagging, Tofu apply (manual)
```

## Pipeline Details

### Kustomize Diff

Runs on MRs that modify `flux/manifests/**/*`. Builds kustomize overlays for both source and target branches, diffs them, and posts results as an MR comment.

**Requirements**:

- `KUSTOMIZE_TOKEN` - Personal access token with API scope for posting comments

### MR Change Summary

Runs on every MR. Builds a prompt from the MR title, description, changed files, and full diff, then invokes the in-cluster `git-agent` (kagent) over A2A. The agent fetches upstream context (release notes, PRs, issues) for each version delta and posts a single self-updating comment to the MR via the gitlab-mcp server.

**Energy gate**: before invoking the agent, the job hashes the diff and changed-files list and compares against the `<!-- hash:... -->` trailer on the existing change-summary comment. If the hash matches, the agent is **not invoked** at all (no energy spent on local inference). Rebases that don't change the actual diff become 0-cost no-ops.

**How it works**:

- `.gitlab/scripts/mr_change_summary_prompt.py` renders the prompt from `CI_*` env vars and the diff (avoids shell-quoting hazards).
- `.gitlab/scripts/mr_change_summary_invoke.py` computes the input hash, checks for an existing comment via the GitLab API (`JOB-TOKEN` read), and either skips the agent entirely or runs the multi-turn A2A SDK loop modelled on `flux/manifests/04-apps/artificial-intelligence/tasks/scheduled-agent-invoke/src/invoke.py`.
- After the agent posts/updates the comment, CI rewrites the body to append a `<!-- hash:abcdef... -->` trailer. The trailer is the cache key for the next run and the verification token for this run.
- Trailer writes use `AGENT_TOKEN` (a project PAT with `api` scope) — GitLab.com rejects `CI_JOB_TOKEN` for MR note PUTs. See "Required CI/CD Variables" below.
- To force a refresh after a prompt-engineering change, manually delete the existing change-summary comment on the affected MR(s); the next pipeline will write a fresh one.

**Requirements**:

- The runner must be able to reach `kagent-controller.kagent.svc.cluster.local:8083` (in-cluster runner — already true for `gitlab-runner` in the `gitlab-runner` namespace).
- `git-agent` must be deployed and have the gitlab-mcp tools `list_mr_notes`, `create_mr_note`, `update_mr_note` whitelisted.
- The gitlab-mcp PAT (`gitlab-mcp-secrets.gitlab-token`) must have `api` scope on the homelab project — used by the agent to post comments.
- `AGENT_TOKEN` must be set as a project CI variable with `api` scope.

**Tunables (job-level CI variables)**:

- `MAX_TURNS` — A2A turn cap (default `12`)
- `HTTP_TIMEOUT_S` — per-request HTTP timeout to kagent (default `600`)
- `DIFF_MAX_BYTES` — diff payload cap fed to the agent (default `120000`)
- `CHANGED_FILES_MAX_LINES` — file-list cap (default `500`)
- `FORCE_RECOMPUTE` — set to `1` in a manual pipeline run to bypass the hash skip and re-invoke the agent

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

- `TOFU_TOKEN` - Personal access token for posting MR comments
- Proxmox credentials configured in Terragrunt

### Chart Tagging

Creates Git tags when `helm/generic-app/Chart.yaml` version changes. Tag format: `generic-app-X.Y.Z`

**Requirements**:

- `GITLAB_TOKEN` - Token with push access for creating tags

### No-Op

Fallback job that runs when an MR has no other applicable jobs. Prevents empty pipelines.

### Security Scanning

Five security scanning jobs run on MRs to catch issues before merge:

| Job           | Tool        | Scope                          | Blocks Merge |
| ------------- | ----------- | ------------------------------ | ------------ |
| `gitleaks`    | Gitleaks    | MR commits (diff only)         | Yes          |
| `kube-linter` | kube-linter | `flux/`, `helm/` manifests     | Yes          |
| `trivy`       | Trivy       | Changed Terraform, Flux, Helm  | Yes          |
| `shellcheck`  | ShellCheck  | `scripts/*.sh` (errors only)   | Yes          |
| `semgrep`     | Semgrep     | `*.py`, `*.go`, `*.js`, `*.ts` | Yes          |

**Configuration files**:

- `.gitleaks.toml` - Gitleaks allowlist for false positives
- `.kube-linter.yaml` - kube-linter check configuration

**Notes**:

- Gitleaks scans only commits in the MR, not full repo history
- Trivy scans only files changed in the MR, fails on CRITICAL/HIGH issues
- ShellCheck only fails on errors (ignores warnings/info/style)
- Semgrep uses auto-detected rulesets based on detected languages

## GitLab Agent

The `agents/homelab/config.yaml` configures the GitLab Kubernetes Agent for:

- CI/CD access from this project
- Flux integration
- User access to the cluster

## Required CI/CD Variables

| Variable          | Purpose                                                                                                                   | Scope             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `KUSTOMIZE_TOKEN` | MR comment access                                                                                                         | kustomize-diff    |
| `SCORECARD_TOKEN` | MR comment access                                                                                                         | scorecard         |
| `TOFU_TOKEN`      | MR comment access                                                                                                         | tofu-plan         |
| `GITHUB_TOKEN`    | Scorecard API access                                                                                                      | scorecard         |
| `GITLAB_TOKEN`    | Git tag push access                                                                                                       | chart-tag         |
| `AGENT_TOKEN`     | Project PAT (`api` scope) for change-summary skip-cache trailer writes — `CI_JOB_TOKEN` cannot PUT MR notes on GitLab.com | mr-change-summary |

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
