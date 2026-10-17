---
title: "from_google_cloud_storage"
canonical: https://tenzir.com/docs/reference/operators/from_google_cloud_storage
source: https://tenzir.com/docs/reference/operators/from_google_cloud_storage.md
section: "Docs"
---

# from_google_cloud_storage

> Reads one or multiple files from Google Cloud Storage.

Reads one or multiple files from Google Cloud Storage.

```tql
from_google_cloud_storage url:string, [anonymous=bool, watch=duration,
  remove=bool, rename=string->string, max_age=duration] { … }
```

## Description

The `from_google_cloud_storage` operator reads files from Google Cloud Storage, with support for glob patterns, automatic format detection, and file monitoring.

By default, authentication is handled by Google’s Application Default Credentials (ADC) chain, which may read from multiple sources:

* `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to a service account key file
* User credentials from `gcloud auth application-default login`
* Service account attached to the compute instance (Compute Engine, GKE)
* Google Cloud SDK credentials

### `url: string`

URL identifying the Google Cloud Storage location where data should be read from.

The characters `*` and `**` have a special meaning. `*` matches everything except `/`. `**` matches everything including `/`. The sequence `/**/` can also match nothing. For example, `bucket/**/data` matches `bucket/data`.

The syntax is `gs://<bucket-name>/<full-path-to-object>(?<options>)`. The `<options>` are query parameters. Per the [Arrow documentation](https://arrow.apache.org/docs/r/articles/fs.html#connecting-directly-with-a-uri), the following options exist:

> For GCS, the supported parameters are `scheme`, `endpoint_override`, and `retry_limit_seconds`.

### `anonymous = bool (optional)`

Use anonymous credentials instead of any configured authentication. This only works for publicly readable buckets and objects.

Defaults to `false`.

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

### Parallelism

When you enable [parallelism](../../guides/node-setup/tune-performance.md#parallelism), each file is read by exactly one operator instance. The number of files read at the same time is therefore at most the degree of parallelism, and never more than the number of matched files. Events from different files interleave in the output.

## Examples

### Read every JSON file from a bucket

```tql
from_google_cloud_storage "gs://my-bucket/data/**.json"
```

### Read CSV files from a public bucket

```tql
from_google_cloud_storage "gs://public-dataset/data.csv", anonymous=true
```

### Read Zeek logs continuously

```tql
from_google_cloud_storage "gs://logs/zeek/**.log", watch=10s {
  read_zeek_tsv
}
```

### Add source path to events

```tql
from_google_cloud_storage "gs://data-bucket/**.json" {
  read_json
  source_file = $file.path
}
```

### Read Suricata EVE JSON logs with custom parsing

```tql
from_google_cloud_storage "gs://security-logs/suricata/**.json" {
  read_suricata
}
```

## See Also

* [`from_google_cloud_storage`](https://tenzir.com/docs/reference/operators/from_google_cloud_storage.md)
* [`to_google_cloud_storage`](https://tenzir.com/docs/reference/operators/to_google_cloud_storage.md)
* [Google Cloud Storage](../../integrations/google/cloud-storage.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
