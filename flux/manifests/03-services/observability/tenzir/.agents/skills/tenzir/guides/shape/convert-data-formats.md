---
title: "Convert data formats"
canonical: https://tenzir.com/docs/guides/shape/convert-data-formats
source: https://tenzir.com/docs/guides/shape/convert-data-formats.md
section: "Docs"
---

# Convert data formats

> Data comes in many formats. Converting between formats is essential for integration, export, and interoperability. This guide shows you how to transform data between JSON, CSV, YAML, and other common formats using TQL’s print functions.

Data comes in many formats. Converting between formats is essential for integration, export, and interoperability. This guide shows you how to transform data between JSON, CSV, YAML, and other common formats using TQL’s print functions.

## Print to JSON

JSON is the most common data exchange format. Use [`print_json`](https://tenzir.com/docs/reference/functions/print_json.md) to convert any data to JSON strings:

```tql
from {
  user: {
    name: "Alice",
    age: 30,
    roles: ["admin", "user"],
    email: null,
    metadata: {}
  }
}
json_string = user.print_json()
```

```tql
{
  user: {
    name: "Alice",
    age: 30,
    roles: ["admin", "user"],
    email: null,
    metadata: {}
  },
  json_string: "{\n  \"name\": \"Alice\",\n  \"age\": 30,\n  \"roles\": [\n    \"admin\",\n    \"user\"\n  ],\n  \"email\": null,\n  \"metadata\": {}\n}",
  json_stripped: "{\n  \"name\": \"Alice\",\n  \"age\": 30,\n  \"roles\": [\n    \"admin\",\n    \"user\"\n  ]\n}"
}
```

Print & Write Siblings

Many `print_*` functions have a `write_*` sibling operator that operate on entire events instead of values within events. The `write_*` operators return *bytes* instead of events. As such, you need to pair it with an [output operator that accepts bytes](../../reference/operators.md#outputs).

The [`print_json`](https://tenzir.com/docs/reference/functions/print_json.md) function has [`write_json`](https://tenzir.com/docs/reference/operators/write_json.md) as sibling operator to format the entire event stream as JSON:

```plaintext
from {
  user: {
    name: "Alice",
    age: 30,
    roles: ["admin", "user"],
    email: null,
    metadata: {}
  }
}
write_json
```

```json
{
  "user": {
    "name": "Alice",
    "age": 30,
    "roles": [
      "admin",
      "user"
    ],
    "email": null,
    "metadata": {}
  }
}
```

### Print newline-delimited JSON

For streaming data, use [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md):

```tql
from {
  events: [
    {type: "login", user: "alice"},
    {type: "view", user: "bob"},
    {type: "logout", user: "alice"}
  ]
}
ndjson = events.print_ndjson()
```

```tql
{
  events: [
    {
      type: "login",
      user: "alice",
    },
    {
      type: "view",
      user: "bob",
    },
    {
      type: "logout",
      user: "alice",
    },
  ],
  ndjson: "[{\"type\":\"login\",\"user\":\"alice\"},{\"type\":\"view\",\"user\":\"bob\"},{\"type\":\"logout\",\"user\":\"alice\"}]",
}
```

And with the [`write_ndjson`](https://tenzir.com/docs/reference/operators/write_ndjson.md) dual:

```tql
from {
  events: [
    {type: "login", user: "alice"},
    {type: "view", user: "bob"},
    {type: "logout", user: "alice"}
  ]
}
write_ndjson
```

```json
{"events":[{"type":"login","user":"alice"},{"type":"view","user":"bob"},{"type":"logout","user":"alice"}]}
```

## Print to CSV

Convert tabular data to CSV with [`print_csv`](https://tenzir.com/docs/reference/functions/print_csv.md):

```tql
from {name: "Alice", age: 30, city: "NYC"},
     {name: "Bob", age: 25, city: "SF"},
     {name: "Charlie", age: 35, city: "LA"}
csv_data = this.print_csv()
```

```tql
{
  name: "Alice",
  age: 30,
  city: "NYC",
  csv_data: "Alice,30,NYC",
}
{
  name: "Bob",
  age: 25,
  city: "SF",
  csv_data: "Bob,25,SF",
}
{
  name: "Charlie",
  age: 35,
  city: "LA",
  csv_data: "Charlie,35,LA",
}
```

You get an extra header with [`write_csv`](https://tenzir.com/docs/reference/operators/write_csv.md) dual:

```tql
from {name: "Alice", age: 30, city: "NYC"},
     {name: "Bob", age: 25, city: "SF"},
     {name: "Charlie", age: 35, city: "LA"}
csv_data = this.print_csv()
```

```csv
name,age,city
Alice,30,NYC
Bob,25,SF
Charlie,35,LA
```

## Print to TSV and SSV

For tab-separated and space-separated values, use [`print_tsv`](https://tenzir.com/docs/reference/functions/print_tsv.md) and [`print_ssv`](https://tenzir.com/docs/reference/functions/print_ssv.md):

```tql
from {
  record: {id: 1, name: "Alice Smith", status: "active"}
}
tsv = record.print_tsv()
ssv = record.print_ssv()
```

```tql
{
  record: {
    id: 1,
    name: "Alice Smith",
    status: "active",
  },
  tsv: "1\tAlice Smith\tactive",
  ssv: "1 \"Alice Smith\" active",
}
```

With [`write_tsv`](https://tenzir.com/docs/reference/operators/write_tsv.md):

```tql
from {
  record: {id: 1, name: "Alice Smith", status: "active"}
}
write_tsv
```

```txt
record.id record.name record.status
1 Alice Smith active
```

Note the additional double quotes with [`write_ssv`](https://tenzir.com/docs/reference/operators/write_ssv.md) because space is overloaded as field separator.

```tql
from {
  record: {id: 1, name: "Alice Smith", status: "active"}
}
write_ssv
```

```txt
record.id record.name record.status
1 "Alice Smith" active
```

## Print to custom-separated values

If none of the existing \*SV formats meet your needs, the [`print_xsv`](https://tenzir.com/docs/reference/functions/print_xsv.md) function to customize field separator, list separator, and what to render for absent values:

Use [`print_xsv`](https://tenzir.com/docs/reference/functions/print_xsv.md) for custom separators:

```tql
from {
  item: {sku: "A001", desc: "Widget", price: 9.99, scores: [42, 84], details: null}
}
pipe_separated = item.print_xsv(field_separator=" ⏸︎ ",
                                list_separator=" ⌘ ",
                                null_value="∅")
```

And for the entire event stream via [`write_xsv`](https://tenzir.com/docs/reference/operators/write_xsv.md):

```tql
{
  item: {
    sku: "A001",
    desc: "Widget",
    price: 9.99,
    scores: [
      42,
      84,
    ],
    details: null,
  },
  pipe_separated: "A001 ⏸︎ Widget ⏸︎ 9.99 ⏸︎ 42 ⌘ 84 ⏸︎ ∅",
}
```

```txt
item.sku ⏸︎ item.desc ⏸︎ item.price ⏸︎ item.scores ⏸︎ item.details
A001 ⏸︎ Widget ⏸︎ 9.99 ⏸︎ 42 ⌘ 84 ⏸︎ ∅
```

## Print to YAML

Convert data to YAML format with [`print_yaml`](https://tenzir.com/docs/reference/functions/print_yaml.md):

```tql
from {
  config: {
    server: {
      host: "localhost",
      port: 8080,
      ssl: true
    },
    features: ["auth", "api", "websocket"]
  }
}
yaml = config.print_yaml()
```

```tql
{
  config: {...},
  yaml: "server:\n  host: localhost\n  port: 8080\n  ssl: true\nfeatures:\n  - auth\n  - api\n  - websocket"
}
```

Turn the entire event stream into a YAML document stream via [`write_yaml`](https://tenzir.com/docs/reference/operators/write_yaml.md):

```tql
from {
  config: {
    server: {
      host: "localhost",
      port: 8080,
      ssl: true
    },
    features: ["auth", "api", "websocket"]
  }
}
write_yaml
```

```yaml
---
config:
  server:
    host: localhost
    port: 8080
    ssl: true
  features:
    - auth
    - api
    - websocket
...
```

## Print key-value pairs

Convert records to key-value format with [`print_kv`](https://tenzir.com/docs/reference/functions/print_kv.md):

```tql
from {
  event: {
    timestamp: "2024-01-15T10:30:00",
    level: "ERROR",
    message: "Connection failed",
    code: 500
  }
}
kv_default = event.print_kv()
kv_custom = event.print_kv(value_separator=": ", field_separator=" | ")
```

```tql
{
  event: {
    timestamp: "2024-01-15T10:30:00",
    level: "ERROR",
    message: "Connection failed",
    code: 500,
  },
  kv_default: "timestamp=2024-01-15T10:30:00 level=ERROR message=\"Connection failed\" code=500",
  kv_custom: "timestamp: 2024-01-15T10:30:00 | level: ERROR | message: Connection failed | code: 500",
}
```

## Print security formats

### CEF (Common Event Format)

Print security events in CEF format with [`print_cef`](https://tenzir.com/docs/reference/functions/print_cef.md):

```tql
from {
  extension: {
    src: "10.0.0.1",
    dst: "192.168.1.1",
    spt: 12345,
    dpt: 22
  }
}
cef = extension.print_cef(
  cef_version="0",
  device_vendor="Security Corp",
  device_product="Firewall",
  device_version="1.0",
  signature_id="100",
  name="Port Scan Detected",
  severity="7"
)
```

```tql
{
  extension: {src: "10.0.0.1", dst: "192.168.1.1", spt: 12345, dpt: 22},
  cef: "CEF:0|Security Corp|Firewall|1.0|100|Port Scan Detected|7|src=10.0.0.1 dst=192.168.1.1 spt=12345 dpt=22"
}
```

Turn print functions into write operators

There’s no `write_cef` sibling operator, but you use a combination of [`select`](https://tenzir.com/docs/reference/operators/select.md) and [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md). For example:

```tql
from { ... }
cef = print_cef(...)
select cef
write_lines
```

You could now add [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md) or use [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md) as a printing subpipeline in a destination operator.

### LEEF (Log Event Extended Format)

Print in IBM QRadar’s LEEF format with [`print_leef`](https://tenzir.com/docs/reference/functions/print_leef.md):

```tql
from {
  attributes: {
    srcIP: "10.0.0.5",
    dstIP: "192.168.1.10",
    action: "BLOCK"
  }
}
leef = attributes.print_leef(
  vendor="Security Corp",
  product_name="IDS",
  product_version="2.0",
  event_class_id="200"
)
```

```tql
{
  attributes: {srcIP: "10.0.0.5", dstIP: "192.168.1.10", action: "BLOCK"},
  leef: "LEEF:2.0|Security Corp|IDS|2.0|200|srcIP=10.0.0.5|dstIP=192.168.1.10|action=BLOCK"
}
```

As above, add `select leef | write_lines` to create line-based LEEF output.

## Convert between formats

Chain parsing and printing to convert between formats:

```tql
from {
  json_data: "{\"name\":\"Alice\",\"age\":30,\"city\":\"NYC\"}"
}
// JSON to CSV
set parsed = json_data.parse_json()
set as_csv = parsed.print_csv()


// JSON to YAML
set as_yaml = parsed.print_yaml()


// JSON to Key-Value
set as_kv = parsed.print_kv()
```

```tql
{
  json_data: "{\"name\":\"Alice\",\"age\":30,\"city\":\"NYC\"}",
  parsed: {
    name: "Alice",
    age: 30,
    city: "NYC",
  },
  as_csv: "Alice,30,NYC",
  as_yaml: "name: Alice\nage: 30\ncity: NYC",
  as_kv: "name=Alice age=30 city=NYC",
}
```

## Best practices

1. **Choose appropriate formats**:

   * JSON for APIs and modern systems
   * CSV for spreadsheets and analysis
   * YAML for configuration files
   * Key-value for logging systems

2. **Handle special characters**: Be aware of how each format handles quotes, newlines, and separators

3. **Consider file size**: JSON is verbose, CSV is compact

4. **Preserve data types**: Some formats (CSV) lose type information

5. **Use proper escaping**: Let print functions handle escaping automatically

## See also

* [Parse string fields](../parse/parse-string-fields.md)
* [Shape lists](shape-lists.md)
* [Shape records](shape-records.md)
* [Manipulate strings](manipulate-strings.md)
