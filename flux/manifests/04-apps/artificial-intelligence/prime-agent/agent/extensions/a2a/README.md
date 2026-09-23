# a2a — kagent A2A client tools + inbound webhook

`index.ts` registers the native `a2a_agents` / `a2a_send` / `a2a_task`
tools for the kagent agents brokered by the in-cluster LiteLLM gateway.
Slow agent runs return early with a `task_id` to poll — the harness
aborts tool calls at ~240s.

`server.mjs` is the inbound side of the same wire: a standalone A2A
server (message/send + tasks/get, bearer-auth fail-closed). It only runs
where `A2A_WEBHOOK_TOKEN` is set — the cluster box, never the Mac.

## Configuration

- Broker URL/key: the `a2a` key in `~/.prime/agent/mcp-secrets.json`
  (local), or `A2A_BASE_URL` + `A2A_API_KEY` env (the pod). Same LiteLLM
  virtual key the litellm extension rides.
- Webhook (cluster only): `A2A_WEBHOOK_TOKEN` gates both the server
  start and the extension's respawn probe; `A2A_WEBHOOK_PORT` defaults
  to 8080.

Deployment-level detail (broker registration, token wiring, the
stateless one-shot-per-message semantics, concurrency caps): the
[Inbound A2A section of the app README](../../../README.md).
