---
title: "Cloud Lakehouse integration"
description: "Write Iceberg tables to Google's Lakehouse for Apache Iceberg (formerly BigLake) and query them with BigQuery."
canonical: https://tenzir.com/integrations/google/cloud-lakehouse
source: https://tenzir.com/integrations/google/cloud-lakehouse.md
section: "Integrations"
---

# Cloud Lakehouse integration

> Write Iceberg tables to Google's Lakehouse for Apache Iceberg (formerly BigLake) and query them with BigQuery.

Google’s [Lakehouse for Apache Iceberg](https://docs.cloud.google.com/lakehouse/docs/lakehouse-iceberg-rest-catalog), formerly known as BigLake, serves an Apache Iceberg REST catalog on Google Cloud through the Lakehouse runtime catalog. Tenzir writes Iceberg tables to it with the [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) output operator, using one Google credential for both the catalog API and the `gs://` data plane: no HMAC keys, no S3-interop endpoint. The resulting tables are queryable from BigQuery, Spark, Trino, PyIceberg, and other Iceberg engines with Google Cloud Storage support.

Renamed from BigLake

Google renamed BigLake to Lakehouse on April 20, 2026, turning the BigLake metastore into the Lakehouse runtime catalog. The APIs, `gcloud` commands, and IAM role names retain the BigLake naming, so the technical identifiers throughout this page still say `biglake`.

## Catalog setup

Enable the API and create a multi-bucket catalog, the recommended type for new deployments:

```sh
gcloud services enable biglake.googleapis.com


gcloud biglake iceberg catalogs create my-catalog \
  --project my-project \
  --catalog-type biglake \
  --default-location gs://my-warehouse-bucket \
  --credential-mode end-user
```

* `--default-location` sets the bucket or subpath under which all namespaces and tables must reside.
* `--restricted-locations` optionally allows additional storage locations as a comma-separated list of `gs://` paths.
* All configured locations must be in the same geographic region group or jurisdiction (such as the United States or Europe), and the bucket regions must be compatible with the catalog’s primary location. Add `--primary-location US` or `--primary-location EU` when you plan to query the tables from BigQuery with corresponding multi-region buckets.

Legacy single-bucket catalogs (`--catalog-type gcs-bucket`) remain supported for compatibility. Such a catalog shares its name with its bucket, and clients reference it with a `gs://BUCKET` warehouse identifier instead of a `bl://` identifier.

## Namespace and table locations

Namespaces and tables must live under the catalog’s default or restricted locations, and a table’s path must additionally be nested under its parent namespace’s path; a location outside the namespace path fails the create request. When the catalog creates a table, it appends a random suffix to the requested location, so a table created with `location="gs://my-warehouse-bucket/lake/events"` registers a physical location like `gs://my-warehouse-bucket/lake/events/RANDOM_SUFFIX`. Read the authoritative location from the table metadata rather than assuming the requested path.

## Configuration

Point [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) at the stable `v1` REST endpoint and identify the catalog with a `bl://` warehouse:

```tql
subscribe "events"
to_iceberg "lake.events",
  catalog="https://biglake.googleapis.com/iceberg/v1/restcatalog",
  warehouse="bl://projects/my-project/catalogs/my-catalog",
  location="gs://my-warehouse-bucket/lake/events",
  gcp_service_account_key=secret("GCP_SA_KEY")
```

* `warehouse` is the `bl://projects/PROJECT_ID/catalogs/CATALOG_ID` identifier. For a legacy single-bucket catalog, pass `gs://BUCKET` instead and omit `location`.
* `location` selects where a newly created table stores its data and metadata; it must be under the catalog’s allowed locations. It has no effect on existing tables.
* The operator creates the namespace and table on first write.

## Authentication

One Google credential serves both the catalog and object storage, and the operator mints and refreshes OAuth2 tokens automatically:

* On GCE, GKE, or Cloud Run, set `gcp_auth=true` to use the workload’s Application Default Credentials. This is the recommended mode on Google Cloud.
* Elsewhere, pass a service account key with `gcp_service_account_key=secret("GCP_SA_KEY")`, which implies Google authentication.
* With end-user credentials (`gcloud auth application-default login`), add `gcp_project="my-project"` so Google bills request quota against that project.

Google authentication cannot be combined with `token`, and it requires a Tenzir build with Google Cloud support enabled.

## IAM

Grant the writer identity two roles:

| Role                       | Scope                             |
| -------------------------- | --------------------------------- |
| `roles/biglake.editor`     | The project that owns the catalog |
| `roles/storage.objectUser` | The warehouse bucket(s)           |

Readers need the viewer equivalents: `roles/biglake.viewer` on the project and `roles/storage.objectViewer` on the buckets.

Create the catalog with `--credential-mode end-user` for Tenzir: the operator brings its own Google credential for the data plane and has no way to request vended credentials. Catalogs in vended-credentials mode instead hand out delegated storage access to engines that request it through the Iceberg REST credential-vending header; the catalog service account then needs `roles/storage.objectUser` on all associated buckets, and readers need no direct bucket roles.

## Operational behavior

Events become visible to readers when [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) commits a snapshot; `timeout` and `max_size` control the visibility latency and the Parquet file sizes, with smaller files buying freshness at the cost of more snapshots and metadata. `location` applies only at table creation, and the partition spec is fixed after creation: a supplied `partition_by` must match an existing table’s spec. The operator evolves the table schema continuously as new fields appear in the stream, including nested fields. See the [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) reference for details.

## Maintenance

Streaming ingest fragments tables, and the Lakehouse runtime catalog limits the Iceberg `metadata.json` file to 1 MB, so plan the maintenance lifecycle from the start:

* Compact small data files regularly with an Iceberg-native engine, for example Spark’s `rewrite_data_files` procedure.
* Expire old snapshots to bound the metadata size; every commit adds a snapshot, and unexpired snapshots accumulate in `metadata.json`.
* Monitor the metadata size of high-frequency tables. A pipeline with a short `timeout` produces more commits and reaches the limit sooner.

## Query the tables with BigQuery

BigQuery addresses catalog tables through four-part naming:

```sql
SELECT count(*) AS events
FROM `my-project.my-catalog.lake.events`;
```

The catalog’s primary location must align with the bucket regions for BigQuery access, which is why `--primary-location` matters at catalog creation. Iceberg metadata tables such as snapshots or manifests are not addressable through BigQuery; inspect them with an Iceberg-native engine such as PyIceberg or Spark.

Every other Iceberg engine connects through the standard REST catalog with a Google OAuth2 bearer token (`gcloud auth print-access-token` for ad-hoc use).

## Verification and troubleshooting

Verify the setup end to end with a one-event pipeline:

```tql
from {x: 1, ts: now()}
to_iceberg "smoke.test",
  catalog="https://biglake.googleapis.com/iceberg/v1/restcatalog",
  warehouse="bl://projects/my-project/catalogs/my-catalog",
  location="gs://my-warehouse-bucket/smoke/test",
  gcp_auth=true
```

Then confirm the table exists and holds the event:

```sh
gcloud biglake iceberg catalogs describe my-catalog --project my-project
bq query --use_legacy_sql=false \
  'SELECT count(*) FROM `my-project.my-catalog.smoke.test`'
```

Common errors:

* **Malformed request**: usually a wrong `warehouse` format or a `location` outside the catalog’s allowed locations.
* **Permission denied**: the identity lacks `roles/biglake.editor` on the project or `roles/storage.objectUser` on the bucket.
* **Region mismatch**: the bucket is outside the catalog’s region group, or the catalog’s primary location does not match the bucket region for BigQuery access.

To clean up a test, drop the table and namespace with an Iceberg-aware engine, delete the catalog with `gcloud biglake iceberg catalogs delete`, and empty the warehouse bucket separately: deleting the catalog does not delete objects from Cloud Storage.

## See Also

* [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md)
* [Apache Iceberg](../iceberg.md)
* [Google Cloud Storage](cloud-storage.md)
* [Send to destinations](../../guides/route/send-to-destinations.md)
