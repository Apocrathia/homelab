---
title: "from_file"
canonical: https://tenzir.com/docs/reference/operators/from_file
source: https://tenzir.com/docs/reference/operators/from_file.md
section: "Docs"
---

# from_file

> Reads one or multiple files from a filesystem.

Reads one or multiple files from a filesystem.

```tql
from_file url:string, [watch=duration, remove=bool, rename=string->string,
          max_age=duration, mmap=bool] { … }
```

## Description

The `from_file` operator reads files from local filesystems or cloud storage, with support for glob patterns, automatic format detection, and file monitoring.

### `url: string`

URL or local filesystem path where data should be read from.

The characters `*` and `**` have a special meaning. `*` matches everything except `/`. `**` matches everything including `/`. The sequence `/**/` can also match nothing. For example, `foo/**/bar` matches `foo/bar`.

The URL can include additional options. For `s3://`, the options that can be included in the URI as query parameters are `region`, `scheme`, `endpoint_override`, `allow_bucket_creation`, and `allow_bucket_deletion`. For `gs://`, the supported parameters are `scheme`, `endpoint_override`, and `retry_limit_seconds`.

### `watch = duration (optional)`

In addition to processing all existing files, this option keeps the operator running, watching for new files that also match the given URL. The duration specifies the interval between filesystem scans. For example, `watch=30s` polls every 30 seconds.

Disabled by default.

### `remove = bool (optional)`

Deletes files after they have been read completely.

Defaults to `false`.

### `rename = string -> string (optional)`

Renames files after they have been read completely. The lambda function receives the original path as an argument and must return the new path.

If the target path already exists, the operator will overwrite the file.

The operator automatically creates any intermediate directories required for the target path. If the target path ends with a trailing slash (`/`), the original filename will be automatically appended to create the final path.

### `max_age = duration (optional)`

Only process files that were modified within the specified duration from the current time. Files older than this duration will be skipped.

### `{ … } (optional)`

Pipeline to use for parsing the file. By default, this pipeline is derived from the path of the file, and will not only handle parsing but also decompression if applicable.

Inside the subpipeline, the `$file` variable is available as a record with the following fields:

| Field   | Type     | Description                              |
| ------- | -------- | ---------------------------------------- |
| `path`  | `string` | The absolute path of the file being read |
| `mtime` | `time`   | The last modification time of the file   |

For example, to attach the source path to each event:

```tql
from_file "/data/*.json" {
  read_json
  source = $file.path
}
```

### `mmap = bool (optional)`

Uses memory-mapped I/O for reading files instead of regular reads. This can improve performance for large files.

Defaults to `false`.

The pipeline uses the same format and compression inference logic as other file sources.

### Parallelism

When you enable [parallelism](../../guides/node-setup/tune-performance.md#parallelism), each file is read by exactly one operator instance. The number of files read at the same time is therefore at most the degree of parallelism, and never more than the number of matched files. Events from different files interleave in the output.

## Examples

### Read every `.csv` file from S3

```tql
from_file "s3://my-bucket/**.csv"
```

### Read every `.json` file in `/data` as Suricata EVE JSON

```tql
from_file "/data/**.json" {
  read_suricata
}
```

### Read all files from S3 continuously and delete them afterwards

```tql
from_file "s3://my-bucket/**", watch=10s, remove=true
```

### Move files to a directory, preserving filenames

```tql
// The trailing slash automatically appends the original filename
from_file "/input/*.json", rename=path => "/output/"
```

### Process only recently modified files

```tql
// Only process files modified in the last hour
from_file "/logs/*.json", max_age=1h
```

## See Also

* [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md)
* [Enrich with asset inventory](../../guides/enrich/enrich-with-asset-inventory.md)
* [Use lookup tables](../../guides/enrich/use-lookup-tables.md)
* [Import into a node](../../guides/store/import-into-a-node.md)
* [File](../../integrations/file.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
