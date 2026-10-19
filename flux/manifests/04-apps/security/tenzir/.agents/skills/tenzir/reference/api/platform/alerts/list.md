---
title: "List"
canonical: https://tenzir.com/docs/reference/api/platform/alerts/list
source: https://tenzir.com/docs/reference/api/platform/alerts/list.md
section: "Docs"
---

# List

> post/user/alert/list

post`/user/alert/list`

List all configured alerts.

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

## Responses

200Successful Response

`alerts``array<NodeOfflineAlert>`required

Array items

`type``string`optional

Default`node_offline`

`id``string`required

`node_id``string`required

`duration``integer`required

`webhook_url``string`required

`webhook_body``string`required

403`{"detail": "Invalid API Key"}`

404`{"detail": "Dashboard not found"}`

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
