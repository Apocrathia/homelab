---
title: "from_unix_socket"
canonical: https://tenzir.com/docs/reference/operators/from_unix_socket
source: https://tenzir.com/docs/reference/operators/from_unix_socket.md
section: "Docs"
---

# from_unix_socket

> Connects to a Unix domain socket and receives events.

Connects to a Unix domain socket and receives events.

```tql
from_unix_socket path:string { … }
```

## Description

Connects to the specified filesystem-backed Unix stream socket as a client and reads bytes from the connection. The nested pipeline parses the byte stream into events.

If the connection fails or reaches EOF, the operator reconnects automatically with exponential backoff.

### `path: string`

The Unix domain socket path to connect to. The path may start with `~`, which expands to the current user’s home directory. Relative paths are resolved relative to the process working directory.

The operator supports filesystem-backed Unix domain sockets only. It doesn’t support Linux abstract namespace sockets.

### `{ … }`

The pipeline to run for the Unix domain socket connection. Use this to parse the incoming byte stream into events, for instance `{ read_json }`.

## Examples

### Connect to a local socket and read JSON

```tql
from_unix_socket "/run/collector.sock" {
  read_json
}
```

## See Also

* [`to_unix_socket`](https://tenzir.com/docs/reference/operators/to_unix_socket.md)
* [`accept_unix_socket`](https://tenzir.com/docs/reference/operators/accept_unix_socket.md)
* [`from_tcp`](https://tenzir.com/docs/reference/operators/from_tcp.md)
* [File](../../integrations/file.md)
