---
title: "Add"
canonical: https://tenzir.com/docs/reference/api/platform/secrets/add
source: https://tenzir.com/docs/reference/api/platform/secrets/add.md
section: "Docs"
---

# Add

> post/user/secrets/add

post`/user/secrets/add`

Add a new secret

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`store_id``string | null`optional

`name``string`required

`value``string`required

## Responses

200Successful Response

`secret_id``string`required

400`{"detail": "Secret already exists"}`

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
