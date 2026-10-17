---
title: "Build an OCSF lake with ClickHouse"
description: "Store OCSF events in ClickHouse, from a table that accepts anything to a tuned lake with typed columns, skip indexes, codecs, and per-class retention."
canonical: https://tenzir.com/docs/tutorials/build-an-ocsf-lake-with-clickhouse
source: https://tenzir.com/docs/tutorials/build-an-ocsf-lake-with-clickhouse.md
section: "Docs"
---

# Build an OCSF lake with ClickHouse

> Store OCSF events in ClickHouse, from a table that accepts anything to a tuned lake with typed columns, skip indexes, codecs, and per-class retention.

In this tutorial, you build a lake for OCSF events in ClickHouse. You start with a table that accepts any event and then shape it step by step: typed columns for the fields you query, a sort key and partitions that match your queries, skip indexes for needle-in-a-haystack searches, codecs, and retention that differs per event class. After each step, you measure what it bought you on a million sample events.

Along the way, you learn how ClickHouse stores semi-structured data and how Tenzir splits each event across typed columns and a JSON catch-all. The result looks like this:

An OCSF Network Activity event inside Tenzir on the left, the ClickHouse table ocsf.events on the right. When the to\_clickhouse operator writes the event, the fields time, class\_uid, device.hostname, and src\_endpoint.ip go to typed columns with the same names. The fields traffic.bytes\_in and metadata.version have no column of their own and land in the catch-all column event, a JSON column with the Tenzir catch-all comment, which keeps their nesting: bytes\_in sits inside traffic and version inside metadata. The unmapped object goes as a whole into the unmapped JSON column.

