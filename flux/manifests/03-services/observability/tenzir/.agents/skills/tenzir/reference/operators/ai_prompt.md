---
title: "ai_prompt"
canonical: https://tenzir.com/docs/reference/operators/ai_prompt
source: https://tenzir.com/docs/reference/operators/ai_prompt.md
section: "Docs"
---

# ai_prompt

> Sends each input event to an OpenAI-compatible Responses API endpoint and adds the model response to the event.

Sends each input event to an OpenAI-compatible Responses API endpoint and adds the model response to the event.

```tql
ai_prompt model=string, [endpoint=string, system=string, data=any,
           into=field, api_key=string, temperature=double,
           max_tokens=uint, timeout=duration, concurrency=uint,
           tls=record]
```

## Description

The `ai_prompt` operator evaluates one request per input event. By default, it serializes the event as compact JSON and sends that string as the Responses API `input` field. Set `data` to use another expression instead. String values are also serialized as JSON strings before they are sent.

The default input leaves out the `ai` field and the `into` field, which hold the results of earlier calls. To send them anyway, pass them explicitly, for example with `data={alert: alert, summary: ai.summary.text}`, or send the whole event with `data=this`.

The operator uses `http://127.0.0.1:11434/v1` as its default endpoint, which matches the standard Ollama OpenAI-compatible API port. The operator appends `/responses` to the endpoint and sends a `POST` request to the Responses API. It doesn’t use the Chat Completions API. For providers that support the Responses API `store` flag, the operator sets it to `false`.

The operator preserves input order, even when `concurrency` is greater than `1`. If a request fails, Tenzir emits a warning, keeps the input event, and writes `null` to the result field for that event.

The result field is a record with the following structure:

```tql
{
  text: string,
  model: string | null,
  usage: {
    input_tokens: uint64 | null,
    output_tokens: uint64 | null,
    total_tokens: uint64 | null,
  } | null,
  latency: duration,
}
```

The `text` field contains the concatenated Responses API `output_text` content. The operator doesn’t parse JSON-looking text into structured data.

### `model = string`

The model to use.

This argument is required.

### `endpoint = string (optional)`

The OpenAI-compatible base endpoint.

Defaults to `http://127.0.0.1:11434/v1`.

The endpoint is resolved as a [secret](../../explanations/secrets.md), so you can pass a secret name to avoid hardcoding sensitive URLs.

### `system = string (optional)`

Instructions to send as the Responses API `instructions` field.

### `data = any (optional)`

The value to send as the request input after JSON serialization.

Defaults to the event without the `ai` field and without the `into` field.

### `into = field (optional)`

The field where Tenzir writes the result record.

Defaults to `ai.prompt`.

### `api_key = string (optional)`

Bearer token to send in the `Authorization` header.

If you omit this argument, Tenzir sends no authorization header. This is useful for local Ollama endpoints.

The API key is resolved as a [secret](../../explanations/secrets.md).

### `temperature = double (optional)`

Sampling temperature to send with the request, between `0` and `2`.

If you omit this argument, Tenzir sends no temperature and the model uses its own default. Some models, such as `gpt-5-mini`, reject the parameter.

### `max_tokens = uint (optional)`

Maximum number of output tokens to request.

### `timeout = duration (optional)`

HTTP request timeout.

Defaults to `30s`.

### `concurrency = uint (optional)`

Maximum number of in-flight requests.

Defaults to `1`.

### `tls = record (optional)`

TLS options for the HTTP client.

## Examples

### Use a local Ollama model

Send each event to the default local Ollama endpoint:

```tql
from {message: "Summarize this security alert."}
ai_prompt model="qwen3.8"
select summary=ai.prompt.text
```

### Use a custom OpenAI endpoint

Send a smaller input record to an OpenAI endpoint:

```tql
from {
  message: "User logged in from an unusual ASN.",
  src_ip: 203.0.113.10,
}
ai_prompt model="gpt-4.1-mini",
           endpoint="https://api.openai.com/v1",
           api_key=secret("openai-api-key"),
           system="Summarize the alert in one short sentence.",
           data={message: message, src_ip: src_ip},
           into=enrichment.ai
select summary=enrichment.ai.text,
       tokens=enrichment.ai.usage.total_tokens
```

## See Also

* [`ai_decide`](https://tenzir.com/docs/reference/operators/ai_decide.md)
* [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md)
* [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md)
* [Enrich events with AI](../../guides/enrich/enrich-events-with-ai.md)
