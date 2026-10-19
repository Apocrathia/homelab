---
title: "Check Connectivity"
canonical: https://tenzir.com/docs/reference/api/platform/admin/check-connectivy
source: https://tenzir.com/docs/reference/api/platform/admin/check-connectivy.md
section: "Docs"
---

# Check Connectivity

> post/admin/check-connectivy

post`/admin/check-connectivy`

Requires authentication`Admin Key`

## Request body`application/json`

Array items

`tenant_id``string`required

`node_id``string`required

## Responses

200Successful Response

Type: `array<boolean>`

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
