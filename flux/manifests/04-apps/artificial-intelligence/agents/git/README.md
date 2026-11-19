# Git Agent

> **Navigation**: [← Back to Agents README](../README.md)

## Overview

Git platform agent for GitHub and GitLab repository management.

## Configuration

The agent is defined by the `Agent` CR in `agent.yaml`; model wiring in
`modelconfig.yaml`; MCP tools via `remotemcpserver.yaml`.

## Tools

- **github-mcp**: GitHub API integration
- **gitlab-mcp**: GitLab API integration

## Capabilities

- Repository and code search
- Issue and pull/merge request management
- CI/CD pipeline status
- Branch and commit operations
- Release management
- **MR change-summary**: posts the self-updating `<!-- mr-change-summary -->` comment on MRs (see [.gitlab/README.md](../../../../../../.gitlab/README.md#mr-change-summary)). The GitLab CI job `mr-change-summary` invokes the dedicated `mr-summary-agent` below; `git-agent` keeps the skill for ad-hoc runs. Protocols live in the respective `systemMessage` ("MR Change Summary" section).

## mr-summary-agent

Dedicated CI-only agent for MR change summaries (same namespace, separate
`Agent`/`ModelConfig`: `summary-agent.yaml` + `summary-modelconfig.yaml`).

- **Purpose**: the GitLab CI job `mr-change-summary` invokes this agent directly
  over A2A (kagent controller) with a pre-filtered diff — version-pin hunks,
  changed-files list, numstat list — and it upserts the
  `<!-- mr-change-summary -->` comment.
- **Model**: `glm-5.3-prime-low`, the forced-low reasoning alias of
  `glm-5.3-prime` defined in [litellm/litellm.yml](../../litellm/litellm.yml).
  Same upstream model, `reasoning_effort: low` — cuts the CI job from 3-30 min
  of high-effort reasoning to minutes. No fallbacks; the job is
  `allow_failure`.
- **Why separate from git-agent**: `git-agent` has four other consumers
  (dependency-review CronJob, homelab-agent, hermes-agent, the LiteLLM A2A
  proxy) that need its full prompt and default reasoning effort. This agent
  carries only the MR Change Summary skill and a trimmed tool whitelist.
- **Not exposed**: deliberately absent from hermes-agent config and the
  LiteLLM `agents:` A2A proxy list — CI talks to kagent directly.
- **Secrets**: reuses `git-agent-secrets` (same LiteLLM API key); see
  [Secrets](#secrets) below.

> **Deploy-order note**: until Flux deploys these manifests, the
> `mr-change-summary` job on the introducing MR itself will 404 on the new
> A2A URL; `allow_failure: true` absorbs it.

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

- **[GitHub MCP Server](../../mcp-servers/github/README.md)** - GitHub integration
- **[GitLab MCP Server](../../mcp-servers/gitlab/README.md)** - GitLab integration
