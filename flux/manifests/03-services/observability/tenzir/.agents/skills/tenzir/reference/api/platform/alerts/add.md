---
title: "Add"
canonical: https://tenzir.com/docs/reference/api/platform/alerts/add
source: https://tenzir.com/docs/reference/api/platform/alerts/add.md
section: "Docs"
---

# Add

> post/user/alert/add

post`/user/alert/add`

Add a new alert

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`node_id``string`required

`duration``integer`required

`webhook_url``string`required

`webhook_body``string`required

## Responses

200Successful Response

`alert_id``string`required

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
