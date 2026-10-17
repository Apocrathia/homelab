---
title: "Type System"
canonical: https://tenzir.com/docs/reference/types
source: https://tenzir.com/docs/reference/types.md
section: "Docs"
---

# Type System

> This page explains TQL’s type system, which provides strong typing with automatic inference. You get type safety without requiring explicit declarations. Key characteristics include:

This page explains TQL’s type system, which provides strong typing with automatic inference. You get type safety without requiring explicit declarations. Key characteristics include:

* **Strong typing prevents errors**: Can’t accidentally compare IPs as strings
* **Automatic inference**: Types detected from data, no declarations needed
* **Null semantics**: Any field can be `null` or not exist
* **Domain operations**: Types come with relevant methods

Type safety in action

```tql
where src_ip in 10.0.0.0/8           // Type-checked subnet membership
where duration > 5min                // Type-checked duration comparison
where timestamp.hour() >= 9          // Extract hour from timestamp
where severity?.to_upper() == "HIGH" // Safe navigation with type conversion
```

## Available Types

The diagram below illustrates the type system at a glance:

The TQL types grouped under a common Type: null; the arithmetic types bool, int, uint, and float; the temporal types time and duration; the network types ip and subnet; the string types string, blob, and secret; and the containers list, whose elements each have their own type, and record, whose named fields each have their own type.

Tenzir’s type system is a superset of JSON: Every valid JSON object is a valid Tenzir value, but there are also additional types available, such as `ip` and `subnet`.

