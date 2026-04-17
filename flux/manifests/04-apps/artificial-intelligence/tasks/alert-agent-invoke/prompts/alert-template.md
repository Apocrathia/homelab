# Grafana Alert Investigation

A Grafana alert has fired and requires investigation.

## Alert Information

- **Alert**: {alert_name}
- **Status**: {status}
- **Severity**: {severity}
- **Firing Since**: {starts_at}

## Summary

{summary}

## Description

{description}

## Labels

{labels}

## Metric Values

{values}

## Instructions

Investigate this alert using available tools and agents. Determine the root cause, assess the impact, and recommend or take corrective action.

Post a concise findings summary to Discord channel `#notifications` via Discord MCP with:

1. What fired and why
2. Root cause (confirmed or best hypothesis with confidence level)
3. Impact assessment
4. Actions taken or recommended

Use `find_channel` with `channelName: "notifications"` and `guildId: "996790779257290772"` before posting.
