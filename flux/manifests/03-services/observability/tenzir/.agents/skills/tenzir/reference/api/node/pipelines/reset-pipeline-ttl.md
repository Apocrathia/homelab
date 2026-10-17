---
title: "Reset the TTL of an existing pipeline"
canonical: https://tenzir.com/docs/reference/api/node/pipelines/reset-pipeline-ttl
source: https://tenzir.com/docs/reference/api/node/pipelines/reset-pipeline-ttl.md
section: "Docs"
---

# Reset the TTL of an existing pipeline

> post/pipeline/reset-ttl

post`/pipeline/reset-ttl`

Resets the TTL for existing pipelines that were created with a TTL. Resetting the TTL restarts the TTL timer from zero seconds and keeps the pipelines alive longer.

Requires authentication`TenzirToken`

## Request body`application/json`

`ids``array<string>`required

The id of pipelines whose TTL should be updated.

## Responses

200The TTL was reset for the returned pipeline IDs.

`ids``array<string>`optional

The id of pipelines whose TTL has been successfully updated.

400Invalid arguments.

`error``string`required

The error message.
