# GitLab Runner Setup Guide

This guide explains how to set up the GitLab Runner in your Kubernetes cluster.

> **Navigation**: [← Back to Services README](../../README.md)

## Prerequisites

- Access to your GitLab account with permissions to create runners
- Access to your 1Password account to store the runner tokens
- Flux CD installed in your cluster

## Setup Steps

### 1. Get the Runner Authentication Token from GitLab

GitLab removed registration tokens in 16.0; runners authenticate with a
runner authentication token only.

1. In your GitLab project or group, go to **Settings > CI/CD > Runners**
2. Click **New instance runner** (or the project/group equivalent)
3. Give it a name, check the **Run untagged jobs** option if desired, and create it
4. Copy the displayed token — it starts with `glrt-`

### 2. Store the Token in 1Password

1. In 1Password, navigate to the **Secrets** vault
2. Create a new item called `gitlab-runner-token`
3. Add this field:
   - `runner-token`: The `glrt-` runner authentication token

The 1Password Operator materializes the Kubernetes secret (`secret.yaml`);
the chart injects the token into the runner config from its `runner-token` key.

### 3. Verify the Installation

Once the runner is deployed, you can verify it's working by:

1. In GitLab, go to **Settings > CI/CD > Runners**
2. You should see your runner listed as "online"
3. Check the runner logs in your cluster:
   ```bash
   kubectl logs -n gitlab-runner deployment/gitlab-runner
   ```

## Configuration Details

- Runner manager replica count, concurrency, and check interval live in `helmrelease.yaml`
- Runners use the Kubernetes executor to spawn job pods
- Job pods run the Alpine image pinned in `config.toml` (Renovate-managed)
- Build containers run privileged for buildah user namespaces (job containers stay unprivileged) — see `config.toml`
- A Docker Hub image-pull secret (`docker-externalsecret.yaml`) avoids pull rate limits

## Troubleshooting

If the runner isn't connecting:

1. Verify the token is correctly stored in 1Password with the exact key name:
   - `runner-token` (the `glrt-` runner authentication token)
2. Check the runner logs for connection errors:
   ```bash
   kubectl logs -n gitlab-runner -l app=gitlab-runner
   ```
3. Ensure your cluster has outbound access to GitLab
4. Check for mount errors in the pod events:
   ```bash
   kubectl describe pod -n gitlab-runner -l app=gitlab-runner
   ```

## References

- **[GitLab Runner Documentation](https://docs.gitlab.com/runner/)** - Primary documentation source
- **[Kubernetes Executor](https://docs.gitlab.com/runner/executors/kubernetes/)** - Kubernetes executor documentation
