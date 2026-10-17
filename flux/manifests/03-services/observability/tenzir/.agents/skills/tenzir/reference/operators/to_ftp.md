---
title: "to_ftp"
canonical: https://tenzir.com/docs/reference/operators/to_ftp
source: https://tenzir.com/docs/reference/operators/to_ftp.md
section: "Docs"
---

# to_ftp

> Prints events to bytes and uploads them via FTP or FTPS.

Prints events to bytes and uploads them via FTP or FTPS.

```tql
to_ftp url:string, [tls=record] { … }
```

## Description

The `to_ftp` operator sends events to an FTP or FTPS server.

The required subpipeline receives events and must return bytes.

### `url: string`

The URL to upload to. You can omit the `ftp://` scheme.

### `tls = record (optional)`

TLS configuration.

By default, `ftps://` enables TLS and `ftp://` does not. If you omit the scheme, the operator assumes `ftp://`.

### `tls = record (optional)`

TLS configuration. Provide an empty record (`tls={}`) to enable TLS with defaults or set fields to customize it.

```tql
{
  skip_peer_verification: bool, // skip certificate verification.
  cacert: string,               // CA bundle to verify peers.
  certfile: string,             // client certificate to present.
  keyfile: string,              // private key for the client certificate.
  min_version: string,          // minimum TLS version (`"1.0"`, `"1.1"`, `"1.2"`, "1.3"`).
  ciphers: string,              // OpenSSL cipher list string.
  client_ca: string,            // CA to validate client certificates.
  require_client_cert: bool,    // require clients to present a certificate.
}
```

The `client_ca` and `require_client_cert` options are only valid for operators that accept incoming client connections.

Any value not specified in the record will either be picked up from the configuration or if not configured will not be used by the operator.

See the [Node TLS Setup guide](../../guides/node-setup/configure-tls.md) for more details.

### `{ … }`

A required printing subpipeline.

The subpipeline receives events and must return bytes. For example, use [`write_ndjson`](https://tenzir.com/docs/reference/operators/write_ndjson.md) to serialize events as newline-delimited JSON.

## Examples

### Upload events as NDJSON

Use [`write_ndjson`](https://tenzir.com/docs/reference/operators/write_ndjson.md) to serialize each event as one JSON object per line before uploading it.

```tql
from {
  x: 42,
  y: "foo",
}
to_ftp "ftp://user:pass@ftp.example.org/events.ndjson" {
  write_ndjson
}
```

### Upload compressed NDJSON

Add [`compress_gzip`](https://tenzir.com/docs/reference/operators/compress_gzip.md) to the printing subpipeline when you want to upload compressed output.

```tql
from {
  x: 42,
  y: "foo",
}
to_ftp "ftp://user:pass@ftp.example.org/events.ndjson.gz" {
  write_ndjson
  compress_gzip
}
```

## See Also

* [`from_ftp`](https://tenzir.com/docs/reference/operators/from_ftp.md)
* [FTP](../../integrations/ftp.md)
