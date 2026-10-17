---
title: "Read multiple pipeline outputs"
canonical: https://tenzir.com/docs/reference/api/node/pipeline-output/read-multiple-pipeline-outputs
source: https://tenzir.com/docs/reference/api/node/pipeline-output/read-multiple-pipeline-outputs.md
section: "Docs"
---

# Read multiple pipeline outputs

> post/serve-multi

post`/serve-multi`

Reads events from multiple existing pipeline output streams. By default, the endpoint uses long polling (`timeout: 5s`) and returns as soon as at least one event is available (`min_events: 1`).

Requires authentication`TenzirToken`

## Request body`application/json`

`requests``array<object>`required

Array items

`serve_id``string`required

The output stream identifier returned when the pipeline was launched.

`continuation_token``string`required

The continuation token from the previous response for this output stream. Pass `00000000-0000-0000-0000-000000000000` for the initial request.

`schema``enum`optional

The schema representation to include in this output stream's response. Use `name_and_type` to report names and structural type IDs. Overrides the request-wide `schema` for this stream only.

Allowed values`exact``never``name_and_type`

`max_events``integer`optional

The maximum number of events to return across all requested output streams. The limit is split evenly across streams and rounded up when necessary.

Default`1024`

`min_events``integer`optional

The minimum number of events to wait for across all requested output streams before returning. The limit is split evenly across streams and rounded up when necessary.

Default`1`

`timeout``string`optional

The maximum time to spend on the request. Reaching the timeout returns the available events and is not an error. The timeout must not be greater than 10 seconds.

Default`5s`

`schema``enum`optional

The default schema representation to include in each response. Use `never` to omit definitions, or `name_and_type` to report names and structural type IDs. Individual output streams can override this with their own `schema` field.

Allowed values`exact``never``name_and_type`

Default`exact`

Example

```json
{
  "requests": [
    {
      "serve_id": "query-1",
      "continuation_token": "00000000-0000-0000-0000-000000000000"
    },
    {
      "serve_id": "query-2",
      "continuation_token": "340ce2j",
      "schema": "never"
    }
  ],
  "max_events": 1024,
  "min_events": 1,
  "timeout": "5s",
  "schema": "exact"
}
```

## Responses

200The response contains one entry for each requested output stream.

Map values

`next_continuation_token``string | null`required

The token to use when reading the next batch. The value is `null` when the pipeline reached a terminal state.

`state``enum`required

The pipeline state at the time of the request.

Allowed values`running``completed``failed`

`schemas``array<object>`optional

The schemas for the returned events. This field is omitted when the request sets `schema` to `never`.

Array items

`schema_id``string`optional

The schema identifier when `schema` is `exact`.

`type_id``string`optional

The structural type ID when `schema` is `name_and_type`.

`definition``unknown`optional

The structural definition in JSON format. In `name_and_type` mode, the schema name is omitted but chart attributes are retained when present.

`events``array<object>`required

The returned events.

Array items

`schema_id``string`optional

The schema identifier when `schema` is `exact` or `never`.

`schema``string`optional

The schema name when `schema` is `name_and_type`.

`type_id``string`optional

The structural type ID when `schema` is `name_and_type`. Matches `type_id(this)` for the row.

`data``object`optional

The event data in JSON format.

Example

```json
{
  "query-1": {
    "next_continuation_token": "340ce2j",
    "state": "running",
    "schemas": [],
    "events": [
      {
        "schema_id": "c631d301e4b18f4",
        "data": {
          "timestamp": "2023-04-26T12:00:00Z",
          "schema": "zeek.conn",
          "events": 50
        }
      }
    ]
  },
  "query-2": {
    "next_continuation_token": null,
    "state": "completed",
    "schemas": [],
    "events": []
  }
}
```

400The request body is invalid.

`error``string`required

The error message.
