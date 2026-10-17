---
title: "Apache Iceberg integration"
description: "An open table format for building lakehouses on object storage, with atomic commits, hidden partitioning, and schema evolution."
canonical: https://tenzir.com/integrations/iceberg
source: https://tenzir.com/integrations/iceberg.md
section: "Integrations"
---

# Apache Iceberg integration

> An open table format for building lakehouses on object storage, with atomic commits, hidden partitioning, and schema evolution.

[Apache Iceberg](https://iceberg.apache.org) is an open table format for analytic datasets on object storage. Tables live as Parquet files plus metadata, coordinated through a catalog, and any Iceberg-aware engine such as Spark, Trino, DuckDB, or Snowflake can query them. Tenzir writes events into Iceberg tables with the [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) output operator, turning a pipeline into the ingest layer of your lakehouse.

Tenzir connects to an Iceberg REST catalog and handles the full write path: it creates missing tables from the shape of the first arriving events, evolves the table schema as new fields appear in the stream, writes Zstandard-compressed Parquet data files with per-column metrics, and commits them as atomic snapshots. Tables partition through Iceberg’s hidden partitioning, so recommendations like partitioning OCSF events by `class_uid` and `day(time)` need no helper columns.

## Examples

### Build an OCSF lakehouse

Map events to [OCSF](https://schema.ocsf.io) upstream and let [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) create and maintain a single wide table:

```tql
subscribe "ocsf"
ocsf_cast
to_iceberg "security.ocsf",
  catalog="https://catalog.example.com",
  partition_by=[class_uid, day(time)]
```

New OCSF classes appearing in the stream widen the table with a metadata-only schema update; no name mappings or manual `ALTER TABLE` steps required.

### Write to MinIO or another S3-compatible store

```tql
subscribe "events"
to_iceberg "lake.events",
  catalog="http://localhost:8181",
  s3_endpoint="http://localhost:9000",
  aws_iam={access_key_id: "minioadmin", secret_access_key: "minioadmin"}
```

### Append to a table managed outside of Tenzir

```tql
subscribe "events"
to_iceberg "lake.events",
  catalog="https://catalog.example.com",
  mode="append",
  token=secret("CATALOG_TOKEN")
```

Existing tables keep their own partition spec and schema governance; Tenzir appends and evolves within what the table allows.

## See Also

* [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md)
* [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md)
* [AWS Glue](amazon/glue.md)
* [Cloud Lakehouse](google/cloud-lakehouse.md)
* [Send to destinations](../guides/route/send-to-destinations.md)
