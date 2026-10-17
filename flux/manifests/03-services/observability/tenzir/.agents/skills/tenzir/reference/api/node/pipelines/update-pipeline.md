---
title: "Update pipeline state"
canonical: https://tenzir.com/docs/reference/api/node/pipelines/update-pipeline
source: https://tenzir.com/docs/reference/api/node/pipelines/update-pipeline.md
section: "Docs"
---

# Update pipeline state

> post/pipeline/update

post`/pipeline/update`

Updates the definition, metadata, or lifecycle state of a pipeline. Tenzir leaves omitted fields unchanged.

Requires authentication`TenzirToken`

## Request body`application/json`

`id``string`required

The id of the pipeline to be updated.

`definition``string`optional

The updated definition of the pipeline.

`action``enum`optional

The action that will change the pipeline's running state.

Allowed values`start``pause``stop``force-stop`

`name``string`optional

Update the human-readable name of the pipeline to this value.

`labels``array<object>`optional

The user-provided labels for this pipeline.

Array items

`text``string`optional

The pipeline label text.

`color``string`optional

The pipeline label color.

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

`unstoppable``boolean`optional

A flag specifying whether this pipeline is unstoppable. Unstoppable pipelines start automatically, fail when they complete, and can not be paused or stopped manually.

## Responses

200The pipeline was updated.

`pipeline``object`optional

`id``string`optional

The pipeline id.

`name``string`optional

The human-readable name of the pipeline.

`definition``string`optional

The pipeline definition.

`unstoppable``boolean`optional

A flag specifying whether this pipeline is unstoppable. Unstoppable pipelines start automatically, fail when they complete, and can not be paused or stopped manually.

`hidden``boolean`optional

Whether this pipeline is hidden. Hidden pipelines are only available through the `show pipelines` operator.

`created_at``integer<int64>`optional

The Unix timestamp of the pipeline creation time in nanoseconds.

`last_modified``integer<int64>`optional

The Unix timestamp of the last pipeline modification in nanoseconds.

`start_time``string`optional

If the pipeline has been started, the ISO 8601 timestamp of the most recent start.

`total_runs``integer`optional

The total amount of runs this pipeline has attempted so far.

`state``enum`optional

Allowed values`created``running``paused``failed``stopped``completed`

`error``string | null`optional

The error that the pipeline may have encountered during running.

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

`labels``array<object>`optional

The user-provided labels for this pipeline.

Array items

`text``string`optional

The pipeline label text.

`color``string`optional

The pipeline label color.

`retry_delay``string`optional

A duration string specifying the minimum time between automatic restarts of a pipeline when an error occurs. Takes no effect if restarting on failure is disabled.

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

`ttl``string | null`optional

If a TTL exists for this pipeline, the TTL as a duration string.

`remaining_ttl``string | null`optional

If a TTL exists for this pipeline, the remaining TTL as a duration string.

400Invalid arguments.

`error``string`required

The error message.
