# Agent orchestration (A2A vs MCP)

When Hermes (or another LiteLLM MCP client) should **delegate to a kagent A2A
agent** vs call a **direct LiteLLM MCP** tool. For the in-cluster agent→agent
graph (who can tool-call whom), see
[`flux/.../agents/README.md`](../../flux/manifests/04-apps/artificial-intelligence/agents/README.md)
— do not duplicate that mermaid here.

Lap routing (`find-work` → implement → ship) lives in
[`development-loop.md`](./development-loop.md) and
[`self-improve`](../skills/self-improve/SKILL.md). This file is only
need → A2A agent → MCP fallback.

## A2A base URL

Pattern (in-cluster):

```text
http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/<namespace>/<name>
```

Agent cards are at `<base>/.well-known/agent-card.json`. Register agents with
the **base URL only** (no card path). Card-path registration makes
`a2a-send_message` POST the card URL and fail.

The A2A bridge fetches `agent-card.json` from the base URL. Register via the
LiteLLM `a2a` MCP tools. If registration fails, prefer the MCP fallback for
the same need.

### Namespaces

| Kind                         | Namespace        | Examples                                                  |
| ---------------------------- | ---------------- | --------------------------------------------------------- |
| User / domain agents         | `agent-<domain>` | `agent-git/git-agent`, `agent-home/home-agent`            |
| System agents (kagent chart) | `kagent`         | `k8s-agent`, `helm-agent`, `observability-agent`, …       |
| Homelab tech assistant       | `kagent`         | `homelab-agent` (Discord bridge stays in `agent-homelab`) |

Do not probe user agents under `kagent/<name>` — cards live under
`agent-<domain>/<name>`.

## Need → A2A → MCP fallback

Prefer A2A when the task needs a specialist prompt, multi-step tool use, or
cross-agent delegation. Prefer direct MCP for a single known tool call with
no agent reasoning.

MCP aliases below are from `litellm.yml` `mcp_servers` (LiteLLM proxy). If A2A
is down or unregistered, use those aliases through LiteLLM.

| Need                                     | A2A agent (`namespace`/`name`)                                               | MCP fallback (LiteLLM aliases)                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| GitHub / GitLab (issues, MRs, pipelines) | `agent-git`/`git-agent`                                                      | `github`, `gitlab`                                                              |
| Home Assistant automation / devices      | `agent-home`/`home-agent`                                                    | `homeassistant` (also `grafana` on that agent)                                  |
| Proxmox / TrueNAS / UniFi                | `agent-infrastructure`/`infrastructure-agent`                                | `proxmox`, `truenas`, `unifi`                                                   |
| Sonarr / Radarr (Servarr)                | `agent-media`/`media-agent`                                                  | `servarr`                                                                       |
| Web search                               | `agent-search`/`search-agent`                                                | `searxng`, `firecrawl`                                                          |
| Encyclopedia / memory / repo docs        | `agent-knowledge`/`knowledge-agent`                                          | `openzim`, `qdrant`, `deepwiki` (+ `searxng` / `firecrawl` if search is enough) |
| Homelab Q&A / multi-domain orchestration | `kagent`/`homelab-agent`                                                     | Compose domain MCPs (`flux`, `grafana`, …) as needed                            |
| Kubernetes ops / troubleshooting         | `kagent`/`k8s-agent`                                                         | `flux` (inventory / reconcile); no general kubectl MCP                          |
| Helm releases                            | `kagent`/`helm-agent`                                                        | `flux` (`HelmRelease` path)                                                     |
| Cilium install / policy / debug          | `kagent`/`cilium-manager-agent`, `cilium-policy-agent`, `cilium-debug-agent` | none in LiteLLM — A2A or CLI                                                    |
| Metrics / dashboards / alerts            | `kagent`/`observability-agent`                                               | `grafana`                                                                       |
| PromQL authoring                         | `kagent`/`promql-agent`                                                      | `grafana`                                                                       |

A2A bridge tools themselves: LiteLLM alias `a2a`
(`a2a-register_agent`, `a2a-list_agents`, `a2a-send_message`, …).

## Hermes / self-improve

- Orchestrator (Hermes, Cursor parent, etc.) owns the
  [`self-improve`](../skills/self-improve/SKILL.md) /
  [`development-loop.md`](./development-loop.md) graph.
- Delegate domain work to the A2A agent in the table when registered; otherwise
  the MCP fallback column.
- Do not invent agents. Live fleet is the rows above (user domain agents +
  system agents in `kagent`). Manifest inventory:
  [`agents/README.md`](../../flux/manifests/04-apps/artificial-intelligence/agents/README.md).
