---
title: "Retire Demo Node"
canonical: https://tenzir.com/docs/reference/api/platform/nodes/retire-demo-node
source: https://tenzir.com/docs/reference/api/platform/nodes/retire-demo-node.md
section: "Docs"
---

# Retire Demo Node

> post/user/retire-demo-node

post`/user/retire-demo-node`

Remove the demo node infrastructure if there is one

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`node_id``string`required

## Responses

200Successful Response

Type: `unknown`

400`{"detail": "Demo node already exists"}`

403`{"detail": "Invalid API Key"}` `{"detail": "Not permitted to access this tenant"}`

404`{"detail": "Tenant not found"}`

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
