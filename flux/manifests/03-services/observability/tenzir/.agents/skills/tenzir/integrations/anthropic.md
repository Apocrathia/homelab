---
title: "Anthropic Claude Code integration"
description: "Turn coding agent activity into OCSF security telemetry: commands, files, tools, and who approved them."
canonical: https://tenzir.com/integrations/anthropic
source: https://tenzir.com/integrations/anthropic.md
section: "Integrations"
---

# Anthropic Claude Code integration

> Turn coding agent activity into OCSF security telemetry: commands, files, tools, and who approved them.

[Claude Code](https://docs.claude.com/en/docs/claude-code/overview) exports coding-agent activity over OpenTelemetry, including shell commands, file operations, tool calls, and approval decisions. Our integration maps that telemetry to OCSF so you can investigate agent activity alongside your other security data. Coverage depends on the agent version and export settings.

## Enable telemetry

Add these settings under `env` in `~/.claude/settings.json`. Replace `tenzir-node` with the receiving node’s address:

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_TRACES_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "grpc",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://tenzir-node:4317",
    "OTEL_LOG_USER_PROMPTS": "0",
    "OTEL_LOG_TOOL_DETAILS": "0",
    "OTEL_RESOURCE_ATTRIBUTES": "host.name=workstation-42"
  }
}
```

Set `host.name` to the workstation’s actual hostname so events can identify the machine.

## Receive and normalize

[Install our Anthropic package](../guides/packages/install-a-package.md) on the receiving node, then run:

```tql
accept_otlp "0.0.0.0:4317", transport="grpc", schema="record"
where @name in ["otel.log", "otel.span"]
anthropic::claude_code::ocsf::normalize
```

This example receives native OTLP logs and spans, excluding metrics. Add your destination operator after normalization. Configure TLS before exposing the receiver beyond a trusted network.

Shell and file activity use their existing OCSF classes; remote calls use API Activity. Records without enough information for a specific class remain Base Events. Our [package README](https://github.com/tenzir/library/blob/otel/anthropic/README.md) covers the complete mapping table, identifiers, filtering, and edge cases.

## Find human-approved shell launches

Append this query after normalization to find shell launch requests approved by a person:

```tql
where class_uid == 1007 and activity_id == 1 and disposition_id == 8
select time, actor.user.email_addr, process.cmd_line
```

Approval records describe permission to launch, not proof that the command completed successfully.

## Control content retention

The export configuration disables prompt and tool-detail logging. Check the raw records from your installed agent version before relying on these settings as privacy controls.

By default, normalization omits copied prompt, response, and tool-input text from content fields. Set `include_content=true` on the normalizer to include them where your policy allows.

This option does not redact `raw_data`, which retains the complete input. Shell commands also remain in `process.cmd_line`. Apply access controls and retention limits to those fields.

## See also

* [Install a package](../guides/packages/install-a-package.md)
* [Normalization](../explanations/normalization.md)
