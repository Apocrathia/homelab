---
title: "ocsf_cast"
canonical: https://tenzir.com/docs/reference/operators/ocsf_cast
source: https://tenzir.com/docs/reference/operators/ocsf_cast.md
section: "Docs"
---

# ocsf_cast

> Casts incoming events to their OCSF type.

Casts incoming events to their OCSF type.

```tql
ocsf_cast [encode_variants=bool, null_fill=bool, timestamp_to_ms=bool]
```

## Description

The `ocsf_cast` operator casts incoming events to their corresponding OCSF event class type. Four fields determine the resulting type: `metadata.version`, `metadata.profiles`, `metadata.extensions`, and `class_uid`. The operator casts events sharing the same values for these fields to the same type. For the available stable and development schema versions, see the [OCSF compatibility overview](https://tenzir.com/solutions/use-cases/data-normalization-ocsf.md#data-normalization-ocsf-version). Tenzir supports all profiles and event classes. Currently, we limit extensions to those versioned with OCSF, including the `win` and `linux` extensions.

The operator performs these steps:

* Adds optional fields that don’t exist in the original event with a `null` value
* Emits warnings for extra fields that shouldn’t exist and drops them
* Encodes free-form objects (such as `unmapped`) using their JSON representation
* Assigns `@name` based on the class name, for example: `ocsf.dns_activity`

OCSF defines logical types like `timestamp_t` and `subnet_t` that map to physical base types - here `Long` and `String`. Encodings without native support for a logical type should use the base type for maximum compatibility. Tenzir has native types for many OCSF logical types (for example, `time` for `timestamp_t`), but you may still need the physical base type when working with downstream tools. The operator provides control knobs like `timestamp_to_ms` to convert values to their base type representation. This option converts timestamp values to milliseconds (a number type) even though Tenzir natively supports timestamps.

Fields that are part of recursive object relationships exhibit one level of recursion. For example, you can work with `process.parent_process`, but the nested object `process.parent_process.parent_process` does not exist.

Transform a field with the function

When the OCSF event lives in a field, such as `ocsf` next to `raw_data`, or in a list of events, consider the [`ocsf_cast`](https://tenzir.com/docs/reference/functions/ocsf_cast.md) function instead, as in `ocsf = ocsf_cast(ocsf)`. It leaves the rest of the event untouched and returns `null` for an event it cannot resolve rather than dropping the whole event.

### `encode_variants = bool`

Setting this option to `true` emits free-form objects such as `unmapped` as JSON strings instead of records. Use it when downstream systems expect a JSON representation rather than a nested structure.

When `false`, the operator keeps these fields as records, which may lead to schema drift between events of the same class if the free-form objects differ. Prefer using `unmapped.parse_json()` to project specific fields when possible.

Defaults to `false`.

### `null_fill = bool`

When `true`, the operator back-fills optional fields that do not exist in the input with `null` values. This yields schema-complete events for sinks that expect a full OCSF record. Leave it at the default `false` to avoid materializing unused fields.

### `timestamp_to_ms = bool`

Converts `time` fields representing OCSF `timestamp` fields into integer values, counting milliseconds since UNIX epoch.

Defaults to `false`.

## Examples

### Cast a single pre-defined event

```tql
from {
  class_uid: 4001,
  class_name: "Network Activity",
  metadata: {
    version: "1.5.0",
  },
  unmapped: {
    foo: 1,
    bar: 2,
  },
  // … some more fields
}
ocsf_cast null_fill=true encode_variants=true
```

```tql
{
  class_uid: 4001,
  class_name: "Network Activity",
  metadata: {
    version: "1.5.0",
    // … all other metadata fields set to `null`
  },
  unmapped: "{\"foo\": 1, \"bar\": 2}",
  // … other fields (with `null` if they didn't exist before)
}
```

### Homogenize incoming events and send to Clickhouse

```tql
subscribe "ocsf"
where class_name == "Network Activity" and metadata.version == "1.5.0"
ocsf_cast null_fill=true
to_clickhouse table="network_activity", mode="append"
```

Create the `network_activity` table in ClickHouse first. The nulls that `null_fill=true` adds carry no type, so [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) cannot infer columns for them when it creates a table.

## See Also

* [`ocsf_cast`](https://tenzir.com/docs/reference/functions/ocsf_cast.md)
* [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md)
* [`ocsf_trim`](https://tenzir.com/docs/reference/operators/ocsf_trim.md)
* [Map to OCSF](../../guides/normalize/map-to-ocsf.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
