# GitLab Runner Setup Guide

This guide explains how to set up the GitLab Runner in your Kubernetes cluster.

> **Navigation**: [← Back to GitLab README](../README.md)

## Documentation

- **[GitLab Runner Documentation](https://docs.gitlab.com/runner/)** - Primary documentation source
- **[Kubernetes Executor](https://docs.gitlab.com/runner/executors/kubernetes/)** - Kubernetes executor documentation

## Prerequisites

- Access to your GitLab account with permissions to create runners
- Access to your 1Password account to store the runner tokens
- Flux CD installed in your cluster

## Setup Steps

### 1. Get the Runner Tokens from GitLab

1. In your GitLab project or group, go to **Settings > CI/CD**
2. Expand the **Runners** section
3. For a new runner, note the registration token displayed
4. If you're setting up a group runner, you'll find this under the group's **Settings > CI/CD > Runners**

### 2. Store the Tokens in 1Password

1. In 1Password, navigate to the **Secrets** vault
2. Create a new item called `gitlab-runner-token`
3. Add the following fields:
   - `runner-registration-token`: Paste the registration token value (for registering new runners)
   - `runner-token`: If you have an existing runner token (starts with `glrt-`), add it here

The 1Password Operator will automatically create a Kubernetes secret with these tokens, which will be used by the GitLab Runner.

### 3. Verify the Installation

Once the runner is deployed, you can verify it's working by:

1. In GitLab, go to **Settings > CI/CD > Runners**
2. You should see your runner listed as "online"
3. Check the runner logs in your cluster:
   ```bash
   kubectl logs -n gitlab-runner deployment/gitlab-runner
   ```

## Configuration Details

The GitLab Runner is configured with:

- 2 runner manager pods (`replicas: 2`)
- Each runner can handle up to 10 concurrent jobs (`concurrent: 10`)
- Runners use the Kubernetes executor to spawn job pods
- Job pods run with the Ubuntu 22.04 image by default
- Privileged mode is enabled for Docker-in-Docker operations

## Troubleshooting

If the runner isn't connecting:

1. Verify the tokens are correctly stored in 1Password with the exact key names:
   - `runner-registration-token` (for registering new runners)
   - `runner-token` (for existing runners)
2. Check the runner logs for connection errors:
   ```bash
   kubectl logs -n gitlab-runner -l app=gitlab-runner
   ```
3. Ensure your cluster has outbound access to GitLab
4. Check for mount errors in the pod events:
   ```bash
   kubectl describe pod -n gitlab-runner -l app=gitlab-runner
   ```
