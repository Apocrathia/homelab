---
title: "Delete Node"
canonical: https://tenzir.com/docs/reference/api/platform/nodes/delete-node
source: https://tenzir.com/docs/reference/api/platform/nodes/delete-node.md
section: "Docs"
---

# Delete Node

> post/user/delete-node

post`/user/delete-node`

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`node_id``string`required

## Responses

200Successful Response

`infra_error``string | null`optional

403`{"detail": "Invalid API Key"}` `{"detail": "Not permitted to access this tenant"}`

404`{"detail": "Tenant not found"}` `{"detail": "Node not found"}`

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