The types on this page are **logical types**: they define which values a field can hold and which operations apply to them. How Tenzir lays out the values in memory depends on their **physical representation**. An `int` column may store 8-bit values from a Parquet file or one constant for every row. Both behave as 64-bit signed integers in TQL. Our explanation of the [data model](../explanations/data-model.md#logical-types-physical-representations) lists the representations of every logical type.

### Basic Types

Basic types are stateless types with a static structure. The following basic types exist:

| Type       | Description                               | Example Expression Literal             |
| ---------- | ----------------------------------------- | -------------------------------------- |
| `null`     | Denotes an absent or invalid value        | `null`                                 |
| `bool`     | A boolean value                           | `true`, `false`                        |
| `int`      | A 64-bit signed integer                   | `42`, `-100`, `1k`, `2Ki`              |
| `uint`     | A 64-bit unsigned integer                 | `42`, `100`, `1M`, `2Gi`               |
| `float`    | A 64-bit floating-point number (IEEE 754) | `3.14`, `-0.5`, `1.23e-4`, `2.5k`      |
| `duration` | A time span (nanosecond granularity)      | `5s`, `10min`, `1h`, `2d`, `100ms`     |
| `time`     | A time point (nanosecond granularity)     | `2024-01-15T10:30:00`, `2024-01-15`    |
| `string`   | A UTF-8 encoded string                    | `"hello"`, `"world"`, `r"C:\path"`     |
| `blob`     | An arbitrary sequence of bytes            | `b"\x00\x01\x02"`, `b"raw bytes"`      |
| `ip`       | An IPv4 or IPv6 address                   | `192.168.1.1`, `::1`, `fe80::1`        |
| `subnet`   | An IPv4 or IPv6 subnet                    | `10.0.0.0/8`, `192.168.0.0/16`, `::/0` |
| `secret`   | A secret value                            | `secret("API_KEY")`                    |

#### Secrets

The `secret` type is a special type created by the [`secret`](https://tenzir.com/docs/reference/functions/secret.md) function. A secret holds the actual secret value, but you can only pass it to operators and functions that accept secrets, and it supports only a limited set of operations, such as concatenation. Assigning a secret to a field stores the string `"***"` instead, because secrets never appear in events.

See the [explanation page for secrets](../explanations/secrets.md) for more details.

### Complex Types

Complex types contain other values.

#### List

The `list` type is an ordered sequence of values. Its elements may have different types.

Lists have zero or more elements.

#### Record

The `record` type is an ordered sequence of zero or more *fields*, each of which has a name and a value of any type. The empty record `{}` is valid.

The field name is an arbitrary UTF-8 string.

Every record keeps its own field order. Two events with the same fields in a different order stay as they are.

## Types belong to values

Each value has its own type. The same field can hold an `ip` in one event and a `string` in the next; Tenzir preserves both types. Our explanation of the [data model](../explanations/data-model.md#unions-for-mixed-types) shows how Tenzir stores such fields efficiently.

## Nulls

The `null` value has a type of its own. Any field can hold `null` instead of a value of its usual type, so Tenzir needs no special type to indicate optionality.

In `{x: null}`, the type of `x` is `null`, with no indication of whether it would otherwise hold an `int` or a `string`.

## Why TQL has more types

TQL extends JSON’s type system because **security and network data has specific patterns** that generic JSON cannot express efficiently or safely.

Example:

```tql
from {
  // JSON-compatible types
  event_id: 42,                      // number → int
  is_alert: true,                    // bool
  message: "Connection established", // string
  tags: ["network", "established"],  // array → list
  metadata: {                        // object → record
    source: "firewall",
    version: 2
  },


  // TQL-specific types for security/network data
  src_ip: 192.168.1.100,                   // IP address
  network: 192.168.1.0/24,                 // subnet
  timestamp: 2024-01-15T10:30:00,          // time point
  duration: 250ms,                         // duration
  packet_data: b"\x00\x01\x02"             // blob (binary data)
}
```

### Why IP address types?

IP addresses aren’t just strings - they have structure and semantics:

✅ Native IP type operations:

```tql
where src_ip in 10.0.0.0/8      // Clear, type-safe subnet check
where src_ip.is_private()       // Built-in IP operations
where src_ip > 192.168.1.1      // Ordered comparison
```

❌ Without IP type (plain strings):

```tql
where src_ip.starts_with("10.") // Error-prone, doesn't handle all cases
where regex_match(src_ip, "^(10\\.|192\\.168\\.|...)")  // Complex and slow
// No way to do proper IP comparisons or subnet matching
```

### Why duration and time types?

Time calculations are fundamental to log analysis:

✅ Native time type operations:

```tql
where timestamp > now() - 1h    // Intuitive time arithmetic
where response_time > 500ms     // Clear units
let $window = 5min              // Self-documenting
```

❌ Without time types (using milliseconds):

```tql
where timestamp_ms > current_time_ms - 3600000  // What unit is this?
where response_time_ms > 500    // Milliseconds? Seconds?
let $window = 300000            // Five minutes... or is it?
```

### Why subnet types?

Network segmentation is core to security analysis:

✅ Subnet type operations:

```tql
let $internal = 10.0.0.0/8
let $dmz = 192.168.100.0/24
where src_ip in $internal and dst_ip not in $internal  // Outbound traffic
```

❌ Without subnet type:

```tql
// Would need complex IP range calculations and bit manipulation
// Error-prone and hard to maintain
```

### Why binary blob types?

Security and network data often contains raw binary content that needs special handling:

✅ Blob type for binary data:

```tql
// Handle packet captures, certificates, encrypted payloads
let $open_packet = b"\x00\x01\x02\x03"      // Blob literals
packet_data = decode_base64(encoded_packet) // Returns blob
where packet_data != $open_packet           // Comparing bytes directly
payload_hex = encode_hex(packet_data)       // blob → hex string
hash = hash_sha256(packet_data)             // Direct hashing of binary
```

❌ Without blob type (using strings):

```tql
// Binary data corrupts when treated as text
packet_data = "\xFF\xFE\x00\x00"  // Invalid UTF-8 sequence
// No safe way to handle non-UTF8 sequences
// Length calculations are wrong for multi-byte encodings
```

Blobs preserve exact byte sequences for forensics, packet analysis, and cryptographic operations.

### Why secret types?

Credentials and sensitive data need protection from accidental exposure:

✅ Secret type for sensitive values:

```tql
// Secrets are never logged or displayed
let $api_key = secret("API_TOKEN")
let $auth_header = f"Bearer {$api_key}"


// Use secrets without exposing them
http "api.example.com", headers={Auth: $auth_header}  // Use secret safely
to_file "debug.json"  // Secret value is not written to file
```

❌ Without secret type (using strings):

```tql
// Dangerous: credentials visible in logs
api_key = "sk_live_abc123..."   // Shows up in debug output


// No protection against exposure
to_file "debug.json"  // Oops, secret written to file
```

The secret type ensures sensitive data is never accidentally exposed in logs, outputs, or debugging.

## Comparison to Arrow

Tenzir converts events to and from [Apache Arrow](https://arrow.apache.org) where they cross a boundary, for example when reading or writing Parquet and Feather files or when a node stores events. The `ip` and `subnet` types map to Arrow [extension types](https://arrow.apache.org/docs/format/Columnar.html#extension-types).

When reading Arrow data, Tenzir keeps the width of integer and floating-point columns, decodes dictionary-encoded columns, turns enumerations into strings, and turns maps from strings to strings into records. Values still behave like their TQL type, so an 8-bit integer column reads as `int`. Our explanation of the [data model](../explanations/data-model.md#logical-types-physical-representations) covers these physical representations.
