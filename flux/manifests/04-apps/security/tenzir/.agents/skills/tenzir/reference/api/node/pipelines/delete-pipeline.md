---
title: "Delete an existing pipeline"
canonical: https://tenzir.com/docs/reference/api/node/pipelines/delete-pipeline
source: https://tenzir.com/docs/reference/api/node/pipelines/delete-pipeline.md
section: "Docs"
---

# Delete an existing pipeline

> post/pipeline/delete

post`/pipeline/delete`

Deletes a pipeline by ID.

Requires authentication`TenzirToken`

## Request body`application/json`

`id``string`required

The id of the pipeline to be deleted.

## Responses

200The pipeline was deleted.

Type: `object`

Example

```json
{}
```

400Invalid arguments.

`error``string`required

The error message.
