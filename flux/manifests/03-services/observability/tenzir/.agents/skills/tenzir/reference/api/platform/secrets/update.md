---
title: "Update"
canonical: https://tenzir.com/docs/reference/api/platform/secrets/update
source: https://tenzir.com/docs/reference/api/platform/secrets/update.md
section: "Docs"
---

# Update

> post/user/secrets/update

post`/user/secrets/update`

Update an existing secret

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`store_id``string | null`optional

`secret_id``string`required

`value``string`required

## Responses

200Successful Response

Type: `UpdateSecretResponse`

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
