---
title: "Transparent Proxy"
canonical: https://tenzir.com/docs/reference/api/platform/nodes/node-proxy-delete
source: https://tenzir.com/docs/reference/api/platform/nodes/node-proxy-delete.md
section: "Docs"
---

# Transparent Proxy

> delete/user/node-proxy/{tenantid}/{nodeid}/{httppath}

delete`/user/node-proxy/{tenant_id}/{node_id}/{http_path}`

Requires authentication`User Key`

## Path parameters

`tenant_id``string`required

`node_id``string`required

`http_path``string`required

## Header parameters

`x-tenzir-request-id``string | null`optional

## Responses

200Successful Response

Type: `unknown`

403`{"detail": "Invalid API Key"}`

404`{"detail": "Tenant not found"}` `{"detail": "Node not found"}`

408`{"detail": "Proxy timed out"}`

410`{"detail": "Node not connected"}`

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