To follow along, you need [Docker](https://docs.docker.com/get-started/get-docker/) and a [Tenzir installation](../guides/installation.md) on the same machine. Run the TQL pipelines with the `tenzir` command-line tool, for example by saving a pipeline as `pipeline.tql` and running `tenzir -f pipeline.tql`.

## Start ClickHouse

Start a local ClickHouse server in a container:

```sh
docker run -d --name clickhouse \
  -p 9000:9000 \
  -e CLICKHOUSE_SKIP_USER_SETUP=1 \
  --ulimit nofile=262144:262144 \
  clickhouse/clickhouse-server
```

Port 9000 serves the native ClickHouse protocol that Tenzir speaks. The `CLICKHOUSE_SKIP_USER_SETUP` variable lets the `default` user connect without a password, which is fine for a local experiment but nothing else.

Open a SQL shell in the container. You run all SQL statements of this tutorial there:

```sh
docker exec -it clickhouse clickhouse-client
```

Tenzir writes to tables with a catch-all column only on ClickHouse 25.8 or later. Check the version of your server:

```sql
SELECT version();
```

## Generate sample events

A lake only shows its trade-offs with data in it. Our sample generator creates one million OCSF events, spread over the last 120 days, and writes them to the compressed file `ocsf-events.json.zst`. Save the pipeline as `generate.tql` and run it with `tenzir -f generate.tql`; it takes less than a minute.

Sample generator

```tql
from {}
repeat 1000000
// Group the generated events, so that the rest of the pipeline runs fast.
batch 8192
let $hosts = ["web-01", "web-02", "db-01", "dc-01", "mail-01", "laptop-17", "laptop-42", "laptop-73"]
let $users = ["alice", "bob", "carol", "dave", "erin", "svc-backup", "administrator"]
let $domains = ["tenzir.com", "github.com", "update.microsoft.com", "pypi.org", "x7k2q.example.net"]
let $processes = ["powershell.exe", "cmd.exe", "chrome.exe", "python.exe", "rundll32.exe"]
r = random()
time = now() - random() * 120d
host = $hosts[int(random() * 8)]
user = $users[int(random() * 7)]
src = ip(f"10.0.{int(random() * 8)}.{int(random() * 250) + 1}")
dst = ip(f"{int(random() * 223) + 1}.{int(random() * 256)}.{int(random() * 256)}.{int(random() * 254) + 1}")
if r < 0.5 {
  port = [443, 80, 22, 445, 3389, 53][int(random() * 6)]
  bytes_in = int(random() * 1000000)
  bytes_out = int(random() * 50000)
  this = {
    time: time, class_uid: 4001, class_name: "Network Activity",
    category_uid: 4, category_name: "Network Activity",
    activity_id: 6, activity_name: "Traffic", type_uid: 400106,
    type_name: "Network Activity: Traffic", severity_id: 1, severity: "Informational",
    metadata: {version: "1.7.0", product: {name: "Zeek", vendor_name: "Zeek"}},
    device: {hostname: host},
    src_endpoint: {ip: src, port: int(random() * 30000) + 32768},
    dst_endpoint: {ip: dst, port: port},
    connection_info: {protocol_name: "tcp", direction_id: 2, direction: "Outbound"},
    traffic: {bytes_in: bytes_in, bytes_out: bytes_out},
    unmapped: {conn_state: "SF", history: "ShADadFf"},
    raw_data: f"{time}\tC{int(random() * 1000000000)}\t{src}\t{dst}\t{port}\ttcp\t-\t{bytes_out}\t{bytes_in}\tSF\tShADadFf",
  }
} else if r < 0.75 {
  domain = $domains[int(random() * 5)]
  this = {
    time: time, class_uid: 4003, class_name: "DNS Activity",
    category_uid: 4, category_name: "Network Activity",
    activity_id: 1, activity_name: "Query", type_uid: 400301,
    type_name: "DNS Activity: Query", severity_id: 1, severity: "Informational",
    metadata: {version: "1.7.0", product: {name: "Zeek", vendor_name: "Zeek"}},
    device: {hostname: host},
    src_endpoint: {ip: src, port: int(random() * 30000) + 32768},
    dst_endpoint: {ip: 10.0.0.53, port: 53},
    query: {hostname: domain, type: "A", class: "IN"},
    rcode_id: 0, rcode: "NoError",
    unmapped: {trans_id: int(random() * 65535), rejected: false},
    raw_data: f"{time}\tC{int(random() * 1000000000)}\t{src}\t10.0.0.53\t53\tudp\t{domain}\tA\tNOERROR",
  }
} else if r < 0.9 {
  success = random() < 0.9
  this = {
    time: time, class_uid: 3002, class_name: "Authentication",
    category_uid: 3, category_name: "Identity & Access Management",
    activity_id: 1, activity_name: "Logon", type_uid: 300201,
    type_name: "Authentication: Logon",
    severity_id: 1 if success else 3, severity: "Informational" if success else "Medium",
    status_id: 1 if success else 2, status: "Success" if success else "Failure",
    metadata: {version: "1.7.0", product: {name: "Microsoft Windows", vendor_name: "Microsoft"}, event_code: "4624" if success else "4625"},
    device: {hostname: host},
    user: {name: user, domain: "CORP"},
    src_endpoint: {ip: src},
    logon_type_id: 3, logon_type: "Network",
    auth_protocol_id: 2, auth_protocol: "Kerberos",
    unmapped: {LogonProcessName: "Kerberos", ImpersonationLevel: "%%1833"},
    raw_data: f"<Event><System><EventID>{4624 if success else 4625}</EventID><Computer>{host}.corp.local</Computer></System><EventData><Data Name=\"TargetUserName\">{user}</Data><Data Name=\"IpAddress\">{src}</Data><Data Name=\"LogonType\">3</Data></EventData></Event>",
  }
} else {
  parent = $processes[int(random() * 5)]
  child = $processes[int(random() * 5)]
  this = {
    time: time, class_uid: 1007, class_name: "Process Activity",
    category_uid: 1, category_name: "System Activity",
    activity_id: 1, activity_name: "Launch", type_uid: 100701,
    type_name: "Process Activity: Launch", severity_id: 1, severity: "Informational",
    metadata: {version: "1.7.0", product: {name: "Sysmon", vendor_name: "Microsoft"}, event_code: "1"},
    device: {hostname: host},
    actor: {user: {name: user}, process: {name: parent, pid: int(random() * 60000)}},
    process: {name: child, pid: int(random() * 60000), cmd_line: f"{child} -NoProfile -File C:\\Users\\{user}\\script.ps1"},
    unmapped: {IntegrityLevel: "Medium", LogonId: "0x3e7"},
    raw_data: f"<Event><System><EventID>1</EventID><Computer>{host}.corp.local</Computer></System><EventData><Data Name=\"Image\">C:\\Windows\\System32\\{child}</Data><Data Name=\"ParentImage\">{parent}</Data><Data Name=\"User\">CORP\\{user}</Data></EventData></Event>",
  }
}
to_file "ocsf-events.json.zst" {
  write_ndjson
  compress_zstd
}
```

The events cover four OCSF classes, roughly in the proportions a real network produces them:

| Class            | `class_uid` | Share | Modeled after                      |
| ---------------- | ----------- | ----- | ---------------------------------- |
| Network Activity | 4001        | 50%   | Zeek connection logs               |
| DNS Activity     | 4003        | 25%   | Zeek DNS logs                      |
| Authentication   | 3002        | 15%   | Windows logon events 4624 and 4625 |
| Process Activity | 1007        | 10%   | Sysmon process creation            |

Like real normalized events, each one carries enum IDs with their captions, such as `severity_id` and `severity`, the original log line in `raw_data`, and vendor fields without an OCSF equivalent in `unmapped`. The generator draws random values, so your numbers in the following steps differ slightly from ours.

## Store everything in a catch-all

Start with the smallest table that accepts every OCSF event: a `time` column and one JSON column for everything else.

```sql
CREATE DATABASE IF NOT EXISTS ocsf;


CREATE TABLE ocsf.events (
  time  DateTime64(9, 'UTC'),
  event JSON COMMENT 'tenzir:catch_all'
)
ENGINE = MergeTree
ORDER BY time;
```

The comment `tenzir:catch_all` marks the `event` column as the **catch-all column**. When [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) writes an event, it looks up each field in the table: a field with a column of the same name goes into that column, and every other field goes into the catch-all. Without a catch-all, Tenzir drops fields that have no column, with a warning.

The `DateTime64(9, 'UTC')` type keeps the full nanosecond precision of Tenzir timestamps. The `MergeTree` engine stores the rows sorted by the `ORDER BY` key, here `time`, which the next steps make use of.

Load the sample events into the table:

```tql
from_file "ocsf-events.json.zst" {
  decompress_zstd
  read_ndjson
}
to_clickhouse table="ocsf.events", mode="append", tls=false
```

The `mode="append"` option makes the pipeline fail if the table does not exist, so that ClickHouse stays in charge of the schema. Look at one of the stored Authentication events:

```sql
SELECT time, toString(event) AS event
FROM ocsf.events
WHERE event.class_uid.:Int64 = 3002
LIMIT 1
FORMAT Vertical;
```

```text
Row 1:
──────
time:  2026-06-15 15:55:50.999930390
event: {"activity_id":1,"activity_name":"Logon","auth_protocol":"Kerberos","auth_protocol_id":2,"category_name":"Identity & Access Management","category_uid":3,"class_name":"Authentication","class_uid":3002,"device":{"hostname":"laptop-17"},"logon_type":"Network","logon_type_id":3,"metadata":{"event_code":"4624","product":{"name":"Microsoft Windows","vendor_name":"Microsoft"},"version":"1.7.0"},"raw_data":"<Event>…</Event>","severity":"Informational","severity_id":1,"src_endpoint":{"ip":"10.0.1.249"},"status":"Success","status_id":1,"type_name":"Authentication: Logon","type_uid":300201,"unmapped":{"ImpersonationLevel":"%%1833","LogonProcessName":"Kerberos"},"user":{"domain":"CORP","name":"bob"}}
```

Everything except `time` sits in the catch-all, with its original nesting. The table already stores complete events of every class, without a single schema decision. To see what that costs, you need to understand how ClickHouse stores a JSON column.

### How ClickHouse stores JSON

A ClickHouse `JSON` column does not store an object as one blob. It splits the values by path, and the most frequent paths each get their own subcolumn, called a **dynamic path**. Reading `event.class_uid` therefore reads only the `class_uid` values, not the whole object. Up to [`max_dynamic_paths`](https://clickhouse.com/docs/reference/data-types/newjson#reaching-the-limit-of-dynamic-paths-inside-json) paths, 1024 by default, become dynamic; all others share one storage area that queries have to search.

JSON has no schema, so ClickHouse infers the type of every value as it stores it, and one path can hold different types in different rows. Try to count the events per class:

```sql
SELECT event.class_uid AS class_uid, count()
FROM ocsf.events
GROUP BY class_uid;
```

ClickHouse refuses, because `event.class_uid` has the type `Dynamic`, which can hold any type. Ask for a specific type with the `.:` syntax instead:

```sql
SELECT event.class_uid.:Int64 AS class_uid, count() AS events
FROM ocsf.events
GROUP BY class_uid
ORDER BY events DESC;
```

```text
   ┌─class_uid─┬─events─┐
1. │      4001 │ 499488 │
2. │      4003 │ 250856 │
3. │      3002 │ 149861 │
4. │      1007 │  99795 │
   └───────────┴────────┘
```

A row whose value has a different type returns `NULL` for `.:Int64`. If one source sends a port as the number `443` and another as the string `"443"`, a filter on the number silently misses the string rows. IP addresses are worse off: JSON has no IP type, so the catch-all stores them as strings, and range checks or subnet matches on them need conversions in every query.

### What the catch-all costs

Count the failed logons:

```sql
SELECT count()
FROM ocsf.events
WHERE event.class_uid.:Int64 = 3002 AND event.status_id.:Int64 = 2;
```

The client reports how many rows the query processed: all one million. ClickHouse reads only the two subcolumns, which keeps the query fast at this size, but nothing tells it where the Authentication events are. The table is sorted by `time`, so they are spread over the entire table, and every filter that does not involve `time` scans all of it. That cost grows linearly with your lake.

The next steps move the fields you query most out of the catch-all and into typed columns that ClickHouse can sort, index, and compress.

## Design the table

A good table for OCSF events combines three kinds of columns:

* Typed columns for the few dozen fields that queries filter, group, and aggregate on.
* A catch-all for everything else, so that no field gets lost and new fields need no schema change.
* Dedicated columns for bulky data that has its own access pattern, such as `raw_data` and `unmapped`.

The following sections explain each decision. Here is the table they lead to. It replaces the first table, so drop that one first:

```sql
DROP TABLE ocsf.events;


CREATE TABLE ocsf.events (
  time                           DateTime64(9, 'UTC') CODEC(Delta, ZSTD),
  class_uid                      Int32 DEFAULT 0,
  category_uid                   Int8 DEFAULT 0,
  activity_id                    Int8 DEFAULT 0,
  type_uid                       Int32 DEFAULT 0,
  severity_id                    Int8 DEFAULT 0,
  status_id                      Nullable(Int8),
  `metadata.product.name`        LowCardinality(Nullable(String)),
  `metadata.product.vendor_name` LowCardinality(Nullable(String)),
  `metadata.event_code`          LowCardinality(Nullable(String)),
  `device.hostname`              LowCardinality(Nullable(String)),
  `src_endpoint.ip`              Nullable(IPv6),
  `src_endpoint.port`            Nullable(Int32),
  `dst_endpoint.ip`              Nullable(IPv6),
  `dst_endpoint.port`            Nullable(Int32),
  `user.name`                    LowCardinality(Nullable(String)),
  `actor.user.name`              LowCardinality(Nullable(String)),
  `actor.process.name`           LowCardinality(Nullable(String)),
  raw_data                       String DEFAULT '' CODEC(ZSTD(3)),
  unmapped                       JSON CODEC(ZSTD(3)),
  event                          JSON CODEC(ZSTD(3)) COMMENT 'tenzir:catch_all'
)
ENGINE = MergeTree
PARTITION BY (class_uid, toYYYYMM(time))
ORDER BY (class_uid, time);
```

### Choose the typed columns

A column whose name is a field path, such as `src_endpoint.ip`, receives that field, while the rest of `src_endpoint` still goes to the catch-all. Quote such names with backticks in SQL. Unlike a `Tuple` column, a dotted column can be added or dropped on its own later.

Whether a field deserves a typed column depends on how queries use it:

|                                | Typed column                          | Catch-all path                                  |
| ------------------------------ | ------------------------------------- | ----------------------------------------------- |
| Filter on the field            | Can use the sort key and skip indexes | Scans every row unless an index covers the path |
| Sort or partition by the field | Possible                              | Not supported for the catch-all                 |
| Value type                     | Declared once, checked on insert      | Inferred per value, can differ between rows     |
| Cost when mostly empty         | Small, but not zero                   | None                                            |

The last row is why you should not give every OCSF attribute a column. OCSF defines thousands of attributes, and in ClickHouse every column costs memory on every insert and work on every merge, no matter how sparse it is. As our post on [OCSF storage strategies](https://tenzir.com/blog/ocsf-storage-strategies-for-your-security-lakehouse.md#wide-and-sparse-is-expensive-in-clickhouse) explains, a wide and sparse table that works well in Iceberg becomes expensive in ClickHouse once it reaches thousands of columns. Promote the few dozen fields you filter and aggregate on, such as time, class, hosts, IP addresses, users, severity, and event codes, and leave the rest in the catch-all. The table above covers the class-independent core of OCSF plus the fields of our four classes. Adding a column later is cheap, as the step on [evolving the table](build-an-ocsf-lake-with-clickhouse.md#evolve-the-table) shows.

### Choose column types

Pick the narrowest type that fits the values:

* Use signed integers, because Tenzir rejects OCSF integers in unsigned columns.
* Use `Int8` for enum IDs, whose values stay below `100`. Tenzir drops an event whose value does not fit its column, with a warning.
* Use `DEFAULT 0` for IDs that every event should have. A missing ID then becomes `0`, which OCSF defines as Unknown.
* Use [`Nullable`](https://clickhouse.com/docs/reference/data-types/nullable) for fields that only some classes have, such as ports or user names, so that a missing value stays distinguishable from `0` or an empty string. Each `Nullable` column carries an extra null mask, so do not use it where a default works.
* Use `IPv6` for IP addresses. It holds IPv4 addresses as well, in their IPv4-mapped form `::ffff:10.0.0.5`.
* Use [`LowCardinality`](https://clickhouse.com/docs/reference/data-types/lowcardinality) for strings with a few thousand distinct values at most, such as product names, host names, and user names. ClickHouse then stores each value once in a dictionary and refers to it by number.

The [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) reference lists the [ClickHouse type for each Tenzir type](../reference/operators/to_clickhouse.md#types) and the [narrower types](../reference/operators/to_clickhouse.md#appending-to-existing-columns) it accepts when appending.

### Keep bulky data apart

The original log line in `raw_data` is usually the largest field of an event. A `String` column of its own lets you pick a strong codec for it, search it with a token index, and expire it earlier than the rest of the event, as the later steps show. If you keep the original logs elsewhere, drop `raw_data` in the pipeline instead.

The OCSF `unmapped` object holds source fields without an OCSF equivalent. Vendor fields tend to be many and rarely queried, and in the catch-all they would take dynamic paths away from the OCSF fields. A `JSON` column of its own keeps them apart. Because its name matches the field, Tenzir writes the whole `unmapped` object there, and it comes back as a nested record when you read events.

### Choose codecs

ClickHouse compresses every column, by default with LZ4, and a codec selects a different method per column. We measured two codecs on the sample data:

| Column  | Default (LZ4) | Codec         | With codec |
| ------- | ------------- | ------------- | ---------- |
| `time`  | 7.7 MiB       | `Delta, ZSTD` | 5.5 MiB    |
| `event` | 7.7 MiB       | `ZSTD(3)`     | 4.1 MiB    |

`Delta` stores the difference to the previous value, which is small for sorted timestamps, and ZSTD compresses the result better than LZ4. For the text in `raw_data` and the JSON columns, a higher ZSTD level pays off. Leave the other columns at the default until measurements on your data say otherwise; `LowCardinality` already compresses repetitive strings well.

### Choose the sort key

The sort key in `ORDER BY` sets the physical order of the rows. ClickHouse keeps a sparse primary index with one entry per **granule** of 8192 rows, so a filter on the leading columns of the sort key skips every granule that cannot match. With `ORDER BY (class_uid, time)`, a query for one class reads a contiguous range of rows, and a time range narrows that range further.

Most detection and hunting queries select an event class, so `class_uid` comes first. If your queries mostly ask for the latest events across all classes, `ORDER BY (toStartOfHour(time), class_uid, time)` suits them better. Do not start the key with the raw `time` column: timestamps with nanosecond precision are almost never equal, so ClickHouse would never use the columns after it.

### Choose the partition key

A partition is a separate set of files for all rows with the same value of the `PARTITION BY` expression. Queries skip partitions that cannot match, and ClickHouse can drop a whole partition without touching the rest. That makes the partition key the foundation of retention.

With `PARTITION BY (class_uid, toYYYYMM(time))`, every partition holds one class for one month. You can then expire each class on its own schedule, as the retention step shows. Keep the number of partitions in the hundreds: with about 80 OCSF classes and twelve months, you stay below a thousand. Every insert creates at least one part per partition it touches, so too many partitions lead to many small parts and slow down inserts and merges.

Unlike columns, the sort key and the partition key cannot change later without rebuilding the table, so decide on both before you load data.

## Write events

Before you load the events again, remove what you do not need to store. OCSF pairs each enum ID with a caption: `class_uid` with `class_name`, `severity_id` with `severity`, and so on. The caption follows from the ID, so the pipeline drops it. The exception is the ID `99`, which OCSF uses for “Other”: then the caption is the only place that names the value.

```tql
from_file "ocsf-events.json.zst" {
  decompress_zstd
  read_ndjson
}
drop class_name?, category_name?, type_name?
if activity_id != 99 {
  drop activity_name?
}
if severity_id != 99 {
  drop severity?
}
if status_id? != 99 {
  drop status?
}
to_clickhouse table="ocsf.events", mode="append", tls=false
```

Dropping captions saves less disk space than you might expect: ZSTD compresses repeated strings so well that the catch-all shrinks only from 4.0 to 3.7 MiB on our sample. The bigger effect is on the uncompressed size, which drops from 180 to 67 MiB. ClickHouse has to process that much data whenever it returns complete events, so the captions cost memory and time on every read. The [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md) operator restores them when you read the events back.

If your events can carry an explicit `null` in a column that is not `Nullable`, such as `time`, replace it before writing, for example with `time = time? else now()`. Tenzir drops such events with a warning.

Look at a stored Authentication event:

```sql
SELECT * EXCEPT (unmapped, event),
  toString(unmapped) AS unmapped,
  toString(event) AS event
FROM ocsf.events
WHERE class_uid = 3002
LIMIT 1
FORMAT Vertical;
```

```text
Row 1:
──────
time:                         2026-09-01 00:00:44.716001593
class_uid:                    3002
category_uid:                 3
activity_id:                  1
type_uid:                     300201
severity_id:                  1
status_id:                    1
metadata.product.name:        Microsoft Windows
metadata.product.vendor_name: Microsoft
metadata.event_code:          4624
device.hostname:              laptop-17
src_endpoint.ip:              ::ffff:10.0.4.219
src_endpoint.port:            ᴺᵁᴸᴸ
dst_endpoint.ip:              ᴺᵁᴸᴸ
dst_endpoint.port:            ᴺᵁᴸᴸ
user.name:                    erin
actor.user.name:              ᴺᵁᴸᴸ
actor.process.name:           ᴺᵁᴸᴸ
raw_data:                     <Event><System><EventID>4624</EventID>…</Event>
unmapped:                     {"ImpersonationLevel":"%%1833","LogonProcessName":"Kerberos"}
event:                        {"auth_protocol":"Kerberos","auth_protocol_id":2,"logon_type":"Network","logon_type_id":3,"metadata":{"version":"1.7.0"},"user":{"domain":"CORP"}}
```

The promoted fields sit in typed columns, fields of other classes are `NULL`, and the catch-all holds only what is left: the class-specific fields and `metadata.version`.

## Measure the difference

Run the query for failed logons again, now on typed columns:

```sql
SELECT count()
FROM ocsf.events
WHERE class_uid = 3002 AND status_id = 2;
```

The query now processes about 150,000 rows instead of a million: exactly the Authentication events, because the partitions and the sort key tell ClickHouse where they are. Add a time range, and the work shrinks further:

| Query                         | Rows read, catch-all only | Rows read, designed table |
| ----------------------------- | ------------------------- | ------------------------- |
| Failed logons                 | 1,000,000                 | 150,089                   |
| Failed logons in the last day | 41,536                    | 7,486                     |
| All events of the last day    | 41,536                    | 37,991                    |

The first table was sorted by `time`, so it already handled time ranges well. The designed table keeps that advantage, because each of its partitions is sorted by time as well, and adds pruning by class on top. At this size, all queries finish in milliseconds; the rows read tell you how they scale.

Compare the storage of the two tables:

```sql
SELECT formatReadableSize(sum(data_compressed_bytes)) AS size
FROM system.parts
WHERE active AND database = 'ocsf' AND table = 'events';
```

The designed table takes 46 MiB, down from 126 MiB for the catch-all alone. To see where the space goes, list the largest columns:

```sql
SELECT
  column,
  formatReadableSize(sum(column_data_compressed_bytes)) AS compressed,
  formatReadableSize(sum(column_data_uncompressed_bytes)) AS uncompressed
FROM system.parts_columns
WHERE database = 'ocsf' AND table = 'events' AND active
GROUP BY column
ORDER BY sum(column_data_compressed_bytes) DESC
LIMIT 5;
```

```text
   ┌─column──────────┬─compressed─┬─uncompressed─┐
1. │ raw_data        │ 17.39 MiB  │ 97.72 MiB    │
2. │ time            │ 3.99 MiB   │ 5.46 MiB     │
3. │ event           │ 3.04 MiB   │ 54.99 MiB    │
4. │ dst_endpoint.ip │ 2.31 MiB   │ 11.60 MiB    │
5. │ src_endpoint.ip │ 2.15 MiB   │ 11.60 MiB    │
   └─────────────────┴────────────┴──────────────┘
```

The original log lines in `raw_data` dominate, as they do in most lakes. The totals cover only part of the table: ClickHouse stores small parts in a compact format that does not track sizes per column.

## Read events back

Read the table with [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md). Tenzir rebuilds each event from the typed columns and the catch-all, so you address fields by their OCSF paths no matter where they are stored:

```tql
from_clickhouse table="ocsf.events", tls=false
where class_uid == 3002 and status_id == 2 and time > now() - 7d
where user.name == "administrator"
ocsf_derive
select time, device.hostname, src_endpoint.ip, status, severity
head 2
```

```tql
{
  time: 2026-10-06T17:51:14.953335307Z,
  device: {
    hostname: "web-01",
  },
  src_endpoint: {
    ip: 10.0.5.71,
  },
  status: "Failure",
  severity: "Medium",
}
{
  time: 2026-10-06T18:03:31.297676027Z,
  device: {
    hostname: "mail-01",
  },
  src_endpoint: {
    ip: 10.0.6.236,
  },
  status: "Failure",
  severity: "Medium",
}
```

The [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md) operator restored the captions `status` and `severity` from their IDs, and the IP address comes back as an IP, not as the IPv4-mapped IPv6 address that ClickHouse stores.

Rebuilding events has a cost: any field can be split between a column and the catch-all, so ClickHouse returns every column of the matching rows. Only filters on columns without dots in their name, such as the first `where` on `class_uid`, `status_id`, and `time`, run in ClickHouse. The filter on `user.name`, the [`select`](https://tenzir.com/docs/reference/operators/select.md), and everything after it run in Tenzir. Narrow the rows with filters on such columns first. The reference on [ClickHouse optimizations](../reference/optimizations/clickhouse.md#catch-all-tables) lists what reaches ClickHouse, and the [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) reference lists how a [rebuilt event](../reference/operators/from_clickhouse.md#catch-all-tables) can differ from the original one.

When ClickHouse should do the work, such as filtering on dotted columns, aggregating, or sorting, use SQL mode. It returns the result as it is, without rebuilding events:

```tql
from_clickhouse tls=false, sql="
  SELECT `user.name` AS user, count() AS failures
  FROM ocsf.events
  WHERE class_uid = 3002 AND status_id = 2
    AND time > now() - INTERVAL 7 DAY
  GROUP BY user
  ORDER BY failures DESC
"
```

## Add skip indexes

The sort key helps queries that filter on its leading columns. For other filters, ClickHouse can keep a [skip index](https://clickhouse.com/docs/concepts/features/performance/skip-indexes/skipping-indexes): a small summary per granule that lets a query skip granules that cannot contain the value it looks for.

To have something to look for, plant a needle in the haystack. This pipeline writes three connection attempts from one host to a command-and-control server, spread over the last 70 days:

```tql
from {time: now() - 3d}, {time: now() - 40d}, {time: now() - 70d}
class_uid = 4001
category_uid = 4
activity_id = 6
type_uid = 400106
severity_id = 1
metadata = {version: "1.7.0", product: {name: "Zeek", vendor_name: "Zeek"}}
device = {hostname: "laptop-42"}
src_endpoint = {ip: 10.0.2.17, port: 49152}
dst_endpoint = {ip: 203.0.113.66, port: 4444}
traffic = {bytes_in: 0, bytes_out: 0}
unmapped = {conn_state: "S0", history: "S"}
raw_data = f"{time}\tCq7RvX2\t10.0.2.17\t203.0.113.66\t4444\ttcp\t-\t0\t0\tS0\tS"
to_clickhouse table="ocsf.events", mode="append", tls=false
```

Searching for an indicator, such as the IP address of the server, is a typical lake query. Without an index, it reads every row:

```sql
SELECT count()
FROM ocsf.events
WHERE `dst_endpoint.ip` = toIPv6('203.0.113.66');
```

Pick the index type that matches the query:

| Query                       | Index type     | Typical columns                             |
| --------------------------- | -------------- | ------------------------------------------- |
| Ranges on numbers or time   | `minmax`       | Counters, secondary timestamps              |
| Equality and `IN`           | `bloom_filter` | IP addresses, user names, event codes       |
| Whole words with `hasToken` | `tokenbf_v1`   | `raw_data`, `message`                       |
| Substrings with `LIKE`      | `ngrambf_v1`   | Short text fields, at a higher storage cost |

Add a Bloom filter on the destination IP and a token index on the raw log lines, and build both for the data already stored:

```sql
ALTER TABLE ocsf.events
  ADD INDEX idx_dst_ip `dst_endpoint.ip` TYPE bloom_filter(0.01) GRANULARITY 1;
ALTER TABLE ocsf.events
  ADD INDEX idx_raw_data raw_data TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1;
ALTER TABLE ocsf.events MATERIALIZE INDEX idx_dst_ip
  SETTINGS mutations_sync = 1;
ALTER TABLE ocsf.events MATERIALIZE INDEX idx_raw_data
  SETTINGS mutations_sync = 1;
```

Building an index for existing data is a background job, and the `mutations_sync` setting makes the statement wait until it is done. Token and n-gram indexes only work on columns that are not `Nullable`, which is why `raw_data` is a `String` with `DEFAULT ''`. Check that ClickHouse uses the new index:

```sql
EXPLAIN indexes = 1
SELECT count()
FROM ocsf.events
WHERE `dst_endpoint.ip` = toIPv6('203.0.113.66');
```

The output lists for each index how many parts and granules remain. For the Bloom filter, only a handful of granules out of about 140 remain:

```text
Skip
  Name: idx_dst_ip
  Description: bloom_filter GRANULARITY 1
  Parts: 3/48
  Granules: 3/148
```

Search the raw log lines for the Zeek connection state `S0`, a connection attempt without an answer, which only the planted events have:

```sql
SELECT time, raw_data
FROM ocsf.events
WHERE hasToken(raw_data, 'S0');
```

On our sample, the indexes cut the work of both queries to a sliver:

| Query               | Rows read without index | Rows read with index | Index size |
| ------------------- | ----------------------- | -------------------- | ---------- |
| Destination IP      | 1,000,003               | 8,195                | 613 KiB    |
| Token in `raw_data` | 1,000,003               | 3                    | 3.2 MiB    |

The planted events still sit in small parts of their own, which flatters these numbers. Once ClickHouse merges them into larger parts, expect to read about one granule of 8192 rows per match, which is still a tiny fraction of the table. An index only helps when the value it looks for is rare. Try an index on the host name:

```sql
ALTER TABLE ocsf.events
  ADD INDEX idx_hostname `device.hostname` TYPE bloom_filter(0.01) GRANULARITY 1;
ALTER TABLE ocsf.events MATERIALIZE INDEX idx_hostname
  SETTINGS mutations_sync = 1;


EXPLAIN indexes = 1
SELECT count()
FROM ocsf.events
WHERE `device.hostname` = 'laptop-42';
```

The index skips nothing, because every granule of 8192 rows contains events from each of the eight hosts. Such an index costs storage and insert time for no gain, so drop it:

```sql
ALTER TABLE ocsf.events DROP INDEX idx_hostname;
```

Indexes on dotted columns, such as `dst_endpoint.ip`, help SQL queries only. When you read the table with [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md) in table mode, filters on dotted columns run in Tenzir, so ClickHouse never consults the index.

A path inside the catch-all can carry an index on its typed subcolumn, such as `INDEX idx_query event.query.hostname.:String TYPE bloom_filter(0.01)`, but only queries that spell out the same typed subcolumn use it. When you query a field often enough to index it, promote it to a typed column instead.

## Set retention

Different event classes deserve different retention periods. Network flows are plentiful and lose their value quickly, while authentication events matter for investigations months later. In this step, you keep Network Activity for 30 days, DNS Activity for 90 days, and everything else for a year, all in one table.

Look at the data per class and month first:

```sql
SELECT class_uid, toYYYYMM(time) AS month, count() AS events
FROM ocsf.events
GROUP BY class_uid, month
ORDER BY class_uid, month;
```

Then add a TTL, short for time to live, that computes the expiry of each row from its class:

```sql
ALTER TABLE ocsf.events MODIFY SETTING ttl_only_drop_parts = 1;


ALTER TABLE ocsf.events MODIFY TTL
  toDateTime(time) + toIntervalDay(multiIf(
    class_uid = 4001, 30,
    class_uid = 4003, 90,
    365
  ));
```

Run the query per class and month again. The old months of Network Activity and DNS Activity are gone, while the other classes keep all their data, and the table shrinks from 46 to 25 MiB:

```text
    ┌─class_uid─┬──month─┬─events─┐
 1. │      1007 │ 202606 │  12975 │
    ⋮
10. │      3002 │ 202610 │  15678 │
11. │      4001 │ 202609 │ 123995 │
12. │      4001 │ 202610 │  52690 │
13. │      4003 │ 202607 │  64749 │
14. │      4003 │ 202608 │  64506 │
15. │      4003 │ 202609 │  62457 │
16. │      4003 │ 202610 │  26276 │
    └───────────┴────────┴────────┘
```

### Why whole parts

Removing single rows is expensive in ClickHouse: it has to rewrite every part that contains them. With the single expiry expression above, the setting `ttl_only_drop_parts` keeps the TTL from rewriting partially expired parts. ClickHouse instead deletes a part once all its rows have expired, which costs no more than deleting files.

The setting does not prevent other rewrites, though. In our tests with ClickHouse 26.8, ordinary background merges still removed expired rows from parts that also held live rows. Without such a merge, expired rows stay until their whole part expires.

The partition key makes this work. Because `class_uid` is part of it, every part belongs to exactly one class, and all its rows share one retention period. In a table partitioned only by month, a part would mix classes, and unexpired Authentication events would keep expired Network Activity events from being dropped with their part.

The price is precision. Look at the September partition of Network Activity above: its oldest rows are older than 30 days, but a part that also holds late-September rows cannot be dropped until its newest row expires at the end of October. With monthly partitions, rows can wait up to a month past their retention period for a whole-part drop. To narrow that window, partition by retention period and week instead, with `PARTITION BY (multiIf(class_uid = 4001, 30, class_uid = 4003, 90, 365), toMonday(time))`. The sort key on `class_uid` still serves queries for one class. Either way, ClickHouse deletes expired data in the background without a fixed deadline, so do not rely on TTL alone to meet a hard compliance deadline.

Use one expression for per-class retention

In our tests with ClickHouse 26.8, combining a conditional rule such as `TTL toDateTime(time) + INTERVAL 30 DAY DELETE WHERE class_uid = 4001` with an unconditional 365-day rule left expired Network Activity parts in place while `ttl_only_drop_parts` was enabled. A single TTL expression that computes the retention per row, as above, drops whole parts as intended.

ClickHouse applies TTL rules during background merges, so expired data can remain visible for a while. `MODIFY TTL` is an exception: it applies the new rule to the existing data right away, which on a large table means a long mutation. Avoid `DELETE` statements for routine cleanup, because they rewrite every affected part.

### Expire raw logs early

A column can carry a TTL of its own. Keep the original log lines for 30 days and the OCSF events for their full retention period:

```sql
ALTER TABLE ocsf.events
  MODIFY COLUMN raw_data TTL toDateTime(time) + INTERVAL 30 DAY;
```

When `raw_data` expires, ClickHouse resets it to its default, the empty string, which requires rewriting the part. During that rewrite, it also removes the expired rows of the part, such as the September rows of Network Activity that are older than 30 days. On our sample, the table shrinks from 25 to 16 MiB.

### Move old data to cheaper storage

A TTL can also move data instead of deleting it. With a storage policy that defines a volume named `cold`, for example on object storage, this rule moves parts there once all their rows are at least 14 days old:

```sql
ALTER TABLE ocsf.events
  MODIFY TTL
    toDateTime(time) + INTERVAL 14 DAY TO VOLUME 'cold',
    toDateTime(time) + toIntervalDay(multiIf(
      class_uid = 4001, 30,
      class_uid = 4003, 90,
      365
    ));
```

Moves follow the same logic as drops: a part becomes eligible to move only once its newest row passes the threshold, and background scheduling can add further delay. With monthly partitions, older rows can wait up to a month longer on the faster volume, and partitioning by week narrows that as well. The threshold does not keep younger rows on the faster volume either: ClickHouse can place them on the colder volume earlier, for example when a merge writes its result there.

Keep move thresholds and retention periods apart. When a move and an expiry fall on the same day, as a 30-day move would with the 30-day retention of Network Activity, ClickHouse sometimes copies a part to the cold volume only to delete it right after.

The storage policy lives in the ClickHouse server configuration, and you assign it to the table with the `storage_policy` setting. The ClickHouse documentation on [TTL](https://clickhouse.com/docs/concepts/features/operations/delete/ttl) covers moves and the other TTL actions.

### One table per class

Instead of one table with per-class retention, you can create one table per class, each with its own columns, sort key, indexes, and TTL. The [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) operator chooses the table per event:

```tql
to_clickhouse table=f"ocsf.class_{class_uid}", mode="append", tls=false
```

For queries across classes, a table with the [`Merge`](https://clickhouse.com/docs/reference/engines/table-engines/special/merge) engine combines all class tables:

```sql
CREATE TABLE ocsf.all_classes ENGINE = Merge('ocsf', '^class_');
```

It tolerates tables with different columns, and a filter on its `_table` column, such as `WHERE _table = 'class_3002'`, reads only that table.

Null checks can return wrong results

Before ClickHouse 26.10, `IS NULL` and `IS NOT NULL` on a column that only some class tables have return wrong results through the `Merge` table, without an error. In our tests with ClickHouse 26.9, `dst_endpoint.ip IS NOT NULL` matched every Authentication event, even though their table has no such column. Upgrade to 26.10 or later, which contains the [fix for missing columns in `Merge` children](https://github.com/ClickHouse/ClickHouse/pull/123633), or add `SETTINGS optimize_functions_to_subcolumns = 0` to such queries.

The trade-offs:

* Queries without a class filter fan out to every table.
* You maintain one schema, sort key, and set of indexes per class.
* With many classes and a steady stream of events, every insert batch spreads over many tables, which creates many small parts.

A single table with class-aware partitions gives you most of the pruning of per-class tables with one schema to maintain, which is why this tutorial uses it.

## Evolve the table

Your queries change over time. When they start to filter or aggregate on a field in the catch-all, promote it to a typed column of the live table. You change only the table: running [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) pipelines pick up the new column on their own. In this step, you promote the received bytes of Network Activity.

### Find candidates

List the paths in the catch-all and how many recent rows have them:

```sql
SELECT path, count() AS rows
FROM (
  SELECT arrayJoin(JSONAllPaths(event)) AS path
  FROM ocsf.events
  WHERE time > now() - INTERVAL 7 DAY
)
GROUP BY path
ORDER BY rows DESC
LIMIT 6;
```

```text
   ┌─path──────────────────────────┬──rows─┐
1. │ metadata.version              │ 58156 │
2. │ traffic.bytes_out             │ 29201 │
3. │ traffic.bytes_in              │ 29201 │
4. │ connection_info.direction_id  │ 29200 │
5. │ connection_info.protocol_name │ 29200 │
6. │ connection_info.direction     │ 29200 │
   └───────────────────────────────┴───────┘
```

The time range keeps the query cheap, because collecting the paths of a wide JSON column across a whole table needs a lot of memory. Frequent paths are candidates, but promote a field because queries use it, not because it is common.

Before you pick a column type, check which types the path holds, because different sources can store the same field with different types:

```sql
SELECT dynamicType(event.traffic.bytes_in) AS type, count() AS rows
FROM ocsf.events
WHERE class_uid = 4001
GROUP BY type;
```

In the sample, every value is an `Int64`.

### Add the column

Name the column after the field path and declare the catch-all path as its default:

```sql
ALTER TABLE ocsf.events
  ADD COLUMN `traffic.bytes_in` Nullable(Int64)
  DEFAULT event.traffic.bytes_in.:Int64;
```

Within 30 seconds, every pipeline that writes to the table notices the column and writes new `traffic.bytes_in` values into it instead of the catch-all, without a restart. The other fields of `traffic` stay in the catch-all.

Rows written before the change keep the value in the catch-all. The `DEFAULT` expression makes the new column return it for them, so queries on the column cover old and new events alike. The `.:Int64` suffix reads only values of that type and returns `NULL` for values of another type, such as the string `"8123"`, instead of failing. Keep such a column `Nullable`, or wrap the path in `ifNull(..., 0)`: a non-nullable column cannot hold the `NULL` of rows without the field, and every read of the column fails. Query the new column:

```sql
SELECT count(), avg(`traffic.bytes_in`)
FROM ocsf.events
WHERE class_uid = 4001;
```

### Store the values of existing rows

For existing rows, ClickHouse computes the default from the catch-all on every read. To store the values in the column instead, materialize it:

```sql
ALTER TABLE ocsf.events MATERIALIZE COLUMN `traffic.bytes_in`;
```

This rewrites the affected parts in the background, so on a large table, run it outside of peak hours or limit it to single partitions with `IN PARTITION (4001, 202610)`. The existing rows keep their copy in the catch-all, which takes space until the rows expire. When you read the table with [`from_clickhouse`](https://tenzir.com/docs/reference/operators/from_clickhouse.md), the column wins over the catch-all, so each event contains the field once.

### Undo a promotion

Dropping the column sends new values back to the catch-all:

```sql
ALTER TABLE ocsf.events DROP COLUMN `traffic.bytes_in`;
```

ClickHouse refuses to drop a column while a mutation on it, such as `MATERIALIZE COLUMN`, is still running; the `system.mutations` table lists the mutations that have not finished yet.

Dropping a column deletes its data

Tenzir does not copy the values of a dropped column back into the catch-all. Rows written while the column existed lose the field. Rows written before still hold it in the catch-all.

## Tune ingestion

Two options of [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md) control how events reach ClickHouse: `max_batch_rows` sets the rows per insert, and `batch_timeout` sets how long a batch may wait. Every insert creates at least one part per partition it touches, so larger batches mean fewer parts and less merge work.

Inserts into tables with JSON columns need noticeably more server memory than inserts into typed columns. If ClickHouse reports `MEMORY_LIMIT_EXCEEDED`, reduce the number of concurrent writers or the batch size before adding memory.

Let ClickHouse [merge parts](https://clickhouse.com/docs/concepts/core-concepts/merges) in the background. Do not schedule `OPTIMIZE TABLE ... FINAL` as routine maintenance: it rewrites whole partitions and competes with ingestion for little gain.

## Complete table

This definition combines the single-table steps of the tutorial, except for storage tiering, which requires a storage policy in the server configuration. Adapt it to your data rather than copying it: choose the columns, sort key, indexes, and retention for your own queries, and remember that the sort key and partition key cannot change later.

```sql
CREATE TABLE ocsf.events (
  -- Sort key and partitioning
  time                           DateTime64(9, 'UTC') CODEC(Delta, ZSTD),
  class_uid                      Int32 DEFAULT 0,


  -- Classification
  category_uid                   Int8 DEFAULT 0,
  activity_id                    Int8 DEFAULT 0,
  type_uid                       Int32 DEFAULT 0,
  severity_id                    Int8 DEFAULT 0,
  status_id                      Nullable(Int8),


  -- Source identity
  `metadata.product.name`        LowCardinality(Nullable(String)),
  `metadata.product.vendor_name` LowCardinality(Nullable(String)),
  `metadata.event_code`          LowCardinality(Nullable(String)),
  `device.hostname`              LowCardinality(Nullable(String)),


  -- Network context
  `src_endpoint.ip`              Nullable(IPv6),
  `src_endpoint.port`            Nullable(Int32),
  `dst_endpoint.ip`              Nullable(IPv6),
  `dst_endpoint.port`            Nullable(Int32),


  -- Actors
  `user.name`                    LowCardinality(Nullable(String)),
  `actor.user.name`              LowCardinality(Nullable(String)),
  `actor.process.name`           LowCardinality(Nullable(String)),


  -- Original log line, kept for 30 days
  raw_data                       String DEFAULT '' CODEC(ZSTD(3))
                                 TTL toDateTime(time) + INTERVAL 30 DAY,


  -- Source fields without an OCSF equivalent
  unmapped                       JSON CODEC(ZSTD(3)),


  -- Everything else
  event                          JSON CODEC(ZSTD(3)) COMMENT 'tenzir:catch_all',


  INDEX idx_dst_ip `dst_endpoint.ip` TYPE bloom_filter(0.01) GRANULARITY 1,
  INDEX idx_raw_data raw_data TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1
)
ENGINE = MergeTree
PARTITION BY (class_uid, toYYYYMM(time))
ORDER BY (class_uid, time)
TTL toDateTime(time) + toIntervalDay(multiIf(
  class_uid = 4001, 30,
  class_uid = 4003, 90,
  365
))
SETTINGS ttl_only_drop_parts = 1;
```

## Clean up

Remove the container and the sample file when you are done:

```sh
docker rm -f clickhouse
rm ocsf-events.json.zst
```

## See also

* [ClickHouse](../integrations/clickhouse.md)
* [Map to OCSF](../guides/normalize/map-to-ocsf.md)
* [Onboard a data source](onboard-a-data-source.md)
