---
title: "Store"
canonical: https://tenzir.com/docs/reference/api/platform/dashboards/store
source: https://tenzir.com/docs/reference/api/platform/dashboards/store.md
section: "Docs"
---

# Store

> post/user/dashboard/store

post`/user/dashboard/store`

Store a new dashboard revision.

Multiple dashboards can be created for any given Dashboard ids only need to be unique per

The data stored can be any free form json. It is splitted into:

* summary, a lightweight summarized version of the data that is also returned when calling the `/list` endpoint
* the content, which holds the bulk of the dashboard description and that can be retrieved by calling the `/get` endpoint

The total size of the data stored for each dashboard must not exceed a few hundred kilobytes, otherwise the backing stores might present degraded performances or hit quotas.

The revision of the dashboard is an arbitrary string that is used to ensure no concurrent updates are performed. For new dashboards, it should be left empty. For existing endpoints, it is obtained from the response of the `/list` or `/get` endpoints.

Requires authentication`User Key`

## Request body`application/json`

`tenant_id``string`required

`dashboard_id``string`required

`revision``string | null`optional

`content``Content`required

`summary``Summary`required

## Responses

200Successful Response

`update_time``string`required

`revision``string`required

`dashboard_id``string`required

403`{"detail": "Invalid API Key"}`

409`{"detail": "Dashboard revision changed"}`

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
