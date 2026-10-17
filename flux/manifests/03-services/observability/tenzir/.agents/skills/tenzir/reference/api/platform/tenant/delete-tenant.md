---
title: "Delete Tenant"
canonical: https://tenzir.com/docs/reference/api/platform/tenant/delete-tenant
source: https://tenzir.com/docs/reference/api/platform/tenant/delete-tenant.md
section: "Docs"
---

# Delete Tenant

> post/user/delete-tenant

post`/user/delete-tenant`

Deleting shared accounts via this endpoint is currently not supported to prevent accidents

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`reason``string | null`optional

## Responses

200Successful Response

`infra_errors``array<string>`required

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
