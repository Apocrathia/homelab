---
title: "Generate User Key"
canonical: https://tenzir.com/docs/reference/api/platform/admin/generate-user-key
source: https://tenzir.com/docs/reference/api/platform/admin/generate-user-key.md
section: "Docs"
---

# Generate User Key

> post/admin/generate-user-key

post`/admin/generate-user-key`

Requires authentication`Admin Key`

## Request body`application/json`

`user_id``string`required

`expires``integer`optional

`tenant_ids``array<string>`required

## Responses

200Successful Response

`key``string`required

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
