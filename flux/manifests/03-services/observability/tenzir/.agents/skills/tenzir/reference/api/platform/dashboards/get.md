---
title: "Get"
canonical: https://tenzir.com/docs/reference/api/platform/dashboards/get
source: https://tenzir.com/docs/reference/api/platform/dashboards/get.md
section: "Docs"
---

# Get

> post/user/dashboard/get

post`/user/dashboard/get`

Get the latest revision of a dashboard for the given

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`dashboard_id``string`required

## Responses

200Successful Response

`metadata``DashboardRevisionMetadata`required

`update_time``string`required

`revision``string`required

`dashboard_id``string`required

`summary``Summary`required

`content``Content`required

403`{"detail": "Invalid API Key"}`

404`{"detail": "Dashboard not found"}`

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
