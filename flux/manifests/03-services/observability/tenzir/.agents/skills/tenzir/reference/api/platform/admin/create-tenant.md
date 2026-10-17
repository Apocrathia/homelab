---
title: "Create Tenant"
canonical: https://tenzir.com/docs/reference/api/platform/admin/create-tenant
source: https://tenzir.com/docs/reference/api/platform/admin/create-tenant.md
section: "Docs"
---

# Create Tenant

> post/admin/create-tenant

post`/admin/create-tenant`

Requires authentication`Admin Key`

## Request body`application/json`

`owner``TenantOwner`required

`namespace``enum`required

Allowed values`user``team``organization``static-configuration``dcso-organization`

`owner_id``string`required

`display_name``string | null`optional

`name``string | null`optional

`icon_url``string | null`optional

## Responses

200Successful Response

`tenant_id``string`required

`create_date_time``string`required

`nodes``array<NodeResponse>`required

Array items

`name``string`required

`node_id``string`required

`create_date_time``string`required

`destroy_date_time``string | null`required

`last_known_version``string | null`required

`last_known_features``array<string>`required

`demo``boolean`required

`ephemeral``boolean`optional

Default`false`

400`{"detail": "Given user already has tenant {tenant_id}"}`

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
