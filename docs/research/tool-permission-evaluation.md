---
title: Tool permission guardrail evaluation
kind: assessment
status: complete
found_at: 2026-08-17
area: security
---

# Tool permission guardrail — MCP governance evaluation

> Research note (August 2026). Evaluated the LiteLLM `tool_permission`
> guardrail as a governance layer for MCP tools brokered through the
> homelab LiteLLM proxy. The broker exposes ~20 MCP servers (firecrawl,
> flux, github, gitlab, grafana, homeassistant, proxmox, unifi, etc.) and
> agent traffic can invoke them without authorization.

## Sources

| Source                    | URL / path                                                    | Role                           |
| ------------------------- | ------------------------------------------------------------- | ------------------------------ |
| Tool permission docs      | https://docs.litellm.ai/docs/proxy/guardrails/tool_permission | primary reference              |
| MCP guardrail docs        | https://docs.litellm.ai/docs/mcp_guardrail                    | MCP-specific guardrail surface |
| content_filter.py v1.97.0 | `_scan_mcp_tool_call_arguments`                               | MCP tool scanning logic        |
| litellm.yml               | `flux/…/litellm/litellm.yml` (broker config)                  | list of exposed tools          |

## Key findings

### What it protects

`tool_permission` allows/denies tools by regex on name or type, with
optional per-argument pattern restrictions (`allowed_param_patterns`).
It runs in `pre_call` (before the LLM call, strips disallowed tools from
the payload) or `post_call` (after the LLM call, rewrites model responses
with tool calls).

Two behaviours:

- `block` — rejects the request with HTTP 400 immediately.
- `rewrite` — silently strips disallowed tools and injects error text into
  `message.content` / `tool_result` entries so the client knows the tool
  was blocked while the rest of the completion continues.

### MCP applicability

The LiteLLM content filter source (v1.97.0) includes a function
`_scan_mcp_tool_call_arguments` that runs during `pre_call` and scans
MCP tool invocations. The `tool_permission` guardrail's deny/allow
rules should apply to MCP tools brokered through the proxy, not just
OpenAI-style `function` tools in chat completions.

**Caveat:** The `mcp_guardrail` docs page is sparse (4KB stub). Live
testing against the gateway with `POST /v1/mcp/…` calls is needed to
confirm MCP tool scanning. The MCP gateway path differs from
`/v1/chat/completions` — it is unclear whether `tool_permission`
hooks fire on the MCP gateway route or only on chat completions.

### What a useful config would look like

```yaml
- guardrail_name: "tool-permission"
  litellm_params:
    guardrail: tool_permission
    mode: "pre_call"
    default_on: true
    on_disallowed_action: "rewrite"
    rules:
      - id: "deny-flux-apply"
        tool_name: "^flux-apply_.*"
        decision: "deny"
      - id: "deny-flux-delete"
        tool_name: "^flux-delete_.*"
        decision: "deny"
      - id: "deny-proxmox-destructive"
        tool_name: "^proxmox-(delete|shutdown|stop|reset)_.*"
        decision: "deny"
      - id: "deny-unifi-destructive"
        tool_name: "^unifi-(delete|reboot|force)_.*"
        decision: "deny"
      - id: "deny-github-delete"
        tool_name: "^github-delete_.*"
        decision: "deny"
```

This would allow read/query tools through while blocking destructive
operations. `rewrite` mode is preferred over `block` for agentic traffic —
a hard 400 mid-agent-loop is worse than a graceful skip.

### Per-user/per-key scoping

Appears to be Enterprise-gated (team/key-based guardrail attachments).
OSS mode is global only. This limits granularity: you can't have stricter
rules for unauthenticated agents vs. the operator.

### Viability

**Viable for deployment** with the caveat that MCP gateway routing needs
verification. If tool scanning only fires on `/v1/chat/completions` and
not on the MCP gateway, then MCP tools are not governed — which makes
the guardrail a no-op for our primary tool surface.

## Conclusion

`inconclusive` — the guardrail has the right primitives (regex deny/allow,
graceful rewrite) but MCP applicability is unconfirmed. Needs a live
experiment: deploy the config, run a `firecrawl-firecrawl_scrape` call
through the MCP gateway, and verify the guardrail sees it.

## Recommendations

1. File a `spike/tool-permission-live-test` issue to deploy and verify
   against the MCP gateway.
2. If MCP tools are scanned, deploy the deny-list config above.
3. If MCP tools are NOT scanned, evaluate whether to block destructive
   tools at the client level (agent personas) instead.

## What not to do

- Don't use `block` mode — agent loops can't recover from a 400.
- Don't deploy without a live MCP test — the stub docs are insufficient
  evidence.
