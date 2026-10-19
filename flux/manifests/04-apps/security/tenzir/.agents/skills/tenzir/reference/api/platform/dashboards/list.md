---
title: "List"
canonical: https://tenzir.com/docs/reference/api/platform/dashboards/list
source: https://tenzir.com/docs/reference/api/platform/dashboards/list.md
section: "Docs"
---

# List

> post/user/dashboard/list

post`/user/dashboard/list`

List the metadata of all dashboards for the given

To get the full content of a dashboard, use the `/get` enpoint. The returned `revision` fields can be used to perform updates using the `/store` endpoint.

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

## Responses

200Successful Response

`dashboards``array<DashboardRevisionSummary>`required

Array items

`metadata``DashboardRevisionMetadata`required

`update_time``string`required

`revision``string`required

`dashboard_id``string`required

`summary``Summary`required

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
