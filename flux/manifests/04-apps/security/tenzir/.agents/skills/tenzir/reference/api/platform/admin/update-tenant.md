---
title: "Update Tenant Owner"
canonical: https://tenzir.com/docs/reference/api/platform/admin/update-tenant
source: https://tenzir.com/docs/reference/api/platform/admin/update-tenant.md
section: "Docs"
---

# Update Tenant Owner

> post/admin/update-tenant

post`/admin/update-tenant`

Requires authentication`Admin Key`

## Request body`application/json`

`tenant_id``string`required

`name``string | null`optional

`icon_url``string | null`optional

`owner_id``string | null`optional

`owner_namespace``string | null`optional

`owner_display_name``string | null`optional

## Responses

200Successful Response

Type: `UpdateTenantResponse`

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
