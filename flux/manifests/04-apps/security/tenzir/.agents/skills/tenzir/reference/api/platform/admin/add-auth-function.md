---
title: "Add Auth Function"
canonical: https://tenzir.com/docs/reference/api/platform/admin/add-auth-function
source: https://tenzir.com/docs/reference/api/platform/admin/add-auth-function.md
section: "Docs"
---

# Add Auth Function

> post/admin/add-auth-function

post`/admin/add-auth-function`

Requires authentication`Admin Key`

## Request body`application/json`

`tenant_id``string`required

`auth_fn``UserAuthFunction / EmailDomainFunction / OrganizationRoleFunction / OrganizationMembershipFunction / AllowAllAuthFunction`required

Any of

UserAuthFunction`UserAuthFunction`

`auth_fn``string`optional

Default`auth_user`

`user_id``string`required

EmailDomainFunction`EmailDomainFunction`

`auth_fn``string`optional

Default`auth_email_suffix`

`connection``string | null`optional

`email_domain``string`required

OrganizationRoleFunction`OrganizationRoleFunction`

`auth_fn``string`optional

Default`auth_organization_role`

`connection``string | null`optional

`roles_claim``string`required

`role``string`required

`organization_claim``string`required

`organization``string`required

OrganizationMembershipFunction`OrganizationMembershipFunction`

`auth_fn``string`optional

Default`auth_organization`

`connection``string | null`optional

`organization_claim``string`required

`organization``string`required

AllowAllAuthFunction`AllowAllAuthFunction`

`auth_fn``string`optional

Default`auth_allow_all`

## Responses

200Successful Response

Type: `unknown`

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
