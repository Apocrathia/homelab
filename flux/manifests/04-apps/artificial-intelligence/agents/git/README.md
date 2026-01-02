# Git Agent

Git platform agent for GitHub and GitLab repository management.

## Tools

- **github-mcp**: GitHub API integration
- **gitlab-mcp**: GitLab API integration

## Capabilities

- Repository and code search
- Issue and pull/merge request management
- CI/CD pipeline status
- Branch and commit operations
- Release management

## Secrets

Requires 1Password item `git-agent-secrets` in Secrets vault with:

| Field             | Description     |
| ----------------- | --------------- |
| `litellm-api-key` | LiteLLM API key |
