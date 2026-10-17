---
title: "from_azure_blob_storage"
canonical: https://tenzir.com/docs/reference/operators/from_azure_blob_storage
source: https://tenzir.com/docs/reference/operators/from_azure_blob_storage.md
section: "Docs"
---

# from_azure_blob_storage

> Reads one or multiple files from Azure Blob Storage.

Reads one or multiple files from Azure Blob Storage.

```tql
from_azure_blob_storage url:string, [account_key=string, azure_auth=record,
  watch=duration, remove=bool, rename=string->string, max_age=duration] { … }
```

## Description

The `from_azure_blob_storage` operator reads files from Azure Blob Storage, with support for glob patterns, automatic format detection, and file monitoring.

By default, authentication is handled by the Azure SDK’s credential chain, which reads process-wide environment variables. Pass `azure_auth` to give one operator instance its own Entra identity, as our [Azure Authentication](../azure-authentication.md) reference explains.

### `url: string`

URL identifying the Azure Blob Storage location where data should be read from.

The characters `*` and `**` have a special meaning. `*` matches everything except `/`. `**` matches everything including `/`. The sequence `/**/` can also match nothing. For example, `container/**/data` matches `container/data`.

Supported URI formats:

1. `abfs[s]://<account>.blob.core.windows.net[/<container>[/<path>]]`
2. `abfs[s]://<container>@<account>.dfs.core.windows.net[/<path>]`
3. `abfs[s]://[<account>@]<host>[.<domain>][:<port>][/<container>[/<path>]]`
4. `abfs[s]://[<account>@]<container>[/<path>]`

(1) and (2) are compatible with the Azure Data Lake Storage Gen2 URIs, (3) is for Azure Blob Storage compatible service including Azurite, and (4) is a shorter version of (1) and (2).

Authenticate with the Azure CLI

Run `az login` on the command-line to authenticate the current user with Azure’s command-line arguments.

### `account_key = string (optional)`

Account key for authenticating with Azure Blob Storage.

Cannot be combined with `azure_auth`.

### `azure_auth = record (optional)`

Microsoft Entra ID credentials for this operator instance, either an application client secret or a federated OIDC token. Our [Azure Authentication](../azure-authentication.md) reference describes every field.

Cannot be combined with `account_key`.

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

### Read every JSON file from a container

```tql
from_azure_blob_storage "abfs://my-container/data/**.json"
```

### Read CSV files using account key authentication

```tql
from_azure_blob_storage "abfs://container/data.csv", account_key="your-account-key"
```

### Read blobs with workload identity federation

```tql
from_azure_blob_storage "abfss://logs@account.dfs.core.windows.net/**.json",
  azure_auth={
    tenant_id: secret("entra-tenant-id"),
    client_id: secret("entra-client-id"),
    web_identity: {
      token_file: "/var/run/secrets/azure/tokens/azure-identity-token",
    },
  } {
  read_json
}
```

### Read Suricata EVE JSON logs continuously

```tql
from_azure_blob_storage "abfs://logs/suricata/**.json", watch=10s {
  read_suricata
}
```

### Process files and move them to an archive container

```tql
from_azure_blob_storage "abfs://input/**.json",
  rename=(path => f"/archive/{path}")
```

### Add source path to events

```tql
from_azure_blob_storage "abfs://data/**.json" {
  read_json
  source_file = $file.path
}
```

## See Also

* [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md)
* [`from_azure_blob_storage`](https://tenzir.com/docs/reference/operators/from_azure_blob_storage.md)
* [`to_azure_blob_storage`](https://tenzir.com/docs/reference/operators/to_azure_blob_storage.md)
* [Azure Authentication](../azure-authentication.md)
* [Azure Blob Storage](../../integrations/microsoft/azure-blob-storage.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
