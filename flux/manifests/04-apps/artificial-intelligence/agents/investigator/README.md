# Investigator Agent (Security)

The homelab's security investigator: a kagent agent that triages alerts and
detection findings against the Tenzir OCSF lake, works cases in the
investigations platform, and reports in Discord-ready markdown. Persona:
the [security-analyst](../../../../../../.agents/agents/security-analyst/agent.md)
mold — adversarial, evidence-first, homelab-calibrated.

> **Navigation**: [← Back to Agents README](../README.md)

## Overview

Investigations are a workflow over two surfaces of the
[investigations node](../../../security/tenzir/nodes/investigations/README.md)
(`tenzir-node-investigations`, in-cluster only):

- **Write lane** (`:8080`) — case open/update/close and evidence-pin envelopes
  into ClickHouse `investigations.records` (append-only; the map operator
  validates and stamps the OCSF spine).
- **Query lane** (`:5160`, `X-Tenzir-Token`) — bounded `from_clickhouse`
  pipelines over `investigations.records` and the `ocsf.*` lake tables with the
  SELECT-only `investigations-reader` user. ClickHouse credentials never reach
  the agent; the node resolves `secret(...)` node-side.

The full playbook (endpoints, envelope contract, launch/serve examples, the
single-JSON read trap, verdict/status IDs, report format) lives in the Agent CR
system prompt — the prompt is the skill.

## Configuration

The agent is defined by the `Agent` CR in `agent.yaml`; model wiring in
`modelconfig.yaml`. The kagent token bootstrap is covered under
[Secrets bootstrap](#secrets-bootstrap).

## How it gets invoked

```mermaid
sequenceDiagram
    autonumber
    participant G as Grafana (findings alert)
    participant BR as alert-agent-invoke bridge
    participant HA as homelab-agent
    participant IA as investigator-agent
    participant N as tenzir-node-investigations
    G->>BR: webhook (agent_invoke: "true")
    BR->>HA: A2A (alert context prompt)
    HA->>IA: delegate (security alert)
    IA->>N: query lane (lake hunts) + write lane (case, pins, close)
    IA-->>HA: Discord-ready investigation report
```

- **Alerts**: the [tenzir findings alert rule](../../../../03-services/observability/grafana/alerting/tenzir-findings.yaml)
  (`agent_invoke: "true"`) routes through the existing alert-agent-invoke
  bridge to homelab-agent, which delegates security alerts here.
- **Hermes** (the human front door) lists `investigator-agent` in its
  `a2a_agents` and can call it as a peer.
- **homelab-agent** holds it as an Agent tool and delegates security-finding
  triggers to it.

## Why it lives in the `kagent` namespace

The investigations node's NetworkPolicy allows ingress from the `kagent` and
`hermes-agent` namespaces only (the investigations design's in-cluster callers)
— the investigator was designed to land in one of those, so it deploys next to
homelab-agent rather than in a dedicated `agent-*` namespace. No cluster
manifest change was needed on the tenzir side.

## How the token reaches the node

The agent never holds the credential. Its runtime sends the query-lane header
`X-Tenzir-Token` with a placeholder value, and the egress gateway (the
EgressPolicy in `egresspolicy.yaml`) replaces it with the real token from the
`tenzir-secrets` Secret (`investigations-api-token` field, rendered
in-namespace by the OnePasswordItem in `secret.yaml`). The same policy pins
sandbox egress to the investigations node's two Service DNS names (kagent
denies sandbox egress by default); the write lane needs no auth (the node
NetworkPolicy scopes callers).

## Secrets bootstrap

Two 1Password items (fields named here; values added by the operator):

| Item (`vaults/Secrets/items/…`) | Field                      | Consumer                                                                       |
| ------------------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| `investigator-agent-secrets`    | `litellm-api-key`          | ModelConfig → cluster LiteLLM                                                  |
| `tenzir-secrets`                | `investigations-api-token` | the node web-API token (node README bootstrap step 4-5; node state on the PVC) |

## Access

- **kagent A2A endpoint**: `http://kagent-controller.kagent.svc.cluster.local:8083/api/a2a/kagent/investigator-agent`
- **LiteLLM A2A entry**: `investigator-agent` in `litellm.yml` `agents:`
- **Hermes peer entry**: `a2a_agents.investigator-agent` in hermes `config.yaml`

## Troubleshooting

```bash
kubectl get agent investigator-agent --namespace kagent
kubectl get pods --namespace kagent -l kagent.dev/agent-name=investigator-agent
kubectl logs --namespace kagent -l kagent.dev/agent-name=investigator-agent

# EgressPolicy + its backing secret (the gateway reads the token from it;
# injection only happens inside the agent's own sandboxed egress path)
kubectl get egresspolicy investigator-tenzir-egress -n kagent
kubectl get secret tenzir-secrets -n kagent \
  -o jsonpath='{.data.investigations-api-token}' | base64 -d | wc -c
```

Assert-WARNINGS from dropped envelopes surface in the node's diagnostics; the
findings alert lane surfaces alert-invocation failures in the bridge logs
(`alert-agent-invoke`, namespace `agent-tasks`).

## Known limitations

- **Static bearer token, no per-caller identity** — the platform's accepted
  residual risk (investigations design); attribution is record-level via the
  envelope `agent` object.
- **High-severity case re-trigger**: case opens with `severity_id >= 4` match
  the findings alert too; the playbook's dedupe step (continue, never re-open)
  is the loop guard.

## References

- **[Investigations node README](../../../security/tenzir/nodes/investigations/README.md)** — envelope contract, bootstrap, containment
- **[Tenzir platform design](../../../../../../.scratch/agent-investigation/design.md)** — P-3 scope
- **[kagent Agent CRD](https://kagent.dev/docs/kagent/crds)** — Declarative agent schema
