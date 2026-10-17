---
title: "ocsf_trim"
canonical: https://tenzir.com/docs/reference/functions/ocsf_trim
source: https://tenzir.com/docs/reference/functions/ocsf_trim.md
section: "Docs"
---

# ocsf_trim

> Drops fields from an OCSF event record to reduce its size.

Drops fields from an OCSF event record to reduce its size.

```tql
ocsf_trim(x:record, [drop_optional=bool, drop_recommended=bool]) -> record
```

## Description

The `ocsf_trim` function removes fields from the OCSF event `x` based on their requirement level in the OCSF schema. It applies the same rules as the [`ocsf_trim`](https://tenzir.com/docs/reference/operators/ocsf_trim.md) operator.

Use the function when the OCSF event lives in a field rather than at the top level of the event, for example next to `raw_data` in an envelope, or in a list of events that you process with [`map`](https://tenzir.com/docs/reference/functions/map.md). Use the operator when the whole event is the OCSF event.

Unlike the operator, which drops events whose OCSF version or class it cannot resolve, the function returns `null` with a warning and keeps the rest of the event. It also returns `null` with a warning when `x` is not a record, and returns `null` without a warning when `x` is `null`.

### `x: record`

The OCSF event to trim.

### `drop_optional = bool (optional)`

Whether to remove fields that the OCSF schema marks as optional.

Defaults to `true`.

### `drop_recommended = bool (optional)`

Whether to remove fields that the OCSF schema marks as recommended.

Defaults to `false`.

## Examples

### Trim an OCSF event in a field

```tql
from {
  raw_data: "…",
  ocsf: {
    class_uid: 4001,
    metadata: {version: "1.5.0"},
    activity_id: null,
    message: "",
    enrichments: [],
    src_endpoint: {},
    unmapped: {custom: null, empty: []},
  },
}
ocsf = ocsf_trim(ocsf)
```

```tql
{
  raw_data: "…",
  ocsf: {
    class_uid: 4001,
    metadata: {
      version: "1.5.0",
    },
    activity_id: null,
    message: "",
    src_endpoint: {},
  },
}
```

### Compare trimming levels side by side

```tql
from {
  ocsf: {
    class_uid: 4001,
    metadata: {version: "1.5.0"},
    activity_id: null,
    message: "",
    src_endpoint: {},
  },
}
retained = ocsf_trim(ocsf, drop_optional=false)
required = ocsf_trim(ocsf, drop_optional=false, drop_recommended=true)
select retained, required
```

```tql
{
  retained: {
    class_uid: 4001,
    metadata: {
      version: "1.5.0",
    },
    activity_id: null,
    message: "",
    src_endpoint: {},
  },
  required: {
    class_uid: 4001,
    metadata: {
      version: "1.5.0",
    },
    activity_id: null,
  },
}
```

## See Also

* [`ocsf_trim`](https://tenzir.com/docs/reference/operators/ocsf_trim.md)
* [`ocsf_cast`](https://tenzir.com/docs/reference/functions/ocsf_cast.md)
* [`ocsf_derive`](https://tenzir.com/docs/reference/functions/ocsf_derive.md)
* [Map to OCSF](../../guides/normalize/map-to-ocsf.md)
