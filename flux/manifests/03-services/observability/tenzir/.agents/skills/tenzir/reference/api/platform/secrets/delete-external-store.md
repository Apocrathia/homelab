---
title: "Delete External Store"
canonical: https://tenzir.com/docs/reference/api/platform/secrets/delete-external-store
source: https://tenzir.com/docs/reference/api/platform/secrets/delete-external-store.md
section: "Docs"
---

# Delete External Store

> post/user/secrets/delete-external-store

post`/user/secrets/delete-external-store`

Remove an external secrets store

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`store_id``string`required

## Responses

200Successful Response

Type: `DeleteExternalStoreResponse`

400`{"detail": "Readonly secret store"}`

403`{"detail": "Invalid API Key"}`

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
