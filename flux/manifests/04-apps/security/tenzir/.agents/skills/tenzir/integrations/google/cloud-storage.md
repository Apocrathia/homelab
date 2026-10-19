---
title: "Google Cloud Storage integration"
description: "Store, retrieve, and manage data objects across a scalable, cloud-based environment."
canonical: https://tenzir.com/integrations/google/cloud-storage
source: https://tenzir.com/integrations/google/cloud-storage.md
section: "Integrations"
---

# Google Cloud Storage integration

> Store, retrieve, and manage data objects across a scalable, cloud-based environment.

[Cloud Storage](https://cloud.google.com/storage) is Google’s object storage service. Tenzir can treat it like a local filesystem to read and write files.

Google Cloud Storage

## Configuration

You need to configure appropriate credentials using Google’s [Application Default Credentials](https://google.aip.dev/auth/4110).

## Examples

Use [`from_google_cloud_storage`](https://tenzir.com/docs/reference/operators/from_google_cloud_storage.md) to read files from Cloud Storage. It supports glob patterns and automatic format detection. For writing, use [`to_google_cloud_storage`](https://tenzir.com/docs/reference/operators/to_google_cloud_storage.md) with a print operator.

### Read events from a file in a bucket

```tql
from_google_cloud_storage "gs://bucket/path/to/file.json"
```

### Read all JSON files from a bucket

```tql
from_google_cloud_storage "gs://bucket/logs/**.json"
```

### Write an event to a file in a bucket

```tql
from {foo: 42}
print_json
to_google_cloud_storage "gs://bucket/path/to/file.json"
```
