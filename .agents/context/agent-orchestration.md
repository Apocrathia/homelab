# Agent orchestration (A2A vs MCP)

When Hermes (or another LiteLLM MCP client) should **delegate to a kagent A2A
agent** vs call a **direct LiteLLM MCP** tool. For the in-cluster agent→agent
graph (who can tool-call whom), see
[`flux/.../agents/README.md`](../../flux/manifests/04-apps/artificial-intelligence/agents/README.md).
Do not duplicate that mermaid here.

Lap routing (`find-work` → implement → ship) lives in
[`development-loop.md`](./development-loop.md) and
[`self-improve`](../skills/self-improve/SKILL.md). This file is only
need → A2A agent → MCP fallback.

Client usage (Claude, Prime): [`a2a` skill](../skills/a2a/SKILL.md).

## A2A base URL

Pattern (in-cluster):

```text
http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/<namespace>/<name>
```

Agent cards are at `<base>/.well-known/agent-card.json`. Register agents with
the **base URL only** (no card path).

### LiteLLM native agents

Register kagent agents in `litellm.yml` under top-level `agents:` with
`agent_card_params` (name, url, `protocolVersion: "0.3"`). Clients call
`POST /a2a/{agent_name}` or list via `GET /v1/agents`.

### Namespaces

The whole kagent fleet lives in `kagent/<name>`: kagent 1.0 tool refs are
same-namespace-only, so the fleet shares one namespace and one WorkerPool.
The former `agent-<domain>` namespaces are deleted except two bridge-only
survivors.

| Kind                         | Namespace | Examples                                                       |
| ---------------------------- | --------- | -------------------------------------------------------------- |
| User / domain agents         | `kagent`  | `kagent/git-agent`, `kagent/home-agent`, `kagent/search-agent` |
| Built-in system agents       | `kagent`  | `k8s-agent`, `helm-agent`, `observability-agent`, …            |
| Bridge namespaces (MCP only) | `agent-*` | `agent-home`, `agent-homelab` (deploy the MCP bridges)         |

## Need → A2A → MCP fallback

Prefer A2A when the task needs a specialist prompt, multi-step tool use, or
cross-agent delegation. Prefer direct MCP for a single known tool call with
no agent reasoning.

MCP aliases below are from `litellm.yml` `mcp_servers` (LiteLLM proxy). If A2A
is down or unregistered, use those aliases through LiteLLM.

| Need                                     | A2A agent (`namespace`/`name`)                                               | MCP fallback (LiteLLM aliases)                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| GitHub / GitLab (issues, MRs, pipelines) | `kagent`/`git-agent`                                                         | `github`, `gitlab`                                                              |
| Home Assistant automation / devices      | `kagent`/`home-agent`                                                        | `homeassistant` (also `grafana` on that agent)                                  |
| Proxmox / TrueNAS / UniFi                | `kagent`/`infrastructure-agent`                                              | `proxmox`, `truenas`, `unifi`                                                   |
| Sonarr / Radarr (Servarr)                | `kagent`/`media-agent`                                                       | `servarr`                                                                       |
| Web search                               | `kagent`/`search-agent`                                                      | `searxng`, `firecrawl`                                                          |
| Encyclopedia / memory / repo docs        | `kagent`/`knowledge-agent`                                                   | `openzim`, `qdrant`, `deepwiki` (+ `searxng` / `firecrawl` if search is enough) |
| Homelab Q&A / multi-domain orchestration | `kagent`/`homelab-agent`                                                     | Compose domain MCPs (`flux`, `grafana`, …) as needed                            |
| Hermes (orchestrator, Discord, ops)      | `hermes-agent`/`hermes-agent` (registered on LiteLLM)                        | Direct MCP tools; delegate via `a2a_call` to kagent agents                      |
| Kubernetes ops / troubleshooting         | `kagent`/`k8s-agent`                                                         | `flux` (inventory / reconcile); no general kubectl MCP                          |
| Helm releases                            | `kagent`/`helm-agent`                                                        | `flux` (`HelmRelease` path)                                                     |
| Cilium install / policy / debug          | `kagent`/`cilium-manager-agent`, `cilium-policy-agent`, `cilium-debug-agent` | none in LiteLLM; A2A or CLI                                                     |
| Metrics / dashboards / alerts            | `kagent`/`observability-agent`                                               | `grafana`                                                                       |
| PromQL authoring                         | `kagent`/`promql-agent`                                                      | `grafana`                                                                       |

## Hermes / self-improve

- Orchestrator (Hermes, agent parent, etc.) owns the
  [`self-improve`](../skills/self-improve/SKILL.md) /
  [`development-loop.md`](./development-loop.md) graph.
- Delegate domain work to the A2A agent in the table when registered; otherwise
  the MCP fallback column.
- Do not invent agents. Live fleet is the rows above (all kagent agents in
  `kagent`, built-ins vendored under
  `flux/manifests/04-apps/artificial-intelligence/kagent/builtin-agents/`).
  Manifest inventory:
  [`agents/README.md`](../../flux/manifests/04-apps/artificial-intelligence/agents/README.md).
