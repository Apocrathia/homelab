---
title: "List Tenants"
canonical: https://tenzir.com/docs/reference/api/platform/admin/global-tenant-list
source: https://tenzir.com/docs/reference/api/platform/admin/global-tenant-list.md
section: "Docs"
---

# List Tenants

> get/admin/global-tenant-list

get`/admin/global-tenant-list`

Requires authentication`Admin Key`

## Responses

200Successful Response

Array items

`id``string`required

`owner``Owner`required

`namespace``string`required

`owner_id``string`required

`display_name``string | null`optional

`create_date_time``string<date-time>`required

`nodes``array<Node>`required

Array items

`name``string`required

`connection_id``string | null`optional

`key``string`required

`id``string`required

`create_date_time``string<date-time>`required

`last_known_version``string | null`optional

`last_known_features``string | null`optional

`destroy_date_time``string<date-time> | null`optional

`infra_id``string | null`optional

`demo``boolean`required

`ephemeral``boolean`optional

Default`false`

`auth_functions``array<UserAuthFunction / EmailDomainFunction / OrganizationRoleFunction / OrganizationMembershipFunction / AllowAllAuthFunction>`optional

Default`[]`

Array items

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

`name``string`optional

Default``

`icon_url``string`optional

Default``

`alerts``map<string, NodeOfflineAlert> | null`optional

Default`{}`

Map values

`type``string`optional

Default`node_offline`

`id``string`required

`node_id``string`required

`duration``integer`required

`webhook_url``string`required

`webhook_body``string`required

`metrics_opt_out``boolean`optional

Default`false`

`secret_stores``array<SecretStoreDetails>`optional

Default`[{"type":"tenzir","id":"default","name":"Tenzir Platform","is_writable":true,"is_deletable":false,"options":{}}]`

Array items

`type``enum`required

Allowed values`aws``tenzir`

`id``string`required

`name``string`required

`is_writable``boolean`required

`is_deletable``boolean`required

`options``AwsWorkspaceSecretOptions / BuiltinWorkspaceSecretOptions`required

Any of

AwsWorkspaceSecretOptions`AwsWorkspaceSecretOptions`

`region``string`required

`assumed_role_arn``string`required

`access_key``AwsAccessKey | null`optional

`access_key_id``string`required

`secret_access_key``string<password>`required

BuiltinWorkspaceSecretOptions`BuiltinWorkspaceSecretOptions`

`derived_key``DerivedKey | null`optional

`public_key``string`required

`keypath``string`required

`current_default_secret_store``string`optional

Default`default`

`node_registration_key``string | null`optional
