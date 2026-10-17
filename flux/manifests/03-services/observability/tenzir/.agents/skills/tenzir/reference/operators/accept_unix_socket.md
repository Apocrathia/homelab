---
title: "accept_unix_socket"
canonical: https://tenzir.com/docs/reference/operators/accept_unix_socket
source: https://tenzir.com/docs/reference/operators/accept_unix_socket.md
section: "Docs"
---

# accept_unix_socket

> Listens for incoming Unix domain socket connections and receives events.

Listens for incoming Unix domain socket connections and receives events.

```tql
accept_unix_socket path:string, [max_connections=int] { … }
```

## Description

Listens on the specified filesystem-backed Unix stream socket path. For each accepted connection, the operator spawns the nested pipeline and feeds it the bytes received from that connection.

Before listening, the operator removes a stale socket file at `path`. If another server is actively listening at `path`, or if another file type already exists there, the operator emits an error. When the operator shuts down, it removes the socket path that it created.

### `path: string`

The Unix domain socket path to listen on. The path may start with `~`, which expands to the current user’s home directory. Relative paths are resolved relative to the process working directory.

The operator supports filesystem-backed Unix domain sockets only. It doesn’t support Linux abstract namespace sockets.

### `max_connections = int (optional)`

The maximum number of simultaneous incoming connections to accept. Additional connections beyond this limit are rejected.

Defaults to `128`.

### `{ … }`

The pipeline to run for each individual Unix domain socket connection. Unless you are sure that there is at most one active connection at a time, specify a pipeline that parses the individual connection streams into events, for instance `{ read_json }`. Otherwise, the output can be interleaved.

## Examples

### Accept incoming JSON over a Unix domain socket

```tql
accept_unix_socket "/run/collector.sock" {
  read_json
}
```

## See Also

* [`from_unix_socket`](https://tenzir.com/docs/reference/operators/from_unix_socket.md)
* [`to_unix_socket`](https://tenzir.com/docs/reference/operators/to_unix_socket.md)
* [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md)
* [File](../../integrations/file.md)
