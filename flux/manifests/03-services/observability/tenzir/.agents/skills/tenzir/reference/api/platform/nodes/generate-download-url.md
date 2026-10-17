---
title: "Generate Download Url"
canonical: https://tenzir.com/docs/reference/api/platform/nodes/generate-download-url
source: https://tenzir.com/docs/reference/api/platform/nodes/generate-download-url.md
section: "Docs"
---

# Generate Download Url

> post/user/generate-download-url

post`/user/generate-download-url`

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`expiration``number`optional

Default`3600`

`filename``string | null`optional

`usage``enum`optional

Allowed values`nodes_upload_nodes_download``nodes_upload_frontend_download``nodes_download_frontend_upload``frontend_upload_frontend_download`

Default`frontend_upload_frontend_download`

## Responses

200Successful Response

`upload_url``string`required

`download_url``string`required

403`{"detail": "Invalid API Key"}` `{"detail": "Not permitted to access this tenant"}`

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
