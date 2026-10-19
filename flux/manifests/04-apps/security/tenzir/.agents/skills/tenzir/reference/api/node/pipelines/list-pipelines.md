---
title: "List pipelines"
canonical: https://tenzir.com/docs/reference/api/node/pipelines/list-pipelines
source: https://tenzir.com/docs/reference/api/node/pipelines/list-pipelines.md
section: "Docs"
---

# List pipelines

> post/pipeline/list

post`/pipeline/list`

Lists all visible pipelines.

Requires authentication`TenzirToken`

## Responses

200The pipeline list.

`pipelines``array<object>`optional

Array items

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

Example

```json
{
  "pipelines": [
    {
      "id": "4c7f2b11-6169-4d1b-89b4-4fc0a68b3d4a",
      "name": "user-assigned-name",
      "definition": "export | where foo | publish /bar",
      "hidden": false,
      "created_at": 1706180157837037600,
      "last_modified": 1706180157837038000,
      "state": "running",
      "error": null,
      "diagnostics": []
    },
    {
      "id": "08446737-da9b-4787-8599-97d85c48c3bb",
      "name": "wrong-pipeline",
      "definition": "export asdf",
      "hidden": false,
      "created_at": 1706180157837037600,
      "last_modified": 1706180157837038000,
      "state": "failed",
      "error": "format 'asdf' not found",
      "diagnostics": []
    }
  ]
}
```

400Invalid arguments.

`error``string`required

The error message.
