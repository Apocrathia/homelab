---
title: "Shape records"
canonical: https://tenzir.com/docs/guides/shape/shape-records
source: https://tenzir.com/docs/guides/shape/shape-records.md
section: "Docs"
---

# Shape records

> Records (objects) contain key-value pairs. This guide shows you how to work with records - accessing fields, extracting keys and values, combining fragments, and transforming values.

Records (objects) contain key-value pairs. This guide shows you how to work with records - accessing fields, extracting keys and values, combining fragments, and transforming values.

## Access record fields

Get values using dot notation or brackets:

```tql
from {
  user: {
    name: "Alice",
    age: 30,
    address: {
      city: "NYC",
      zip: "10001"
    }
  }
}
name = user.name
city = user.address.city
zip = user["address"]["zip"]
has_email = user.has("email")
```

```tql
{
  user: {
    name: "Alice",
    age: 30,
    address: {city: "NYC", zip: "10001"}
  },
  name: "Alice",
  city: "NYC",
  zip: "10001",
  has_email: false
}
```

## Get keys and values

Use [`keys`](https://tenzir.com/docs/reference/functions/keys.md) to extract the field names and [`values`](https://tenzir.com/docs/reference/functions/values.md) to extract the field values. Both list the fields in the same order:

```tql
from {
  config: {
    host: "localhost",
    port: 8080,
    ssl: true
  }
}
field_names = config.keys()
field_values = config.values()
num_fields = config.keys().length()
```

```tql
{
  config: {host: "localhost", port: 8080, ssl: true},
  field_names: ["host", "port", "ssl"],
  field_values: ["localhost", 8080, true],
  num_fields: 3
}
```

Each value keeps its type, so one list can mix strings, numbers, `null`, lists, and records. Both functions look only at top-level fields: a dot in a field name stays part of the key, and nested records and lists stay intact.

When you need every name together with its value, use [`entries`](https://tenzir.com/docs/reference/functions/entries.md). It returns a list of records with a `key` and a `value` field, one for each field:

```tql
from {
  config: {
    host: "localhost",
    port: 8080,
    ssl: true
  }
}
entries = config.entries()
```

```tql
{
  config: {host: "localhost", port: 8080, ssl: true},
  entries: [
    {key: "host", value: "localhost"},
    {key: "port", value: 8080},
    {key: "ssl", value: true}
  ]
}
```

Use `entries` to process the fields of a record with list functions such as [`map`](https://tenzir.com/docs/reference/functions/map.md) and [`where`](https://tenzir.com/docs/reference/functions/where.md), as the following sections show.

## Build records from dynamic field names

When field names arrive as data, use [`collect_record`](https://tenzir.com/docs/reference/functions/collect_record.md) to turn key/value entries into a record. For example, convert an attribute list from an API into named fields without knowing the attribute names in advance.

```tql
from {
  attributes: [
    {
      key: "service",
      value: "ssh",
    },
    {
      key: "port",
      value: 22,
    },
    {
      key: "enabled",
      value: true,
    },
  ],
}
select config=collect_record(attributes)
```

```tql
{
  config: {
    service: "ssh",
    port: 22,
    enabled: true,
  },
}
```

Each entry must have exactly the fields `key` and `value` to use this form. Two-element lists such as `["port", 22]` work too. Other records contribute their fields directly. If a key occurs more than once, its last value wins, including `null`.

To go the other way, [`entries`](https://tenzir.com/docs/reference/functions/entries.md) turns a record into these entries, so `config.entries().collect_record()` returns `config`. Separate lists work too: `collect_record(config.keys(), config.values())` returns `config` as well.

## Combine records with spread

Use the spread operator `...` to combine records. Spread keeps the resulting record visible where you construct it, and lets you mix existing fragments with literals or computed fields. Later fields overwrite earlier fields, so put defaults first and overrides last:

```tql
from {
  defaults: {host: "localhost", port: 80, ssl: false},
  custom: {port: 8080, ssl: true}
}
service = {
  ...defaults,
  ...custom,
  debug: true,
}
```

```tql
{
  defaults: {host: "localhost", port: 80, ssl: false},
  custom: {port: 8080, ssl: true},
  service: {
    host: "localhost",
    port: 8080,
    ssl: true,
    debug: true
  }
}
```

Use optional access when a record fragment may be missing. If the spread expression evaluates to `null`, it contributes no fields, so an explicit `else {}` fallback is not necessary:

```tql
from {account: {id: 1, name: "Alice"}}
user = {
  ...account,
  ...account.profile?,
  active: true,
}
```

```tql
{
  account: {
    id: 1,
    name: "Alice",
  },
  user: {
    id: 1,
    name: "Alice",
    active: true,
  },
}
```

The [`merge`](https://tenzir.com/docs/reference/functions/merge.md) function returns the same result for two records, including `null` fragments, but prefer spread in transformation code when you construct the resulting record.

## Transform record values

To apply the same expression to every value of a record, without naming the fields, map over the [`entries`](https://tenzir.com/docs/reference/functions/entries.md) and build the record again with [`collect_record`](https://tenzir.com/docs/reference/functions/collect_record.md). Return a `[key, value]` pair for each entry and keep the key to preserve the field names:

```tql
from {
  sizes: {
    read: 2048,
    write: 4096,
    delete: 512
  }
}
kib = sizes.entries().map(e => [e.key, e.value / 1024]).collect_record()
```

```tql
{
  sizes: {read: 2048, write: 4096, delete: 512},
  kib: {read: 2.0, write: 4.0, delete: 0.5}
}
```

The fields keep their order, and this works for any number of fields. To rename the fields instead of changing their values, use [`map_keys`](https://tenzir.com/docs/reference/functions/map_keys.md).

## Filter record fields

Keep explicit fields by constructing a new record. Use [`select_matching`](https://tenzir.com/docs/reference/functions/select_matching.md) and [`drop_matching`](https://tenzir.com/docs/reference/functions/drop_matching.md) when field names follow a pattern:

```tql
from {
  user: {
    id: 123,
    name: "Alice",
    email: "alice@example.com",
    password: "secret",
    api_key: "xyz123"
  }
}
public_info = {
  id: user.id,
  name: user.name,
  email: user.email
}
contact = {
  name: user.name,
  email: user.email
}
credentials = user.select_matching("(password|api_key)$")
safe_user = user.drop_matching("(password|api_key)$")
```

```tql
{
  user: {
    id: 123,
    name: "Alice",
    email: "alice@example.com",
    password: "secret",
    api_key: "xyz123"
  },
  public_info: {
    id: 123,
    name: "Alice",
    email: "alice@example.com"
  },
  contact: {
    name: "Alice",
    email: "alice@example.com"
  },
  credentials: {
    password: "secret",
    api_key: "xyz123"
  },
  safe_user: {
    id: 123,
    name: "Alice",
    email: "alice@example.com"
  }
}
```

The matching functions inspect only top-level field names on the record you call them on. They don’t recurse into nested records.

To keep fields based on their value instead of their name, filter the [`entries`](https://tenzir.com/docs/reference/functions/entries.md) and build the record again with [`collect_record`](https://tenzir.com/docs/reference/functions/collect_record.md). The following example drops fields that are `null` or empty strings:

```tql
from {
  user: {
    name: "Alice",
    nickname: "",
    email: null,
    city: "NYC"
  }
}
non_empty = user.entries().where(e => e.value != null and e.value != "").collect_record()
```

```tql
{
  user: {name: "Alice", nickname: "", email: null, city: "NYC"},
  non_empty: {name: "Alice", city: "NYC"}
}
```

To remove only the `null` fields, use [`drop_null_fields`](https://tenzir.com/docs/reference/functions/drop_null_fields.md).

## See Also

* [`drop_matching`](https://tenzir.com/docs/reference/functions/drop_matching.md)
* [`entries`](https://tenzir.com/docs/reference/functions/entries.md)
* [`keys`](https://tenzir.com/docs/reference/functions/keys.md)
* [`merge`](https://tenzir.com/docs/reference/functions/merge.md)
* [`select_matching`](https://tenzir.com/docs/reference/functions/select_matching.md)
* [`values`](https://tenzir.com/docs/reference/functions/values.md)
* [Shape lists](shape-lists.md)
* [Filter and select data](../optimize/filter-and-select-data.md)
* [Transform values](transform-values.md)
* [Reshape complex data](reshape-complex-data.md)
