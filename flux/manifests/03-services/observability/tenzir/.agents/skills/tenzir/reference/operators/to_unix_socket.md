---
title: "to_unix_socket"
canonical: https://tenzir.com/docs/reference/operators/to_unix_socket
source: https://tenzir.com/docs/reference/operators/to_unix_socket.md
section: "Docs"
---

# to_unix_socket

> Connects to a Unix domain socket and sends events.

Connects to a Unix domain socket and sends events.

```tql
to_unix_socket path:string, [max_retry_count=int] { … }
```

## Description

Connects to the specified filesystem-backed Unix stream socket as a client and writes serialized events to the connection. Input events are run through a nested pipeline that must produce bytes, for example `{ write_json }`.

If the connection fails, the operator reconnects automatically with exponential backoff. By default it retries forever; use `max_retry_count` to bound the number of reconnect attempts.

The operator connects only when the nested pipeline produces bytes. If the nested pipeline produces no output, `to_unix_socket` doesn’t open a socket connection.

### `path: string`

The Unix domain socket path to connect to. The path may start with `~`, which expands to the current user’s home directory. Relative paths are resolved relative to the process working directory.

The operator supports filesystem-backed Unix domain sockets only. It doesn’t support Linux abstract namespace sockets.

### `max_retry_count = int (optional)`

Maximum number of reconnect attempts after a failed connection. After this many consecutive failures, the operator emits an error and stops.

Defaults to retrying forever.

### `{ … }`

The pipeline to serialize input events into bytes. It must produce bytes as output, for instance `{ write_json }` or `{ write_csv }`.

## Examples

### Send JSON to a local socket

```tql
from {message: "hello"}
to_unix_socket "/run/collector.sock" { write_json }
```

## See Also

* [`from_unix_socket`](https://tenzir.com/docs/reference/operators/from_unix_socket.md)
* [`accept_unix_socket`](https://tenzir.com/docs/reference/operators/accept_unix_socket.md)
* [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md)
* [`write_delimited`](https://tenzir.com/docs/reference/operators/write_delimited.md)
* [File](../../integrations/file.md)
