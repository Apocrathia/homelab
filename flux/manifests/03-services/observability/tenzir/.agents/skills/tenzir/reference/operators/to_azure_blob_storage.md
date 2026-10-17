---
title: "to_azure_blob_storage"
canonical: https://tenzir.com/docs/reference/operators/to_azure_blob_storage
source: https://tenzir.com/docs/reference/operators/to_azure_blob_storage.md
section: "Docs"
---

# to_azure_blob_storage

> Writes events to one or multiple blobs in Azure Blob Storage.

Writes events to one or multiple blobs in Azure Blob Storage.

```tql
to_azure_blob_storage url:string, [account_key=string, azure_auth=record,
                     max_size=int, timeout=duration,
                     partition_by=list<field>] { … }
```

## Description

The `to_azure_blob_storage` operator writes events to Azure Blob Storage, automatically opening new blobs when a rotation condition triggers. It supports hive-style partitioning through a `**` placeholder in the URL and per-partition unique blob names through a `{uuid}` placeholder.

By default, authentication is handled by the Azure SDK’s credential chain, which reads process-wide environment variables. Pass `azure_auth` to give one operator instance its own Entra identity, as our [Azure Authentication](../azure-authentication.md) reference explains.

### `url: string`

URL identifying the Azure Blob Storage location where data should be written.

Supported URI formats:

1. `abfs[s]://<account>.blob.core.windows.net[/<container>[/<path>]]`
2. `abfs[s]://<container>@<account>.dfs.core.windows.net[/<path>]`
3. `abfs[s]://[<account>@]<host>[.<domain>][:<port>][/<container>[/<path>]]`
4. `abfs[s]://[<account>@]<container>[/<path>]`

(1) and (2) are compatible with the Azure Data Lake Storage Gen2 URIs, (3) is for Azure Blob Storage compatible services including Azurite, and (4) is a shorter version of (1) and (2).

The path portion may contain two placeholders:

* `**` marks the location where hive partition segments are inserted. When present, `partition_by` must also be set, and vice versa.
* `{uuid}` expands to a fresh UUIDv7 for every blob. This is required when partitioning or when rotation can produce multiple blobs, so that rotated or per-partition blobs do not overwrite each other.

Authenticate with the Azure CLI

Run `az login` on the command-line to authenticate the current user with Azure’s command-line arguments.

### `account_key = string (optional)`

Account key for authenticating with Azure Blob Storage.

Cannot be combined with `azure_auth`.

### `azure_auth = record (optional)`

Microsoft Entra ID credentials for this operator instance, either an application client secret or a federated OIDC token. Our [Azure Authentication](../azure-authentication.md) reference describes every field.

Cannot be combined with `account_key`.

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

### Write a single NDJSON blob

```tql
to_azure_blob_storage "abfs://my-container/events/out_{uuid}.json" {
  write_ndjson
}
```

### Partition events into Parquet blobs by date

```tql
to_azure_blob_storage "abfs://my-container/events/**/data_{uuid}.parquet",
  partition_by=[year, month] {
  write_parquet
}
```

### Write with explicit account key

```tql
to_azure_blob_storage "abfs://container/data/out_{uuid}.json",
  account_key="your-account-key" {
  write_ndjson
}
```

### Write blobs with workload identity federation

```tql
to_azure_blob_storage "abfss://results@account.dfs.core.windows.net/out_{uuid}.json",
  azure_auth={
    tenant_id: secret("entra-tenant-id"),
    client_id: secret("entra-client-id"),
    web_identity: {
      token_file: "/var/run/secrets/azure/tokens/azure-identity-token",
    },
  } {
  write_ndjson
}
```

### Rotate to a new blob every 5 minutes

```tql
to_azure_blob_storage "abfs://my-container/logs/events_{uuid}.json",
  timeout=5min {
  write_ndjson
}
```

## See Also

* [`from_azure_blob_storage`](https://tenzir.com/docs/reference/operators/from_azure_blob_storage.md)
* [`to_azure_blob_storage`](https://tenzir.com/docs/reference/operators/to_azure_blob_storage.md)
* [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md)
* [Azure Authentication](../azure-authentication.md)
* [Azure Blob Storage](../../integrations/microsoft/azure-blob-storage.md)
