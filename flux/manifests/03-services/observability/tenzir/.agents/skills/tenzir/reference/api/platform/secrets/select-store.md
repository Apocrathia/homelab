---
title: "Set Default Store"
canonical: https://tenzir.com/docs/reference/api/platform/secrets/select-store
source: https://tenzir.com/docs/reference/api/platform/secrets/select-store.md
section: "Docs"
---

# Set Default Store

> post/user/secrets/select-store

post`/user/secrets/select-store`

Sets the default store

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`store_id``string`required

## Responses

200Successful Response

Type: `SelectStoreResponse`

403`{"detail": "Invalid API Key"}`

404`{"detail": "Tenant not found"}` `{"detail": "Secret store not found"}`

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
