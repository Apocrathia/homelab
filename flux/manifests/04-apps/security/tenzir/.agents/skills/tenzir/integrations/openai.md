---
title: "OpenAI Codex integration"
description: "Turn coding agent activity into OCSF security telemetry: commands, files, sandbox verdicts, and model traffic."
canonical: https://tenzir.com/integrations/openai
source: https://tenzir.com/integrations/openai.md
section: "Integrations"
---

# OpenAI Codex integration

> Turn coding agent activity into OCSF security telemetry: commands, files, sandbox verdicts, and model traffic.

[Codex](https://developers.openai.com/codex) exports coding-agent activity over OpenTelemetry, including shell commands, file operations, tool calls, and sandbox outcomes. Our integration maps that telemetry to OCSF so you can investigate agent activity alongside your other security data. Coverage depends on the agent version and export settings.

## Enable telemetry

Configure telemetry in `~/.codex/config.toml`. Replace `tenzir-node` with the receiving node’s address:

```toml
[otel]
environment = "production"
log_user_prompt = false  # set true to capture prompt text
exporter = { otlp-grpc = { endpoint = "http://tenzir-node:4317" } }
trace_exporter = { otlp-grpc = { endpoint = "http://tenzir-node:4317" } }
metrics_exporter = { otlp-grpc = { endpoint = "http://tenzir-node:4317" } }
```

Check that exported records include the workstation’s hostname. Missing host identity limits correlation with other endpoint events.

## Receive and normalize

[Install our OpenAI package](../guides/packages/install-a-package.md) on the receiving node, then run:

```tql
accept_otlp "0.0.0.0:4317", transport="grpc", schema="record"
where @name in ["otel.log", "otel.span"]
openai::codex::ocsf::normalize
```

This example receives native OTLP logs and spans, excluding metrics. Add your destination operator after normalization. Configure TLS before exposing the receiver beyond a trusted network.

Shell and file activity use their existing OCSF classes; remote calls use API Activity. Records without enough information for a specific class remain Base Events. Our [package README](https://github.com/tenzir/library/blob/otel/openai/README.md) covers the complete mapping table, identifiers, filtering, and edge cases.

## Find blocked sandbox actions

Append this query after normalization to inspect blocked sandbox outcomes:

```tql
where metadata.event_code == "codex.sandbox_outcome" and disposition_id == 2
select time, message, policy.type, call_id=unmapped.tool_use_id
```

Keep Base Events in your output: they include these sandbox outcomes.

## Control content retention

The export configuration disables prompt logging. Check the raw records from your installed agent version before relying on these settings as privacy controls.

By default, normalization omits copied prompt, response, and tool-input text from content fields. Set `include_content=true` on the normalizer to include them where your policy allows.

This option does not redact `raw_data`, which retains the complete input. Shell commands also remain in `process.cmd_line`. Apply access controls and retention limits to those fields.

## See also

* [Install a package](../guides/packages/install-a-package.md)
* [Normalization](../explanations/normalization.md)
