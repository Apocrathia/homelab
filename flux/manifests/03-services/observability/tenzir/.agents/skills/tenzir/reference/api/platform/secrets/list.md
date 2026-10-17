---
title: "List"
canonical: https://tenzir.com/docs/reference/api/platform/secrets/list
source: https://tenzir.com/docs/reference/api/platform/secrets/list.md
section: "Docs"
---

# List

> post/user/secrets/list

post`/user/secrets/list`

List all secrets

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`store_id``string | null`optional

## Responses

200Successful Response

`secrets``array<SecretDetails>`required

Array items

`last_updated``string<date-time>`required

`last_accessed``string<date-time> | null`required

`id``string`required

`name``string`required

400`{"detail": "Invalid or missing secret store credentials. Please check your configuration."}`

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
