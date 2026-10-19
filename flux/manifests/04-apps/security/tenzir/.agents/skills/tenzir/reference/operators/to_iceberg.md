---
title: "to_iceberg"
canonical: https://tenzir.com/docs/reference/operators/to_iceberg
source: https://tenzir.com/docs/reference/operators/to_iceberg.md
section: "Docs"
---

# to_iceberg

> Writes events to an Apache Iceberg table through a REST catalog.

Writes events to an Apache Iceberg table through a REST catalog.

```tql
to_iceberg table:string, catalog=string,
  [mode=string, partition_by=list, warehouse=string, location=string,
   catalog_aws_service=string, token=string, aws_iam=record,
   s3_endpoint=string, s3_path_style=bool,
   gcp_auth=bool, gcp_service_account_key=string, gcp_project=string,
   max_size=int, buffer_size=int, timeout=duration]
```

## Description

The `to_iceberg` operator appends events to an [Apache Iceberg](https://iceberg.apache.org) table. It talks to an Iceberg REST catalog for table metadata and writes Zstandard-compressed Parquet data files with field IDs and per-column metrics directly to the table’s object store. Data files carry only the columns for which the written events hold data; readers restore omitted columns as null through Iceberg’s field-ID projection, so table columns your events never use cost neither storage nor write time. Each rotation commits one snapshot; commits verify that they landed and retry on top of concurrent updates.

Experimental

This operator is experimental. A crash can lose events that have not yet been committed. With the default settings, this can affect up to 15 minutes of data.

### `table: string`

The identifier of the table in the form `namespace.table_name`. Additional dots address nested namespaces, e.g., `prod.security.ocsf`. Missing namespaces are created automatically when the operator creates the table.

### `catalog = string`

The URL of the Iceberg REST catalog, e.g., `https://catalog.example.com`.

### `mode = string (optional)`

* `"create_append"`: Creates the table if it does not exist, then appends.
* `"create"`: Creates the table. Fails if the table already exists.
* `"append"`: Appends to an existing table. Fails if the table does not exist.

Defaults to `"create_append"`.

### `partition_by = list (optional)`

Fields and partition transforms that define the partition spec when the operator creates the table, e.g., `partition_by=[class_uid, day(time)]`. The partition spec of an existing table governs writes and cannot be changed by this operator. A supplied `partition_by` must match the existing spec field by field; on a mismatch, the operator fails with a diagnostic that shows both specs. Drop `partition_by` to append to a table as-is.

Iceberg uses *hidden partitioning*: transforms derive partition values from regular columns, so no helper columns materialize in your data. The supported transforms are:

* `year(field)`, `month(field)`, `day(field)`, `hour(field)`: partition by a time granularity derived from a timestamp field.
* `bucket(field, n)`: partition by a hash of the field, modulo `n`.
* `truncate(field, w)`: partition by the field value truncated to width `w`.

A bare field partitions by its identity, i.e., its exact value.

### `warehouse = string (optional)`

The catalog-specific warehouse identifier, for catalogs that serve multiple warehouses. Its format depends on the catalog:

* AWS Glue: the Glue catalog ID, typically the 12-digit AWS account ID.
* Amazon S3 Tables: the table bucket ARN.
* Google Lakehouse (formerly BigLake): a `bl://projects/PROJECT_ID/catalogs/CATALOG_ID` identifier, or `gs://BUCKET` for a single-bucket catalog.
* Other REST catalogs: the warehouse identifier that catalog expects.

`warehouse` identifies a catalog or warehouse; use `location` to select the physical object-store location of a newly created table.

### `location = string (optional)`

The object-store location for tables the operator creates, e.g., `s3://bucket/warehouse/security/events` or `gs://bucket/warehouse/security/events`.

Existing tables retain their registered location, so this argument has no effect when appending to them. Omit it when the catalog assigns table locations automatically.

### `catalog_aws_service = string (optional)`

Authenticates requests to an AWS-managed Iceberg REST catalog with AWS Signature Version 4:

* `"glue"`: signs for the AWS Glue Data Catalog.
* `"s3tables"`: signs for Amazon S3 Tables.

Credentials come from `aws_iam` when supplied and from the AWS default credentials provider chain otherwise. The same refreshable provider authenticates catalog requests and S3 data-file operations. Configure the AWS Region through `aws_iam`, the selected AWS profile, or the `AWS_REGION` or `AWS_DEFAULT_REGION` environment variables.

Cannot be combined with `token` or Google authentication.

### `token = string (optional)`

A bearer token for authenticating requests to the catalog.

Cannot be combined with `catalog_aws_service` or Google authentication, which mints and refreshes tokens automatically.

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

### `s3_endpoint = string (optional)`

A custom endpoint for S3-compatible object stores such as MinIO. Requests authenticate with AWS Signature Version 4, so pair this with `aws_iam` to provide credentials.

### `s3_path_style = bool (optional)`

Uses path-style addressing (`endpoint/bucket/key`) instead of virtual-hosted addressing (`bucket.endpoint/key`).

Requires `s3_endpoint` and defaults to `true` when it is set, since most S3-compatible stores require path-style addressing. Set `s3_path_style=false` for stores that use virtual-hosted addressing.

### `gcp_auth = bool (optional)`

Authenticates against Google-hosted catalogs, such as the Lakehouse runtime catalog, with Application Default Credentials. One credential serves both the catalog and `gs://` object storage.

Defaults to `false`.

### `gcp_service_account_key = string (optional)`

A Google service account key in JSON format. Implies Google authentication, so `gcp_auth` does not need to be set.

### `gcp_project = string (optional)`

The Google Cloud project to bill and scope requests to, when it differs from the project of the credential.

Requires Google authentication.

### `max_size = int (optional)`

The size in bytes at which a data file rotates and its snapshot commits.

Defaults to `512Mi`, matching Iceberg’s default write target.

### `buffer_size = int (optional)`

The total in-memory budget in bytes across all partition buffers. When the budget is exceeded, the largest buffer closes into a data file early. The budget, not the partition count, bounds memory: with many partitions buffering, file sizes degrade gracefully instead of thrashing open writers.

Defaults to `1Gi`.

### `timeout = duration (optional)`

The maximum time a data file stays open before it rotates and its snapshot commits, bounding the freshness lag of the table.

Defaults to `15min`.

## Table creation

With `mode="create_append"` (the default) or `mode="create"`, the operator derives the table schema from the first arriving events. Records map to Iceberg structs and stay nested; nothing flattens. Types map as follows:

| Tenzir type | Iceberg type  | Notes                                                                               |
| ----------- | ------------- | ----------------------------------------------------------------------------------- |
| `bool`      | `boolean`     |                                                                                     |
| `int64`     | `long`        |                                                                                     |
| `uint64`    | `long`        | Iceberg has no unsigned integers. Values above 2^63 - 1 become null with a warning. |
| `double`    | `double`      |                                                                                     |
| `duration`  | `long`        | The duration as a count of nanoseconds.                                             |
| `time`      | `timestamptz` | Microsecond precision. Nanoseconds truncate on write.                               |
| `string`    | `string`      |                                                                                     |
| `ip`        | `string`      |                                                                                     |
| `subnet`    | `string`      |                                                                                     |
| `blob`      | `binary`      |                                                                                     |
| `list`      | `list`        | The element type maps recursively.                                                  |
| `record`    | `struct`      | Fields map recursively.                                                             |

Fields with no Iceberg representation are dropped from the table schema with a warning: fields whose values are all null (they carry no type to derive) and legacy `map` fields. A record whose fields are all dropped is dropped as a whole. Individual values that cannot convert, such as a `uint64` above the `long` range, become null without affecting neighboring rows.

When the schema has a top-level `time` field of timestamp type, following the OCSF event convention, created tables register `time` as their sort order, and column metrics default to settings that keep manifests small while retaining time-range pruning.

## Schema evolution

The operator evolves the table schema continuously. Fields the table does not have yet, at any nesting depth, are added through a metadata-only schema update *before* any data file carries them, so heterogeneous streams converge into one wide table without name mappings or manual `ALTER TABLE` steps. Existing columns too narrow for incoming values widen in place where the Iceberg spec allows it (`int` to `long`, `float` to `double`). Individual values that still cannot convert land as null without affecting neighboring rows. Concurrent writers reconcile by reloading the table and re-diffing their schema against it.

## Commits and visibility

Events become visible to readers when the operator commits a snapshot, not when they enter the pipeline. A snapshot commits whenever a data file rotates, either when the file reaches `max_size` or when `timeout` expires. With the defaults, events appear in the table within 15 minutes. Lower `timeout` for a fresher table, but expect smaller data files, more snapshots, and more metadata in exchange.

When the input ends or you stop the pipeline gracefully, the operator closes all open files and commits the remaining events. A finite pipeline therefore shows its complete output as soon as it finishes. A graceful stop does not discard buffered events.

A hard crash does not get that chance: events that were not yet committed are currently lost. `timeout` bounds this exposure window the same way it bounds freshness, and shrinking it carries the same cost in files and metadata. A future release will close this window when pipelines gain checkpointing.

## Examples

### Build an OCSF lakehouse

Map events to OCSF upstream, then let the operator create and maintain the table:

```tql
subscribe "ocsf"
ocsf_cast
to_iceberg "security.ocsf",
  catalog="https://catalog.example.com",
  partition_by=[class_uid, day(time)]
```

### Write to MinIO or another S3-compatible store

```tql
subscribe "events"
to_iceberg "lake.events",
  catalog="http://localhost:8181",
  s3_endpoint="http://localhost:9000",
  aws_iam={access_key_id: "minioadmin", secret_access_key: "minioadmin"}
```

### Write to AWS Glue

```tql
subscribe "ocsf"
ocsf_cast
to_iceberg "security.events",
  catalog="https://glue.eu-central-1.amazonaws.com/iceberg",
  catalog_aws_service="glue",
  warehouse="123456789012",
  location="s3://my-bucket/warehouse/security/events",
  partition_by=[class_uid, day(time)]
```

The Glue database must already exist unless the AWS identity has permission to create it. Creating tables requires both IAM and Lake Formation permissions.

### Write to Amazon S3 Tables

```tql
subscribe "events"
to_iceberg "security.events",
  catalog="https://s3tables.eu-central-1.amazonaws.com/iceberg",
  catalog_aws_service="s3tables",
  warehouse="arn:aws:s3tables:eu-central-1:123456789012:bucket/security-lake"
```

There is no `location`: S3 Tables assigns the physical warehouse location itself.

### Write to Google Lakehouse with a service account

```tql
subscribe "events"
to_iceberg "lake.events",
  catalog="https://biglake.googleapis.com/iceberg/v1/restcatalog",
  warehouse="bl://projects/my-project/catalogs/my-catalog",
  location="gs://my-warehouse-bucket/lake/events",
  gcp_service_account_key=secret("GCP_SA_KEY")
```

Google recommends `bl://` multi-bucket catalogs for new deployments; `gs://` single-bucket catalogs remain supported and need no `location`.

### Append to a table managed outside of Tenzir

```tql
subscribe "events"
to_iceberg "lake.events",
  catalog="https://catalog.example.com",
  mode="append",
  token=secret("CATALOG_TOKEN")
```

## See Also

* [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md)
* [`to_s3`](https://tenzir.com/docs/reference/operators/to_s3.md)
* [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md)
* [Send to destinations](../../guides/route/send-to-destinations.md)
* [Apache Iceberg](../../integrations/iceberg.md)
* [AWS Glue](../../integrations/amazon/glue.md)
* [Cloud Lakehouse](../../integrations/google/cloud-lakehouse.md)
