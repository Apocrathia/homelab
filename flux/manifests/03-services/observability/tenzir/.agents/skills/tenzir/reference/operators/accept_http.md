---
title: "accept_http"
canonical: https://tenzir.com/docs/reference/operators/accept_http
source: https://tenzir.com/docs/reference/operators/accept_http.md
section: "Docs"
---

# accept_http

> Accepts incoming HTTP requests and forwards them as events.

Accepts incoming HTTP requests and forwards them as events.

```tql
accept_http url:string, [responses=record, max_request_size=int,
            max_connections=int, tls=record]
            { … }
```

## Description

The `accept_http` operator starts an HTTP/1.1 server on the given address and forwards incoming requests as events. Each request spawns a sub-pipeline that processes the request body independently.

The sub-pipeline has access to a `$request` variable containing the request metadata.

### `url: string`

The endpoint to listen on. Must have the form `<host>:<port>`. Use `0.0.0.0` to accept connections on all interfaces. IPv6 addresses are not supported.

### `responses = record (optional)`

Specify custom responses for endpoints on the server. For example,

```tql
responses = {
  "/resource/create": { code: 200, content_type: "text/html", body: "Created!" },
  "/resource/delete": { code: 401, content_type: "text/html", body: "Unauthorized!" }
}
```

creates two special routes on the server with different responses.

Each route must be a record with `code`, `content_type`, and `body` fields.

Requests to an unspecified endpoint are responded with HTTP Status `200 OK`.

### `max_request_size = int (optional)`

The maximum size of an incoming request to accept. Requests that exceed this limit are rejected with HTTP `413 Content Too Large`.

Defaults to `10MiB`.

### `max_connections = int (optional)`

The maximum number of simultaneous incoming connections to accept. Connections that exceed this limit are rejected with HTTP `503 Service Unavailable`.

Defaults to `10`.

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

The pipeline to run for each incoming HTTP request. Inside the pipeline, the `$request` variable is available as a record with the following fields:

| Field      | Type     | Description                                                |
| ---------- | -------- | ---------------------------------------------------------- |
| `headers`  | `record` | The request headers.                                       |
| `query`    | `record` | The query parameters of the request.                       |
| `path`     | `string` | The path requested.                                        |
| `fragment` | `string` | The URI fragment of the request.                           |
| `method`   | `string` | The HTTP method of the request (lowercase, e.g. `"post"`). |
| `version`  | `string` | The HTTP version of the request.                           |
| `body`     | `blob`   | The raw request body.                                      |

## Examples

### Accept JSON requests on port 8080

Listen on all interfaces and parse incoming request bodies as JSON:

```tql
accept_http "0.0.0.0:8080" {
  read_json
}
```

Send a request to the endpoint via `curl`:

```bash
echo '{"key": "value"}' | curl localhost:8080 --data-binary @- -H 'Content-Type: application/json'
```

### Filter requests by path

Use the `$request` variable to filter or route requests:

```tql
accept_http "0.0.0.0:8080" {
  read_json
  where $request.path == "/events" and $request.method == "post"
}
```

### Custom responses per endpoint

Return different HTTP responses based on the request path:

```tql
accept_http "0.0.0.0:8080",
            responses={
              "/webhook": {
                code: 201,
                content_type: "text/plain",
                body: "accepted",
              },
            } {
  read_json
  where $request.path == "/webhook"
}
```

### Accept HTTPS requests with TLS

```tql
accept_http "0.0.0.0:8443",
            tls={
              certfile: "/path/to/cert.pem",
              keyfile: "/path/to/key.pem",
            } {
  read_json
}
```

### Capture all request metadata

```tql
accept_http "0.0.0.0:8443" {
  read_json
  metadata = $request
}
```

## See Also

* [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md)
* [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md)
* [`serve_http`](https://tenzir.com/docs/reference/operators/serve_http.md)
* [Fetch via HTTP and APIs](../../guides/collect/fetch-via-http-and-apis.md)
* [HTTP](../../integrations/http.md)
