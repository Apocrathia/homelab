---
title: "Rename Node"
canonical: https://tenzir.com/docs/reference/api/platform/nodes/rename-node
source: https://tenzir.com/docs/reference/api/platform/nodes/rename-node.md
section: "Docs"
---

# Rename Node

> post/user/rename-node

post`/user/rename-node`

Renames an existing node.

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`node_id``string`required

`node_name``string`required

## Responses

200Successful Response

Type: `RenameNodeResponse`

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
