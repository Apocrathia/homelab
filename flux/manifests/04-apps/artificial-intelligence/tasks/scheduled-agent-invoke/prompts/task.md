# Scheduled homelab status

You are running a scheduled automation task. Execute the workflow end-to-end and produce results, not a plan.

## Required workflow

1. Run a concise cluster health check using available specialist tools/agents.

2. Build a short operational summary with:

   - node readiness
   - cluster-wide workload health across all namespaces (not only a selected subset)
   - critical namespace spotlight (`kube-system`, `flux-system`, `prometheus-system`, `grafana-system`, `longhorn-system`)
   - failed pods anywhere in the cluster (CrashLoopBackOff, Error, ImagePullBackOff, Failed, Pending with clear issue)
   - restart counts for unhealthy pods anywhere in the cluster (include namespace/pod/container and restart total)
   - for each failed/crashlooping pod, inspect recent logs and infer likely root cause
   - key warnings/action items

3. Post that summary to Discord channel `#notifications` via Discord MCP.

## Investigation policy (daily run constraints)

- Scope windows to the last 24 hours for restart and log analysis.
- Investigate at most:
  - top 5 failed/crashlooping pods by severity/impact
  - top 5 high-restart pods by restart count
- Restart severity thresholds (24h):
  - `0-2`: informational only, do not escalate by itself
  - `3-9`: warning
  - `10+`: critical
- Deduplicate repeated issues by workload/controller when possible (Deployment/StatefulSet/DaemonSet) instead of repeating nearly identical pod entries.
- If logs/events/data are unavailable for an item (timeout, RBAC, pod gone), include a clear `no data` note for that item.
- Escalate if any of these are true:
  - control plane or core cluster services are degraded
  - storage components show failures/data-path issues
  - gateway/networking path is degraded
  - any critical pod repeatedly failing with `10+` restarts in 24h

## Discord execution requirements

- First, call `find_channel` with:
  - `channelName: "notifications"`
  - `guildId: "996790779257290772"`
- If `find_channel` succeeds, immediately call `send_message` with **only** the report body (sections 1–6 below). Do not append delivery confirmations, message links, or “posted to #…” lines to the channel text.
- If `find_channel` fails specifically because guild ID is required, then stop and return one concise blocker message requesting the guild ID.
- Do not loop on repeated guild ID requests.

## Output requirements

- Do not return tool-call plans or raw JSON for another agent.
- Actually execute tool calls and delegated steps.

Use this exact template for consistency:

1. `Summary` (2-4 lines): overall cluster status and risk level.
2. `Failed Pods (Top 5)`:
   - list items as: `namespace/pod (container) | reason | likely cause | confidence: high|medium|low`
   - if none: `none`
3. `High Restarts (Top 5, last 24h)`:
   - list items as: `namespace/pod (container) | restarts_24h | severity | likely cause | confidence: high|medium|low`
   - if none: `none`
4. `Critical Namespace Spotlight`:
   - one concise line each for `kube-system`, `flux-system`, `prometheus-system`, `grafana-system`, `longhorn-system`
5. `Escalations`:
   - explicit list of escalated items, or `none`
6. `Next Actions`:
   - one concrete next step per issue (command/check), prioritized

The `send_message` payload must stop after `Next Actions`. Treat `send_message` tool responses (success/link) as internal only — never paste them into the Discord message body.
