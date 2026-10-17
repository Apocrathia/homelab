---
title: "Launch a new pipeline"
canonical: https://tenzir.com/docs/reference/api/node/pipelines/launch-pipeline
source: https://tenzir.com/docs/reference/api/node/pipelines/launch-pipeline.md
section: "Docs"
---

# Launch a new pipeline

> post/pipeline/launch

post`/pipeline/launch`

Creates a pipeline and prepares it for interactive use. If the pipeline does not end with a sink, Tenzir adds an implicit output stream and returns the created pipeline ID. If the pipeline already has a sink, Tenzir returns `deployable: true` so the caller can deploy it explicitly.

Requires authentication`TenzirToken`

## Request body`application/json`

`id``string`optional

The pipeline ID. If omitted, Tenzir generates a random ID.

`definition``string`required

The pipeline definition.

`name``string`optional

The human-readable name of the pipeline.

Default`[an auto-generated id]`

`hidden``boolean`optional

Whether this pipeline is hidden.

Default`false`

`ttl``string | null`optional

A duration string specifying the maximum time for this pipeline to exist. No value means the pipeline is allowed to exist forever. This parameter must be finite and defined if the `hidden` parameter is true.

Default`null`

`autostart``object`optional

Flags that specify on which state to restart the pipeline.

`created``boolean`optional

Autostart the pipeline upon creation.

Default`false`

`completed``boolean`optional

Autostart the pipeline upon completion.

Default`false`

`failed``boolean`optional

Autostart the pipeline upon failure.

Default`false`

`autodelete``object`optional

Flags that specify on which state to delete the pipeline.

`completed``boolean`optional

Autodelete the pipeline upon completion.

Default`false`

`failed``boolean`optional

Autodelete the pipeline upon failure.

Default`false`

`stopped``boolean`optional

Autodelete the pipeline when it stops before completing.

Default`false`

`retry_delay``string`optional

The minimum time between automatic restarts after a pipeline error.

Default`1min`

`unstoppable``boolean`optional

Whether this pipeline is unstoppable.

Default`false`

`cache_id``string`optional

The identifier for the `cache` operator, which is inserted only when this parameter is provided.

`cache_capacity``integer`optional

The maximum number of events to keep in the `cache` operator.

`cache_read_timeout``string`optional

The time to live of the cache. Resets when reading from the cache.

`cache_write_timeout``string`optional

The maximum time to live of the cache. Unlike the `cache_read_timeout` parameter, this does not reset when reading from the cache.

`serve_id``string`optional

The output stream identifier to create for reading events from this pipeline.

`serve_buffer_size``integer`optional

The maximum number of events to buffer for the output stream.

Example

```json
{
  "definition": "export | where foo",
  "name": "interactive-query",
  "serve_id": "query-1",
  "serve_buffer_size": 4000
}
```

## Responses

200The launch request was accepted.

Exactly one of

Option 1`object`

`deployable``boolean`optional

Returns this property with the value `true`.

Option 2`object`

`id``string`optional

The ID of the created pipeline. Present when Tenzir added an implicit output stream because the pipeline does not end with a sink.

400Invalid arguments or invalid pipeline.

`error``string`required

The error message.

`diagnostics``array<object>`optional

Array items

`severity``enum`optional

Allowed values`error``warning``note`

`message``string`optional

`annotation``array<object>`optional

Array items

`primary``boolean`optional

`text``string`optional

A potentially empty label.

`source``object`optional

A region in the source code, defined by byte offsets.

`begin``number`optional

`end``number`optional

`notes``array<object>`optional

Array items

`kind``enum`optional

Allowed values`note``usage``hint``docs`

`message``string`optional

`rendered``string`optional
