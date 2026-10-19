---
title: "to_file"
canonical: https://tenzir.com/docs/reference/operators/to_file
source: https://tenzir.com/docs/reference/operators/to_file.md
section: "Docs"
---

# to_file

> Writes events to one or multiple files on a filesystem.

Writes events to one or multiple files on a filesystem.

```tql
to_file url:string, [max_size=int, timeout=duration,
        partition_by=list<field>, append=bool] { … }
```

## Description

The `to_file` operator writes events to local filesystems, automatically opening new files when a rotation condition triggers. It supports hive-style partitioning through a `**` placeholder in the URL and per-partition unique filenames through a `{uuid}` placeholder.

### `url: string`

Path or URL identifying where files should be written.

When `~` is the first character, it is substituted with the value of the `$HOME` environment variable. Relative paths are resolved against the current working directory.

The path may contain two placeholders:

* `**` marks the location where hive partition segments are inserted. When present, `partition_by` must also be set, and vice versa.
* `{uuid}` expands to a fresh UUIDv7 for every file. This is required when partitioning or when rotation can produce multiple files, so that rotated or per-partition files do not overwrite each other.

### `max_size = int (optional)`

Rotates to a new file after the writer subpipeline emits at least this many bytes. The operator checks the size after each emitted chunk, so the resulting file can exceed `max_size` by that chunk and by final format metadata.

Size-based rotation requires the writer subpipeline to emit bytes while it receives events. A blocking operator such as `sort` buffers its complete input, so `max_size` cannot split its output. In that case, `timeout`, the end of input, or a graceful stop closes the file.

Defaults to `100M`.

### `timeout = duration (optional)`

Rotates to a new file after the current file has been open for this duration. Rotation is measured from the time the file was first opened.

Defaults to `5min`.

### `partition_by = list<field> (optional)`

A list of fields used to partition events into separate files. For every distinct combination of partition-field values, a separate file (or group of rotated files) is written. The URL must contain a `**` placeholder, which is replaced by the hive-style path `field1=value1/field2=value2/…`.

The operator removes the partition fields before it sends events to the writer subpipeline. Their values remain available in the generated path, but not in the serialized records.

### `{ … }`

Pipeline that transforms the incoming events into the byte stream that is written to each file. The pipeline must return bytes, so it must end with a writer such as `write_ndjson`, `write_parquet`, or `write_csv`, optionally followed by a compressor such as `compress_gzip`.

The subpipeline runs once per output file. When rotation or partitioning produces a new file, a new instance of the subpipeline is spawned for it.

### `append = bool (optional)`

If `true`, existing files are opened for appending instead of truncated. Useful for accumulating output across pipeline runs into a stable path. When combined with a `{uuid}` placeholder the flag is a no-op, since every rotation already targets a fresh filename.

Defaults to `false`.

## Examples

### Write all events to a single NDJSON file

```tql
from {msg: "hello"}, {msg: "world"}
to_file "/tmp/out.json" {
  write_ndjson
}
```

### Partition events by a field into separate files

```tql
from {region: "us", n: 1},
     {region: "eu", n: 2},
     {region: "us", n: 3}
to_file "/tmp/events/**/data_{uuid}.json", partition_by=[region] {
  write_ndjson
}
// Produces files under:
//   /tmp/events/region=us/data_<uuid>.json
//   /tmp/events/region=eu/data_<uuid>.json
```

### Partition by multiple fields

```tql
to_file "/tmp/events/**/data_{uuid}.parquet",
  partition_by=[year, month] {
  write_parquet
}
// Produces files under:
//   /tmp/events/year=<year>/month=<month>/data_<uuid>.parquet
```

### Rotate files when they exceed a size

```tql
to_file "/tmp/logs/events_{uuid}.json", max_size=10M {
  write_ndjson
}
```

### Rotate files after a fixed duration

```tql
to_file "/tmp/logs/events_{uuid}.json", timeout=1min {
  write_ndjson
}
```

## See Also

* [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md)
* [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md)
* [File](../../integrations/file.md)
