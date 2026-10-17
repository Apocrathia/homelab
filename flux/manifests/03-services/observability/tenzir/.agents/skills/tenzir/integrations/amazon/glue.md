---
title: "AWS Glue integration"
description: "Write Iceberg tables to the AWS Glue Data Catalog and query them with Athena."
canonical: https://tenzir.com/integrations/amazon/glue
source: https://tenzir.com/integrations/amazon/glue.md
section: "Integrations"
---

# AWS Glue integration

> Write Iceberg tables to the AWS Glue Data Catalog and query them with Athena.

The [AWS Glue Data Catalog](https://docs.aws.amazon.com/glue/latest/dg/connect-glu-iceberg-rest.html) provides a regional Apache Iceberg REST endpoint. Tenzir writes Iceberg tables to it with the [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) output operator, authenticating requests with AWS Signature Version 4. The resulting tables are regular Glue tables backed by Parquet files in your S3 bucket, ready for Athena, EMR, Redshift Spectrum, and other services and engines that support Iceberg tables registered in the AWS Glue Data Catalog.

## Configuration

Point [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) at the regional Glue Iceberg endpoint and select SigV4 signing with `catalog_aws_service="glue"`:

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

The arguments map to Glue as follows:

* The table identifier must have the form `DATABASE.TABLE`, such as `security.events`: AWS Glue supports only single-level namespaces in Iceberg REST requests.
* `warehouse` is the Glue catalog ID, which is usually the 12-digit AWS account ID.
* `location` is the S3 location for a newly created table. It does not relocate an existing table; existing tables retain their registered location.
* `partition_by` defines the table’s partition spec only during creation.
* The Glue database (`security` in the example) should normally exist before the pipeline starts. `to_iceberg` creates a missing table, but creating the containing database requires an AWS identity with the corresponding permissions.

Create the database with the bucket as its default location:

```sh
aws glue create-database \
  --region eu-central-1 \
  --database-input '{
    "Name": "security",
    "LocationUri": "s3://my-bucket/warehouse/security/"
  }'
```

## Authentication

Prefer the AWS default credentials provider chain over per-pipeline credentials: the same environment then works for [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md), [`to_s3`](https://tenzir.com/docs/reference/operators/to_s3.md), and [`from_s3`](https://tenzir.com/docs/reference/operators/from_s3.md) without operator-specific configuration.

* On AWS, attach an EC2 instance role, an ECS task role, or an EKS workload identity to the workload that runs the Tenzir node.
* Outside AWS, use [IAM Roles Anywhere](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/getting-started.html) through a `credential_process` profile. The AWS `aws_signing_helper` is a separate AWS executable, not included with Tenzir, that exchanges an X.509 client certificate for temporary role credentials.
* Select the profile and Region through `AWS_PROFILE` and `AWS_REGION` in the Tenzir service environment. Temporary credentials refresh automatically; the same refreshable provider signs both Glue catalog requests and S3 data-file operations.
* Do not pass temporary `access_key_id`, `secret_access_key`, and `session_token` values through `aws_iam`; those values cannot refresh, and the pipeline stops authenticating when they expire. Use the default credential chain or `aws_iam={profile: "..."}` instead.

See [AWS Authentication](../../reference/aws-authentication.md) for the full setup, including the Roles Anywhere profile format.

## Permissions

The Glue Iceberg REST endpoint enforces two authorization layers, and both are required. An IAM allow does not replace the corresponding Lake Formation grant, and administrator IAM policies such as `AdministratorAccess` do not bypass Lake Formation.

First, the writer role needs IAM permissions for the Glue and S3 API operations:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GlueCatalog",
      "Effect": "Allow",
      "Action": "glue:GetCatalog",
      "Resource": "arn:aws:glue:REGION:ACCOUNT_ID:catalog"
    },
    {
      "Sid": "GlueDatabaseAndTables",
      "Effect": "Allow",
      "Action": [
        "glue:GetDatabase",
        "glue:GetDatabases",
        "glue:GetTable",
        "glue:GetTables",
        "glue:CreateTable",
        "glue:UpdateTable"
      ],
      "Resource": [
        "arn:aws:glue:REGION:ACCOUNT_ID:catalog",
        "arn:aws:glue:REGION:ACCOUNT_ID:database/DATABASE",
        "arn:aws:glue:REGION:ACCOUNT_ID:table/DATABASE/*"
      ]
    },
    {
      "Sid": "WarehouseBucket",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads"
      ],
      "Resource": "arn:aws:s3:::BUCKET"
    },
    {
      "Sid": "WarehouseObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": "arn:aws:s3:::BUCKET/warehouse/*"
    }
  ]
}
```

The policy assumes the database already exists and reflects the configuration validated during testing, not necessarily the absolute minimum. Adjust the S3 statements when `location` uses another bucket or prefix. When the S3 location is registered with Lake Formation, the role may additionally need the [`DATA_LOCATION_ACCESS`](https://docs.aws.amazon.com/lake-formation/latest/dg/lf-permissions-reference.html) permission. To let the operator’s identity create missing databases, add `glue:CreateDatabase` to the IAM policy and `CREATE_DATABASE` on the catalog in Lake Formation.

Second, grant the writer role these Lake Formation data lake permissions:

| Resource                   | Permissions                             |
| -------------------------- | --------------------------------------- |
| The database               | `DESCRIBE`, `CREATE_TABLE`              |
| All tables in the database | `DESCRIBE`, `SELECT`, `INSERT`, `ALTER` |

## Query the tables with Athena

Athena reads the table schema from the Glue Data Catalog, but Lake Formation authorizes the identity that runs the query. Permissions granted to the Tenzir writer role do not transfer to the IAM or IAM Identity Center identity in the Athena console. Grant the querying principal `DESCRIBE` on the database plus `DESCRIBE` and `SELECT` on all columns of the table. The querying identity also needs its regular Athena IAM permissions and access to the workgroup’s query-results S3 location.

Nested Tenzir records arrive as Iceberg structs, so nested fields are directly addressable in SQL:

```sql
SELECT time, process.name, process.path
FROM "security"."events"
WHERE lower(process.name) = 'explorer.exe';
```

### Troubleshooting

`COLUMN_NOT_FOUND: Relation contains no accessible columns` usually indicates missing Lake Formation `SELECT` access for the querying identity, not damaged Iceberg data.

## Operational behavior

Events become visible to readers when [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) commits a snapshot; `timeout` and `max_size` control the visibility latency, and `max_size`, `timeout`, `buffer_size`, and the number of active partitions influence the Parquet file sizes. Day partitioning does not imply one Parquet file per day: each rotation adds a file to the partition. The operator evolves the table schema continuously as new fields appear in the stream, including nested fields. See the [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md) reference for details.

## See Also

* [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md)
* [AWS Authentication](../../reference/aws-authentication.md)
* [Apache Iceberg](../iceberg.md)
* [Amazon S3](s3.md)
* [Send to destinations](../../guides/route/send-to-destinations.md)
