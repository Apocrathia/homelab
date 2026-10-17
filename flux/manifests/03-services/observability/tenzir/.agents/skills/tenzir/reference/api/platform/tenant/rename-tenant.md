---
title: "Update Tenant Name"
canonical: https://tenzir.com/docs/reference/api/platform/tenant/rename-tenant
source: https://tenzir.com/docs/reference/api/platform/tenant/rename-tenant.md
section: "Docs"
---

# Update Tenant Name

> post/user/rename-tenant

post`/user/rename-tenant`

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`name``string`required

## Responses

200Successful Response

Type: `RenameTenantResponse`

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
