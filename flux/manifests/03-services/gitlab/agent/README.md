# GitLab Agent for Kubernetes Setup Guide

This guide explains how to set up the GitLab Agent for Kubernetes (KAS) in your cluster.

## Prerequisites

- Access to your GitLab account with permissions to create agents
- Access to your 1Password account to store the agent token
- Flux CD installed in your cluster

## Setup Steps

### 1. Create the Agent in GitLab

1. In your GitLab project, go to **Infrastructure > Kubernetes clusters**
2. Click on **Connect a Kubernetes cluster**
3. Select **Connect using the GitLab agent**
4. Enter a name for your agent (e.g., `homelab`)
5. Click **Create agent**
6. Copy the generated token - you'll need this for the next step

### 2. Store the Token in 1Password

1. In 1Password, navigate to the **Secrets** vault
2. Create a new item called `gitlab-agent-token`
3. Add a field with the label `token` and paste the token value
4. Save the item

The 1Password Operator will automatically create a Kubernetes secret with this token, which will be used by the GitLab agent.

### 3. Configure the Agent in GitLab

Create a file in your GitLab repository at `.gitlab/agents/homelab/config.yaml` with the following content:

```yaml
ci_access:
  projects:
    - id: your-project-path/your-project-name
```

Commit and push this file to your repository.

### 4. Verify the Installation

Once the agent is deployed, you can verify it's working by:

1. In GitLab, go to **Infrastructure > Kubernetes clusters**
2. You should see your agent listed with a "Connected" status
3. Check the agent logs in your cluster:
   ```bash
   kubectl logs -n gitlab-agent deployment/gitlab-agent
   ```

## Troubleshooting

If the agent isn't connecting:

1. Verify the token is correctly stored in 1Password
2. Check the agent logs for connection errors
3. Ensure your cluster has outbound access to GitLab's KAS service (wss://kas.gitlab.com)
4. Verify the agent configuration in your GitLab repository
