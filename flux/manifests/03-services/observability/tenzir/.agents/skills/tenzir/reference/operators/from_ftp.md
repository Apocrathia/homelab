---
title: "from_ftp"
canonical: https://tenzir.com/docs/reference/operators/from_ftp
source: https://tenzir.com/docs/reference/operators/from_ftp.md
section: "Docs"
---

# from_ftp

> Downloads bytes via FTP or FTPS and parses them with a subpipeline.

Downloads bytes via FTP or FTPS and parses them with a subpipeline.

```tql
from_ftp url:string, [tls=record] { … }
```

## Description

The `from_ftp` operator downloads bytes from an FTP or FTPS server and forwards them to the required subpipeline.

### `url: string`

The URL to request from. You can omit the `ftp://` scheme.

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

A required parsing subpipeline.

The subpipeline receives the downloaded body as bytes and must return events. For example, use [`read_ndjson`](https://tenzir.com/docs/reference/operators/read_ndjson.md) to parse newline-delimited JSON.

## Examples

### Download NDJSON from an FTP server

Use [`read_ndjson`](https://tenzir.com/docs/reference/operators/read_ndjson.md) when the remote file already contains newline-delimited JSON.

```tql
from_ftp "ftp://user:pass@ftp.example.org/events.ndjson" {
  read_ndjson
}
```

### Download gzipped JSON and decompress it explicitly

Decompress the downloaded bytes before parsing them when the remote file is stored as gzip-compressed JSON.

```tql
from_ftp "ftp://user:pass@ftp.example.org/events.json.gz" {
  decompress_gzip
  read_json
}
```

## See Also

* [`to_ftp`](https://tenzir.com/docs/reference/operators/to_ftp.md)
* [FTP](../../integrations/ftp.md)
