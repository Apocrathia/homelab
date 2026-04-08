# Git Agent

Git platform agent for GitHub and GitLab repository management.

> **Navigation**: [← Back to Agents README](../README.md)

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

## Troubleshooting

```bash
# Check agent status
kubectl get agents git-agent --namespace agent-git

# View agent logs
kubectl logs --namespace agent-git -l app.kubernetes.io/name=git-agent -f
```

## References

- **[GitHub MCP Server](../../../mcp-servers/github/README.md)** - GitHub integration
- **[GitLab MCP Server](../../../mcp-servers/gitlab/README.md)** - GitLab integration
