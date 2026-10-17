---
title: "Add External Store"
canonical: https://tenzir.com/docs/reference/api/platform/secrets/add-external-store
source: https://tenzir.com/docs/reference/api/platform/secrets/add-external-store.md
section: "Docs"
---

# Add External Store

> post/user/secrets/add-external-store

post`/user/secrets/add-external-store`

Add a new secrets store

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`type``enum`required

Allowed values`aws`

`name``string | null`optional

`is_writable``boolean`optional

Default`false`

`make_default``boolean`optional

Default`false`

`options``map<string, string>`required

## Responses

200Successful Response

`store_id``string`required

403`{"detail": "Invalid API Key"}`

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
