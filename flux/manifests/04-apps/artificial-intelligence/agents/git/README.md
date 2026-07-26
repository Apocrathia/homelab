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
- **MR change-summary**: invoked from the GitLab CI job `mr-change-summary` (see [.gitlab/README.md](../../../../../../.gitlab/README.md#mr-change-summary)). The agent reads the MR diff and description, fetches upstream release / PR / issue context for each version delta, and posts a self-updating comment back to the MR using the marker `<!-- mr-change-summary -->`. Protocol lives in `agent.yaml` `systemMessage` under "MR Change-Summary Protocol".

## Secrets

Requires 1Password item `git-agent-secrets` in Secrets vault with:

| Field             | Description     |
| ----------------- | --------------- |
| `litellm-api-key` | LiteLLM API key |

Also syncs `github-mcp-secrets` into this namespace as `github-mcp-client-secrets`.
The git-agent RemoteMCPServer sends that value as the `Authorization` header on
every call to github-mcp (the MCP server itself stores no PAT).

| Field           | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| `authorization` | GitHub PAT **including the `Bearer ` prefix** (e.g. `Bearer ghp_...`) |

Also syncs `gitlab-mcp-secrets` into this namespace as `gitlab-mcp-client-secrets`.
The RemoteMCPServer sends `gitlab-token` as the `Private-Token` header on every
call to gitlab-mcp (REMOTE_AUTHORIZATION; the MCP pod holds no PAT).

| Field          | Description                         |
| -------------- | ----------------------------------- |
| `gitlab-token` | GitLab PAT with `api` / read scopes |

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
