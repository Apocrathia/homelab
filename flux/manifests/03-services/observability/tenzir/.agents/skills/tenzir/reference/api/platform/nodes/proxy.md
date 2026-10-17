---
title: "Proxy"
canonical: https://tenzir.com/docs/reference/api/platform/nodes/proxy
source: https://tenzir.com/docs/reference/api/platform/nodes/proxy.md
section: "Docs"
---

# Proxy

> post/user/proxy

post`/user/proxy`

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`node_id``string`required

`request_id``string | null`optional

`http``ProxiedRawHttpRequest`required

`path``string`required

`method``enum`required

Allowed values`GET``POST``DELETE``PUT``HEAD``PATCH``OPTIONS`

`api_version``integer`optional

Default`0`

`headers``map<string, string>`optional

Default`{}`

`body_base64``string | null`optional

## Responses

200Successful Response

`http``ProxiedHttpResponse`required

`code``integer`required

`body_json``Body Json | null`optional

`request_id``string`required

403`{"detail": "Invalid API Key"}` `{"detail": "Not permitted to access this tenant"}`

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
