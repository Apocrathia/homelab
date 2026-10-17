---
title: "ocsf_derive"
canonical: https://tenzir.com/docs/reference/operators/ocsf_derive
source: https://tenzir.com/docs/reference/operators/ocsf_derive.md
section: "Docs"
---

# ocsf_derive

> Automatically assigns enum strings from their integer counterparts and vice versa.

Automatically assigns enum strings from their integer counterparts and vice versa.

```tql
ocsf_derive
```

## Description

The `ocsf_derive` operator performs bidirectional enum derivation for OCSF events by automatically assigning enum string values based on their integer counterparts and vice versa.

The operator preserves the original field order from the input record and appends derived fields to the end of the record that contains them.

In the future, this operator will also automatically assign computable values such as `type_uid` based on what is available in the event.

Transform a field with the function

When the OCSF event lives in a field, such as `ocsf` next to `raw_data`, or in a list of events, consider the [`ocsf_derive`](https://tenzir.com/docs/reference/functions/ocsf_derive.md) function instead, as in `ocsf = ocsf_derive(ocsf)`. It leaves the rest of the event untouched and returns `null` for an event it cannot resolve rather than dropping the whole event.

## Examples

### Integer to string

```tql
from {
  metadata: {
    version: "1.5.0",
  },
  class_uid: 1001,
  activity_id: 1,
}
ocsf_derive
```

```tql
{
  metadata: {
    version: "1.5.0",
  },
  class_uid: 1001,
  activity_id: 1,
  activity_name: "Create",
  class_name: "File System Activity",
}
```

### String to Integer

```tql
from {
  metadata: {
    version: "1.5.0",
  },
  class_uid: 1001,
  activity_name: "Read",
}
ocsf_derive
```

```tql
{
  metadata: {
    version: "1.5.0",
  },
  class_uid: 1001,
  activity_name: "Read",
  activity_id: 2,
  class_name: "File System Activity",
}
```

### Bidirectional enum validation

```tql
from {
  metadata: {
    version: "1.5.0",
  },
  class_uid: 1001,
  activity_id: 1,
  activity_name: "Delete",  // Inconsistent with activity_id=1
}
ocsf_derive
```

```tql
{
  metadata: {
    version: "1.5.0",
  },
  class_uid: 1001,
  activity_id: 1,
  activity_name: "Delete",
  class_name: "File System Activity",
}
```

This emits a warning about inconsistent values and preserves both original values without modification, allowing you to decide how to handle the conflict.

```plaintext
warning: found inconsistency between `activity_id` and `activity_name`
  |
  | ocsf_derive
  | ~~~~~~~~~~~~
  |
  = note: got 1 ("Create") and "Delete" (4)
```

## See Also

* [`ocsf_derive`](https://tenzir.com/docs/reference/functions/ocsf_derive.md)
* [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md)
* [`ocsf_trim`](https://tenzir.com/docs/reference/operators/ocsf_trim.md)
* [Map to OCSF](../../guides/normalize/map-to-ocsf.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
