---
title: "Get Node Token"
canonical: https://tenzir.com/docs/reference/api/platform/nodes/get-node-token
source: https://tenzir.com/docs/reference/api/platform/nodes/get-node-token.md
section: "Docs"
---

# Get Node Token

> post/user/get-node-token

post`/user/get-node-token`

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`node_id``string`required

## Responses

200Successful Response

`tenzir_token``string`required

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
