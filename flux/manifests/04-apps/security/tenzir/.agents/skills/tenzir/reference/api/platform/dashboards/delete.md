---
title: "Delete"
canonical: https://tenzir.com/docs/reference/api/platform/dashboards/delete
source: https://tenzir.com/docs/reference/api/platform/dashboards/delete.md
section: "Docs"
---

# Delete

> post/user/dashboard/delete

post`/user/dashboard/delete`

Definitively delete all revisions of a given dashboard for the given

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`dashboard_id``string`required

## Responses

200Successful Response

Type: `unknown`

403`{"detail": "Invalid API Key"}`

422Validation Error

`detail``array<ValidationError>`optional

Array items

`loc``array<string / integer>`required

Array items

Any of

Option 1`string`

Option 2`integer`

`msg``string`required

`type``string`required
