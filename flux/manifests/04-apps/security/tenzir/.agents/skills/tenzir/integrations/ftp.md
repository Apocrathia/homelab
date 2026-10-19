---
title: "FTP integration"
description: "Transfer files between a client and a server using a reliable, connection-based protocol."
canonical: https://tenzir.com/integrations/ftp
source: https://tenzir.com/integrations/ftp.md
section: "Integrations"
---

# FTP integration

> Transfer files between a client and a server using a reliable, connection-based protocol.

Tenzir supports the [File Transfer Protocol (FTP)](https://en.wikipedia.org/wiki/File_Transfer_Protocol), both downloading and uploading files. Use [`from_ftp`](https://tenzir.com/docs/reference/operators/from_ftp.md) to download bytes and parse them with a subpipeline, and use [`to_ftp`](https://tenzir.com/docs/reference/operators/to_ftp.md) to print events with a subpipeline and upload the result.

FTP

FTP consists of two separate TCP connections, one control and one data connection. This can be tricky for some firewalls and may require special attention.

## Examples

These examples use the direct FTP operators with explicit parsing and printing subpipelines.

### Download and parse a file from an FTP server

Use [`from_ftp`](https://tenzir.com/docs/reference/operators/from_ftp.md) with [`read_ndjson`](https://tenzir.com/docs/reference/operators/read_ndjson.md) to turn the downloaded bytes into events.

```tql
from_ftp "ftp://user:pass@ftp.example.org/path/to/file.ndjson" {
  read_ndjson
}
```

### Upload events to an FTP server

Use [`to_ftp`](https://tenzir.com/docs/reference/operators/to_ftp.md) with [`write_ndjson`](https://tenzir.com/docs/reference/operators/write_ndjson.md) to serialize events before uploading them.

```tql
from {
  x: 42,
  y: "foo",
}
to_ftp "ftp://user:pass@ftp.example.org/a/b/c/events.ndjson" {
  write_ndjson
}
```
