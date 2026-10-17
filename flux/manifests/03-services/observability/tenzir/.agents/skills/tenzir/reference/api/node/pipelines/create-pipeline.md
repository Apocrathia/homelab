---
title: "Create a new pipeline"
canonical: https://tenzir.com/docs/reference/api/node/pipelines/create-pipeline
source: https://tenzir.com/docs/reference/api/node/pipelines/create-pipeline.md
section: "Docs"
---

# Create a new pipeline

> post/pipeline/create

post`/pipeline/create`

Creates a pipeline.

If `autostart.created` is `true`, Tenzir sends the response after the pipeline starts successfully. If startup fails, Tenzir discards the pipeline and returns the observed diagnostics.

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

Whether this pipeline is hidden. Hidden pipelines start automatically, are not persisted, and are omitted from the `/pipeline/list` response.

Default`false`

`ttl``string | null`optional

A duration string specifying the maximum time for this pipeline to exist. No value means the pipeline is allowed to exist forever. This parameter must be defined if the `hidden` parameter is true.

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

A duration string specifying the minimum time between automatic restarts of a pipeline when an error occurs. Takes no effect if restarting on failure is disabled.

Default`1min`

`unstoppable``boolean`optional

Whether this pipeline is unstoppable. Unstoppable pipelines start automatically, fail when they complete, and can't be paused or stopped manually.

Default`false`

Example

```json
{
  "definition": "export | where foo | publish /bar",
  "name": "zeek-monitoring-pipeline",
  "hidden": false
}
```

## Responses

200The pipeline was created.

`id``string`required

The id of the successfully created pipeline.

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
