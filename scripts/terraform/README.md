# `scripts/terraform/`: Terraform workflow helpers

`ci-deps.sh` bootstraps curl, jq, OpenTofu, and Terragrunt in minimal CI
images. `sync-gitlab-ci-variables.sh` pushes `terraform/.env` values to
GitLab CI/CD variables. `tofu-plan-summary.sh` summarizes
`terragrunt run --all plan` output.

> **Navigation**: [← Home](../README.md)
