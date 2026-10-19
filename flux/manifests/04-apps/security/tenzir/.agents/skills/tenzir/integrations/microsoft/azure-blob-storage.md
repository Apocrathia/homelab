---
title: "Azure Blob Storage integration"
description: "Store, retrieve, and manage unstructured data at scale."
canonical: https://tenzir.com/integrations/microsoft/azure-blob-storage
source: https://tenzir.com/integrations/microsoft/azure-blob-storage.md
section: "Integrations"
---

# Azure Blob Storage integration

> Store, retrieve, and manage unstructured data at scale.

[Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs) is Azure’s object storage service. Tenzir can treat it like a local filesystem to read and write files.

Azure Blob Storage

## Examples

Use [`from_azure_blob_storage`](https://tenzir.com/docs/reference/operators/from_azure_blob_storage.md) to read files from Azure Blob Storage. It supports glob patterns and automatic format detection. For writing, use [`to_azure_blob_storage`](https://tenzir.com/docs/reference/operators/to_azure_blob_storage.md) with a print operator.

### Read events from a file in a container

```tql
from_azure_blob_storage "abfs://container/path/to/file.json"
```

### Read all JSON files from a container

```tql
from_azure_blob_storage "abfs://container/logs/**.json"
```

### Write an event to a file in a container

```tql
from {foo: 42}
print_json
to_azure_blob_storage "abfs://container/path/to/file.json"
```
