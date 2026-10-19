---
title: "from_s3"
canonical: https://tenzir.com/docs/reference/operators/from_s3
source: https://tenzir.com/docs/reference/operators/from_s3.md
section: "Docs"
---

# from_s3

> Reads one or multiple files from Amazon S3.

Reads one or multiple files from Amazon S3.

```tql
from_s3 url:string, [anonymous=bool, aws_iam=record, watch=duration,
  remove=bool, rename=string->string, max_age=duration] { … }
```

## Description

The `from_s3` operator reads files from Amazon S3, with support for glob patterns, automatic format detection, and file monitoring.

By default, authentication is handled by AWS’s default credentials provider chain, which may read from multiple environment variables and credential files:

* `~/.aws/credentials` and `~/.aws/config`
* `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
* `AWS_SESSION_TOKEN`
* EC2 instance metadata service
* ECS container credentials

### `url: string`

URL identifying the S3 location where data should be read from.

The characters `*` and `**` have a special meaning. `*` matches everything except `/`. `**` matches everything including `/`. The sequence `/**/` can also match nothing. For example, `bucket/**/data` matches `bucket/data`.

Supported URI format: `s3://[<access-key>:<secret-key>@]<bucket-name>/<full-path-to-object>(?<options>)`

Options can be appended to the path as query parameters:

* `region`: AWS region (e.g., `us-east-1`)
* `scheme`: Connection scheme (`http` or `https`)
* `endpoint_override`: Custom S3-compatible endpoint
* `allow_bucket_creation`: Allow creating buckets if they don’t exist
* `allow_bucket_deletion`: Allow deleting buckets

### `anonymous = bool (optional)`

Use anonymous credentials instead of any configured authentication.

Defaults to `false`.

### `aws_iam = record (optional)`

Configures explicit AWS credentials or IAM role assumption. If not specified, the operator uses the AWS SDK’s default credential chain.

```tql
{
  region: string,            // AWS region for API requests.
  access_key_id: string,     // AWS access key ID.
  secret_access_key: string, // AWS secret access key.
  session_token: string,     // session token for temporary credentials.
  assume_role: string,       // ARN of IAM role to assume.
  session_name: string,      // session name for role assumption.
  external_id: string,       // external ID for role assumption.
  web_identity: record,      // OIDC web identity token configuration.
}
```

See [AWS Authentication](../aws-authentication.md) for a description of every field, the default credential chain, web identity configuration, and local authentication with the AWS CLI.

### `watch = duration (optional)`

In addition to processing all existing files, this option keeps the operator running, watching for new files that also match the given URL. The duration specifies the interval between filesystem scans. For example, `watch=30s` polls every 30 seconds.

Disabled by default.

### `remove = bool (optional)`

Deletes files after they have been read completely.

This also cleans up directory marker objects (zero-byte objects with keys ending in \`/\`) encountered while globbing. These markers are artifacts from some tools and can accumulate over time, increasing API costs. Removing them does not affect other files.

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
from_s3 "s3://my-bucket/data/**.json"
```

### Read CSV files using explicit credentials

```tql
from_s3 "s3://my-bucket/data.csv", aws_iam={
  access_key_id: "AKIAIOSFODNN7EXAMPLE",
  secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

### Read from S3-compatible service with custom endpoint

```tql
from_s3 "s3://my-bucket/data/**.json?endpoint_override=minio.example.com:9000&scheme=http"
```

### Read files continuously and assume IAM role

```tql
from_s3 "s3://logs/application/**.json", watch=10s, aws_iam={
  assume_role: "arn:aws:iam::123456789012:role/LogReaderRole"
}
```

### Process files and move them to an archive bucket

```tql
from_s3 "s3://input-bucket/**.json",
  rename=(path => f"archive/{path}")
```

### Add source path to events

```tql
from_s3 "s3://data-bucket/**.json" {
  read_json
  source_file = $file.path
}
```

### Read Zeek logs with anonymous access

```tql
from_s3 "s3://public-bucket/zeek/**.log", anonymous=true {
  read_zeek_tsv
}
```

## See Also

* [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md)
* [`from_s3`](https://tenzir.com/docs/reference/operators/from_s3.md)
* [`to_s3`](https://tenzir.com/docs/reference/operators/to_s3.md)
* [Amazon S3](../../integrations/amazon/s3.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
