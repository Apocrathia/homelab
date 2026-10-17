---
title: "Delete"
canonical: https://tenzir.com/docs/reference/api/platform/alerts/delete
source: https://tenzir.com/docs/reference/api/platform/alerts/delete.md
section: "Docs"
---

# Delete

> post/user/alert/delete

post`/user/alert/delete`

Delete the specified alert

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`alert_id``string`required

## Responses

200Successful Response

Type: `DeleteAlertResponse`

403`{"detail": "Invalid API Key"}`

404`{"detail": "Alert not found"}`

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
