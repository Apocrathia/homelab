---
title: "Generate Client Config"
canonical: https://tenzir.com/docs/reference/api/platform/nodes/generate-client-config
source: https://tenzir.com/docs/reference/api/platform/nodes/generate-client-config.md
section: "Docs"
---

# Generate Client Config

> post/user/generate-client-config

post`/user/generate-client-config`

Requires authentication`User Key`

## Request body`application/json`

`config_type``enum`required

Allowed values`tenzir``docker``tenzir-node`

`tenant_id``string`required

`node_name``string | null`optional

`node_id``string | null`optional

## Responses

200Successful Response

`filename``string`required

`contents``string`required

`node_id``string`required

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
