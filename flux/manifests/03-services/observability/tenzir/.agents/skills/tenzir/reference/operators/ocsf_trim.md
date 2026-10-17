---
title: "ocsf_trim"
canonical: https://tenzir.com/docs/reference/operators/ocsf_trim
source: https://tenzir.com/docs/reference/operators/ocsf_trim.md
section: "Docs"
---

# ocsf_trim

> Drops fields from OCSF events to reduce their size.

Drops fields from OCSF events to reduce their size.

```tql
ocsf_trim [drop_optional=bool, drop_recommended=bool]
```

## Description

The `ocsf_trim` operator uses intelligent analysis to determine which fields to remove from OCSF events, optimizing data size while preserving essential information.

Transform a field with the function

When the OCSF event lives in a field, such as `ocsf` next to `raw_data`, or in a list of events, consider the [`ocsf_trim`](https://tenzir.com/docs/reference/functions/ocsf_trim.md) function instead, as in `ocsf = ocsf_trim(ocsf)`. It leaves the rest of the event untouched and returns `null` for an event it cannot resolve rather than dropping the whole event.

### `drop_optional = bool`

If specified, explicitly controls whether to remove fields marked as optional in the OCSF schema. Otherwise, this decision is left to the operator itself.

### `drop_recommended = bool`

If specified, explicitly controls whether to remove fields marked as recommended in the OCSF schema. Otherwise, this decision is left to the operator itself.

## Examples

### Use intelligent field selection (default behavior)

```tql
from {
  class_uid: 3002,
  class_name: "Authentication",  // will be removed
  metadata: {
    version: "1.5.0",
  },
  user: {
    name: "alice",
    uid: "1000",
    display_name: "Alice",  // will be removed
  },
  auth_protocol: "Kerberos",
  status: "Success",
  status_id: 1,
}
ocsf_trim
```

```tql
{
  class_uid: 3002,
  metadata: {
    version: "1.5.0",
  },
  user: {
    name: "alice",
    uid: "1000",
  },
  auth_protocol: "Kerberos",
  status: "Success",
  status_id: 1,
}
```

### Explicitly remove optional fields only

```tql
from {
  class_uid: 1001,
  class_name: "File System Activity",
  metadata: {version: "1.5.0"},
  file: {
    name: "document.txt",
    path: "/home/user/document.txt",
    size: 1024,  // optional: will be removed
    type: "Regular File",  // optional: also removed
  },
  activity_id: 1,
}
ocsf_trim drop_optional=true, drop_recommended=false
```

```tql
{
  class_uid: 1001,
  metadata: {
    version: "1.5.0",
  },
  file: {
    name: "document.txt",
    path: "/home/user/document.txt",
  },
  activity_id: 1,
}
```

### Only keep required fields to minimize event size

```tql
from {
  class_uid: 4001,
  class_name: "Network Activity",
  metadata: {version: "1.5.0"},
  src_endpoint: {
    ip: "192.168.1.100",
    port: 443,
    hostname: "client.local",
  },
  severity: "Critical",
  severity_id: 5,
}
ocsf_trim drop_optional=true, drop_recommended=true
```

```tql
{
  class_uid: 4001,
  metadata: {
    version: "1.5.0",
  },
  severity_id: 5,
}
```

## See Also

* [`ocsf_trim`](https://tenzir.com/docs/reference/functions/ocsf_trim.md)
* [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md)
* [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
