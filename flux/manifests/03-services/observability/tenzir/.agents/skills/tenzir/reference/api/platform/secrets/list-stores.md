---
title: "List Stores"
canonical: https://tenzir.com/docs/reference/api/platform/secrets/list-stores
source: https://tenzir.com/docs/reference/api/platform/secrets/list-stores.md
section: "Docs"
---

# List Stores

> post/user/secrets/list-stores

post`/user/secrets/list-stores`

List the metadata of all configured secrets stores

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

## Responses

200Successful Response

`default_store_id``string`required

`stores``array<SecretStoreDetails>`required

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
