---
title: "Reconnect an offline node"
canonical: https://tenzir.com/docs/guides/troubleshooting/reconnect-an-offline-node
source: https://tenzir.com/docs/guides/troubleshooting/reconnect-an-offline-node.md
section: "Docs"
---

# Reconnect an offline node

> When a node shows as offline in the Tenzir Platform but the process is still running, the node can’t reach the platform’s control plane. The node keeps working locally, pipelines run, and data flows, but you can’t manage it from the browser. This guide shows you how to confirm the problem and narrow down the cause.

When a node shows as offline in the [Tenzir Platform](https://app.tenzir.com) but the process is still running, the node can’t reach the platform’s control plane. The node keeps working locally, pipelines run, and data flows, but you can’t manage it from the browser. This guide shows you how to confirm the problem and narrow down the cause.

## Confirm the connection state

The node reports whether it considers itself connected, once per second, in the `platform` metric:

```tql
metrics "platform"
sort timestamp
tail 1
```

```tql
{
  timestamp: 2026-07-06T09:07:59.809926926Z,
  connected: false,
}
```

`connected: false` confirms the node itself sees the connection as down, so the problem is between the node and the platform, not in your browser or the platform UI. If the metric returns no rows at all, the node has no platform connection configured; see [Configure a node](../node-setup/configure-a-node.md) to set one up.

## Read the connection error

When the connection fails, the node logs why and retries every 30 seconds. Find the attempt in the logs:

```sh
docker logs <container> 2>&1 | grep 'platform websocket'
grep 'platform websocket' /path/to/server.log
```

```plaintext
failed to connect platform websocket
  endpoint: ws://control.example.com:5000/
  failed to connect to control.example.com:5000
  Connection refused
  platform connection attempt 1 to ws://control.example.com:5000/ failed after 1s
  reconnecting in 30s
```

The nested notes point straight at the cause:

* **`Connection refused` or a timeout**: nothing is reachable at that address. A firewall, network policy, or proxy is blocking the outbound WebSocket, or the endpoint is wrong.
* **A TLS or certificate error**: the connection reaches the platform but the handshake fails. See [Configure a node](../node-setup/configure-a-node.md#configure-the-platform-tls-connection).
* **An authentication or registration error**: the endpoint is reachable but rejects the node’s token.

## Check the endpoint and token

A node connects using a platform token, optionally with an explicit control endpoint. Confirm the node uses the values you expect with [`config`](https://tenzir.com/docs/reference/functions/config.md):

```tql
from config()
select endpoint = tenzir["platform-control-endpoint"]
```

The token itself is omitted from the output so it can’t leak, but its presence still matters: a node with no token never connects. Set the token and endpoint through `tenzir.yaml` or the `TENZIR_TOKEN` and `TENZIR_PLATFORM_CONTROL_ENDPOINT` environment variables, then restart the node. Many tokens embed the control endpoint, so setting the endpoint separately is only needed to override it. See [Configure a node](../node-setup/configure-a-node.md) for details.

If the endpoint and token are correct and the network allows the outbound WebSocket, but the node still can’t connect, capture the connection error from the logs and the `platform` metric and share them with Tenzir support, as described in [Inspect a node](../observability/inspect-a-node.md).

## See also

* [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md)
* [`config`](https://tenzir.com/docs/reference/functions/config.md)
* [Configure a node](../node-setup/configure-a-node.md)
* [Configure TLS](../node-setup/configure-tls.md)
* [Inspect a node](../observability/inspect-a-node.md)
