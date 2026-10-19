---
title: "Create Demo Node"
canonical: https://tenzir.com/docs/reference/api/platform/nodes/create-demo-node
source: https://tenzir.com/docs/reference/api/platform/nodes/create-demo-node.md
section: "Docs"
---

# Create Demo Node

> post/user/create-demo-node

post`/user/create-demo-node`

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`node_name``string`required

`env_overrides``array<string>`optional

Default`[]`

## Responses

200Successful Response

`name``string`required

`node_id``string`required

`create_date_time``string`required

`destroy_date_time``string | null`required

`last_known_version``string | null`required

`last_known_features``array<string>`required

`demo``boolean`required

`ephemeral``boolean`optional

Default`false`

`connected``boolean`required

DEPRECATED: Use `lifecycle_state` field instead

`lifecycle_state``enum`required

Allowed values`created``connected``disconnected`

`has_failed_pipelines``boolean`required

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
