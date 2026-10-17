---
title: "Get Login Info"
canonical: https://tenzir.com/docs/reference/api/platform/account/get-login-info
source: https://tenzir.com/docs/reference/api/platform/account/get-login-info.md
section: "Docs"
---

# Get Login Info

> post/user/get-login-info

post`/user/get-login-info`

## Request body`application/json`

`id_token``string`required

## Responses

200Successful Response

`user_id``string`required

`user_email``string`required

`allowed_tenants``array<TenantDescription>`required

Array items

`tenant_id``string`required

`owner``TenantOwner`required

`namespace``enum`required

Allowed values`user``team``organization``static-configuration``dcso-organization`

`owner_id``string`required

`display_name``string | null`optional

`name``string`required

`icon_url``string`required

403`{"detail": "Invalid API Key"}`

404`{"detail": "User not found"}`

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
