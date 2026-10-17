---
title: "ocsf_derive"
canonical: https://tenzir.com/docs/reference/functions/ocsf_derive
source: https://tenzir.com/docs/reference/functions/ocsf_derive.md
section: "Docs"
---

# ocsf_derive

> Assigns enum strings of an OCSF event record from their integer counterparts and vice versa.

Assigns enum strings of an OCSF event record from their integer counterparts and vice versa.

```tql
ocsf_derive(x:record) -> record
```

## Description

The `ocsf_derive` function performs bidirectional enum derivation on the OCSF event `x`. It applies the same rules as the [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md) operator: it fills a missing enum string such as `activity_name` from its integer sibling `activity_id` and vice versa, recurses into nested records and lists, and warns about inconsistent pairs without modifying them. Existing fields keep their position, and the function appends derived fields to the end of their record.

Use the function when the OCSF event lives in a field rather than at the top level of the event, for example next to `raw_data` in an envelope, or in a list of events that you process with [`map`](https://tenzir.com/docs/reference/functions/map.md). Use the operator when the whole event is the OCSF event.

Unlike the operator, which drops events whose OCSF version or class it cannot resolve, the function returns `null` with a warning and keeps the rest of the event. It also returns `null` with a warning when `x` is not a record, and returns `null` without a warning when `x` is `null`.

### `x: record`

The OCSF event to complete.

## Examples

### Derive enum siblings in a field

```tql
from {
  raw_data: "…",
  ocsf: {
    class_uid: 1001,
    metadata: {version: "1.5.0"},
    activity_id: 1,
  },
}
ocsf = ocsf_derive(ocsf)
```

```tql
{
  raw_data: "…",
  ocsf: {
    class_uid: 1001,
    metadata: {
      version: "1.5.0",
    },
    activity_id: 1,
    activity_name: "Create",
    class_name: "File System Activity",
  },
}
```

### Derive enum siblings in a list of events

```tql
from {
  events: [
    {class_uid: 1001, metadata: {version: "1.5.0"}, activity_name: "Read"},
    {class_uid: 4003, metadata: {version: "1.5.0"}, answers: [{flag_ids: [1, 3]}]},
  ],
}
events = events.map(x => ocsf_derive(x))
```

```tql
{
  events: [
    {
      class_uid: 1001,
      metadata: {
        version: "1.5.0",
      },
      activity_name: "Read",
      activity_id: 2,
      class_name: "File System Activity",
    },
    {
      class_uid: 4003,
      metadata: {
        version: "1.5.0",
      },
      answers: [
        {
          flag_ids: [
            1,
            3,
          ],
          flags: [
            "Authoritative Answer",
            "Recursion Desired",
          ],
        },
      ],
      class_name: "DNS Activity",
    },
  ],
}
```

## See Also

* [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md)
* [`ocsf_cast`](https://tenzir.com/docs/reference/functions/ocsf_cast.md)
* [`ocsf_trim`](https://tenzir.com/docs/reference/functions/ocsf_trim.md)
* [Map to OCSF](../../guides/normalize/map-to-ocsf.md)
