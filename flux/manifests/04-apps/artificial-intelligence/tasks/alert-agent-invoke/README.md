# alert-agent-invoke

Webhook bridge that receives Grafana alert notifications and invokes kagent via A2A.

## How it works

1. Grafana fires an alert and POSTs the webhook payload to the bridge service.
2. The bridge extracts alert metadata (name, labels, annotations, values, severity).
3. A prompt is built from `prompts/alert-template.md` with the alert context injected.
4. The bridge calls kagent A2A as a fire-and-forget background task and returns `200` to Grafana immediately.
5. The agent investigates and posts findings to Discord.

## Components

| Resource                    | Purpose                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| `deployment.yaml`           | Python webhook server (Starlette + uvicorn)                          |
| `service.yaml`              | ClusterIP service on port 8080                                       |
| `contact-point.yaml`        | `GrafanaContactPoint` (webhook type) targeting the service           |
| `prompts/alert-template.md` | Prompt template with `{alert_name}`, `{severity}`, etc. placeholders |
| `src/server.py`             | Webhook handler and A2A client                                       |

## Routing alerts to the agent

The `GrafanaContactPoint` is created automatically, but alerts won't reach it without a notification policy route. Add a matcher to your `GrafanaNotificationPolicy` to route specific alerts:

```yaml
route:
  routes:
    - receiver: Agent Invoke
      matchers:
        - alertname =~ ".*"
      # Or use a label to opt in specific rules:
      # matchers:
      #   - agent_invoke = "true"
```

Alternatively, add the label `agent_invoke: "true"` to any `GrafanaAlertRuleGroup` rule and match on that.

## Environment

| Variable               | Default                      | Description                      |
| ---------------------- | ---------------------------- | -------------------------------- |
| `A2A_URL`              | (required)                   | kagent A2A base URL              |
| `PROMPT_TEMPLATE_PATH` | `/scripts/alert-template.md` | Path to the prompt template      |
| `MAX_TURNS`            | `4`                          | Maximum A2A turns per invocation |
| `HTTP_TIMEOUT_S`       | `300`                        | HTTP timeout for A2A calls       |
| `PORT`                 | `8080`                       | Server listen port               |

## Python (`src/`)

After changing dependencies:

```bash
cd src
uv lock
```
