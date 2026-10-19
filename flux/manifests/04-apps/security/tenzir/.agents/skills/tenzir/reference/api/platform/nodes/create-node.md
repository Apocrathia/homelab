---
title: "Create Node"
canonical: https://tenzir.com/docs/reference/api/platform/nodes/create-node
source: https://tenzir.com/docs/reference/api/platform/nodes/create-node.md
section: "Docs"
---

# Create Node

> post/user/create-node

post`/user/create-node`

Creates a new node.

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`node_name``string`required

## Responses

200Successful Response

`node_id``string`required

403`{"detail": "Invalid API Key"}` `{"detail": "Not permitted to access this tenant"}`

404`{"detail": "Tenant not found"}`

409`{"detail": "Tenant state changed"}`

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
