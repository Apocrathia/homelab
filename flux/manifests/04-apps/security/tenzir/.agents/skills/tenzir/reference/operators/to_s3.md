---
title: "to_s3"
canonical: https://tenzir.com/docs/reference/operators/to_s3
source: https://tenzir.com/docs/reference/operators/to_s3.md
section: "Docs"
---

# to_s3

> Writes events to one or multiple objects in Amazon S3.

Writes events to one or multiple objects in Amazon S3.

```tql
to_s3 url:string, [anonymous=bool, aws_iam=record, max_size=int,
      timeout=duration, partition_by=list<field>] { … }
```

## Description

The `to_s3` operator writes events to Amazon S3, automatically opening new objects when a rotation condition triggers. It supports hive-style partitioning through a `**` placeholder in the URL and per-partition unique object keys through a `{uuid}` placeholder.

By default, authentication is handled by AWS’s default credentials provider chain, which may read from multiple environment variables and credential files:

* `~/.aws/credentials` and `~/.aws/config`
* `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
* `AWS_SESSION_TOKEN`
* EC2 instance metadata service
* ECS container credentials

### `url: string`

URL identifying the S3 location where data should be written.

Supported URI format: `s3://[<access-key>:<secret-key>@]<bucket-name>/<full-path-to-object>(?<options>)`

Options can be appended to the path as query parameters:

* `region`: AWS region (e.g., `us-east-1`)
* `scheme`: Connection scheme (`http` or `https`)
* `endpoint_override`: Custom S3-compatible endpoint
* `allow_bucket_creation`: Allow creating buckets if they don’t exist
* `allow_bucket_deletion`: Allow deleting buckets

The path portion may contain two placeholders:

* `**` marks the location where hive partition segments are inserted. When present, `partition_by` must also be set, and vice versa.
* `{uuid}` expands to a fresh UUIDv7 for every object. This is required when partitioning or when rotation can produce multiple objects, so that rotated or per-partition objects do not overwrite each other.

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

## Examples

### Write a single NDJSON object to S3

```tql
to_s3 "s3://my-bucket/events/out_{uuid}.json" {
  write_ndjson
}
```

### Partition events by date into Parquet objects

```tql
to_s3 "s3://my-bucket/events/**/data_{uuid}.parquet",
  partition_by=[year, month, day] {
  write_parquet
}
// Produces objects under:
//   s3://my-bucket/events/year=<year>/month=<month>/day=<day>/data_<uuid>.parquet
```

### Write with explicit credentials

```tql
to_s3 "s3://my-bucket/data/out_{uuid}.json",
  aws_iam={
    access_key_id: "AKIAIOSFODNN7EXAMPLE",
    secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  } {
  write_ndjson
}
```

### Write to an S3-compatible endpoint

```tql
to_s3 "s3://my-bucket/data/out_{uuid}.json?endpoint_override=minio.example.com:9000&scheme=http" {
  write_ndjson
}
```

### Rotate to a new object every 10 MB

```tql
to_s3 "s3://my-bucket/logs/events_{uuid}.json.gz", max_size=10M {
  write_ndjson
  compress_gzip
}
```

## See Also

* [`from_s3`](https://tenzir.com/docs/reference/operators/from_s3.md)
* [`to_s3`](https://tenzir.com/docs/reference/operators/to_s3.md)
* [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md)
* [Amazon S3](../../integrations/amazon/s3.md)
