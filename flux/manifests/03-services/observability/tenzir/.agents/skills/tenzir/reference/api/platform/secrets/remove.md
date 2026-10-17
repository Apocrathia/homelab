---
title: "Remove"
canonical: https://tenzir.com/docs/reference/api/platform/secrets/remove
source: https://tenzir.com/docs/reference/api/platform/secrets/remove.md
section: "Docs"
---

# Remove

> post/user/secrets/remove

post`/user/secrets/remove`

Remove a secret

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`secret_id``string`required

`store_id``string | null`optional

## Responses

200Successful Response

Type: `RemoveSecretResponse`

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
