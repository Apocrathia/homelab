---
title: "Spawn Node"
canonical: https://tenzir.com/docs/reference/api/platform/admin/spawn-node
source: https://tenzir.com/docs/reference/api/platform/admin/spawn-node.md
section: "Docs"
---

# Spawn Node

> post/admin/spawn-node

post`/admin/spawn-node`

Requires authentication`Admin Key`

## Request body`application/json`

`tenant_id``string`required

`image``string | null`optional

`node_name``string`required

`memory``integer`optional

Default`16384`

`lifetime``integer`optional

Default`360`

## Responses

200Successful Response

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
