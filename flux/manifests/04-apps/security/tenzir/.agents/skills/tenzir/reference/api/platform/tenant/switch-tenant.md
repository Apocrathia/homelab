---
title: "Switch Tenant"
canonical: https://tenzir.com/docs/reference/api/platform/tenant/switch-tenant
source: https://tenzir.com/docs/reference/api/platform/tenant/switch-tenant.md
section: "Docs"
---

# Switch Tenant

> post/user/switch-tenant

post`/user/switch-tenant`

## Request body`application/json`

`id_token``string`required

`tenant_id``string`required

## Responses

200Successful Response

`user_key``string`required

403`{"detail": "Invalid API Key"}` `{"detail": "Not permitted to access this tenant"}`

404`{"detail": "User not found"}` `{"detail": "Tenant not found"}`

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
