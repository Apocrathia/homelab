---
title: "accept_wef"
canonical: https://tenzir.com/docs/reference/operators/accept_wef
source: https://tenzir.com/docs/reference/operators/accept_wef.md
section: "Docs"
---

# accept_wef

> Receives Windows events through Windows Event Forwarding (WEF).

Receives Windows events through [Windows Event Forwarding (WEF)](../../integrations/microsoft/windows-event-forwarding.md).

```tql
accept_wef [endpoint:string], subscriptions=list<record>, [kerberos=record,
           tls=record, public_url=string, state=string, max_request_size=int,
           max_connections=int]
```

## Description

Acts as a Windows Event Collector (WEC) for source-initiated subscriptions. Windows hosts connect to the operator, retrieve the configured subscriptions, and then forward heartbeats and batches of events. The operator emits one event per Windows event with the event XML in `data`. Use [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md) to parse it.

For direct collection, the operator takes the place of a Windows Event Collector server and its shipping agent. The Windows hosts need no agent, only a Group Policy setting that points them to the operator. Our [Microsoft Windows Event Forwarding](../../integrations/microsoft/windows-event-forwarding.md) integration describes the setup.

Tenzir can also receive events from an existing WEC through the shipping agent of your choice. That architecture uses the input appropriate for the agent, rather than this operator. Our [Microsoft Windows Event Collector](../../integrations/microsoft/windows-event-collector.md) integration describes it.

Clients authenticate with Kerberos or with client certificates. Kerberos suits hosts in an Active Directory domain: it authenticates the computer account of a host, such as `WIN10$@EXAMPLE.ORG`, and encrypts every message, so hosts connect over HTTP. Client certificates suit hosts outside of a domain: they connect over HTTPS, and the subject common name of a certificate is the client’s identity. A pipeline accepts one of the two. Windows also sends the name it believes it has, which the operator records as `wef.machine_id` but never uses for authorization.

Clients may compress batches. The operator decompresses them and decodes the UTF-16 text that Windows sends. It replaces invalid UTF-16 with U+FFFD and characters that XML does not allow, such as U+0004, with `\u{<hex>}` instead of rejecting the batch, and emits a warning for both.

### Delivery and backpressure

For each batch, the operator emits the events downstream, writes the client’s bookmark to disk, and only then acknowledges the batch. A client sends its next batch only after the acknowledgement, so a slow pipeline slows down the clients instead of buffering their events in memory. Windows sends a bookmark with every batch. The operator rejects batches without one, because the client could not resume after them.

When you change a subscription, clients keep delivering under the old version until they fetch the new one. After that, the operator rejects late batches of the old version, so that they cannot move the bookmark of the new one.

The operator keeps the bookmarks in the state directory, so clients resume where they left off after a restart or crash. If a failure occurs before the client receives the acknowledgement, the client sends the batch again. This can produce duplicate events, so design downstream processing to tolerate them. Events that the operator acknowledged but downstream did not process yet are lost if Tenzir crashes.

The operator keeps a bookmark per client and subscription. With client certificates, a client consists of the common name and the name of the issuing CA, so clients with the same name from differently named CAs, such as the CAs of two tenants, keep separate bookmarks. A renewed CA usually keeps its name, so its clients keep their bookmarks. CAs with the same name count as one CA, so give the CAs of different tenants distinct names.

Windows deletes events from its local logs when they exceed their configured size. Size the event logs on the clients to cover the longest outage of the collector that you want to tolerate.

### `endpoint: string (optional)`

The endpoint to listen on. It must have the form `<host>:<port>`. Use `0.0.0.0` as the host to accept connections on all interfaces.

Defaults to `0.0.0.0:5985` with `kerberos` and `0.0.0.0:5986` with `tls`, the ports of Windows Remote Management.

### `kerberos = record (optional)`

Authenticate clients with Kerberos. Set these fields:

* `keytab`: The path to a keytab with the keys of the service principal of the collector.
* `principal`: The service principal to accept, such as `HTTP/wef.example.org@EXAMPLE.ORG`. Defaults to every principal in the keytab.

Windows authenticates to `HTTP/<collector>` by default. Windows Server 2025 and Windows 11 24H2 use `HOST/<collector>` with the `Negotiate` scheme instead. Register both service principal names for the account of the collector and put the keys of both into the keytab. The operator accepts both the `Kerberos` and the `Negotiate` scheme, but not NTLM.

The collector does not contact the domain controllers. It only needs the keytab and a clock within the maximum clock skew of Kerberos, usually five minutes.

### `tls = record (optional)`

Authenticate clients with certificates. Set these fields:

* `certfile`: The server certificate. Its common name or a subject alternative name must match the host in the subscription manager URL that clients use.
* `keyfile`: The private key of the server certificate.
* `client_ca`: The root CAs of the client certificates. Only these CAs vouch for clients, not the CA certificates that Tenzir trusts otherwise, such as the CA bundle of the system. The operator tells each client the thumbprint of the CA that issued its certificate, which may be an intermediate CA that the client sends along.
* `require_client_cert`: Must be `true`.

For more TLS configuration options, see our [Configure TLS](../../guides/node-setup/configure-tls.md) guide.

Use either `tls` or `kerberos`. To accept both, run a pipeline for each on different ports.

### `subscriptions = list<record>`

The subscriptions to offer to clients. Each subscription is a record with these fields:

| Field                  | Default                     | Description                                                               |
| ---------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `id`                   | required                    | A stable identifier. Changing it starts the subscription over.            |
| `query`                | required                    | A `QueryList` that selects the events, as exported from the Event Viewer. |
| `name`                 | `id`                        | The name that Windows shows in its forwarding logs.                       |
| `content_format`       | `"Raw"`                     | `"Raw"` or `"RenderedText"`, which adds the rendered message.             |
| `batch_timeout`        | `30s`                       | The longest time that a client collects events before it sends a batch.   |
| `max_events`           | unlimited                   | The most events per batch.                                                |
| `heartbeat`            | `1h`                        | The interval of heartbeats when a client has no events to send.           |
| `read_existing_events` | `false`                     | Whether new clients send the events that they already logged.             |
| `ignore_channel_error` | `true`                      | Whether clients ignore channels in the query that they cannot read.       |
| `connection_retry`     | `{count: 5, interval: 60s}` | How often and how frequently clients retry an unreachable collector.      |
| `locale`               | none                        | The language of rendered messages, as a language tag such as `"en-US"`.   |
| `data_locale`          | none                        | The language of rendered data, as a language tag such as `"en-US"`.       |
| `uri`                  | none                        | Only offer the subscription on this subscription manager path.            |
| `clients`              | none                        | Only offer the subscription to some clients.                              |

`clients` is either `{only: [...]}` or `{except: [...]}` with patterns that match client identities case-insensitively. A `*` in a pattern matches any sequence of characters, so `{only: ["dc*"]}` matches `DC01.example.org`.

`uri` lets you offer different subscriptions to different groups of hosts. Point their Group Policies at different subscription manager URLs, such as `https://wef.example.org:5986/wsman/SubscriptionManager/servers`, and set `uri` to the path, such as `/wsman/SubscriptionManager/servers`.

When you change a subscription other than its `id`, clients pick up the change and keep their position. The same holds when clients have to deliver elsewhere, such as after a change of `public_url` or the port, or authenticate differently, such as with a certificate from a new CA. When you add a channel to the query, clients send all existing events of that channel, because their position does not cover it. For large channels, such as `Security`, consider a new subscription with a new `id` instead.

### `public_url = string (optional)`

The URL that clients use to reach the operator, such as `https://wef.example.org:5986`, or `http://wef.example.org:5985` with `kerberos`. The operator sends it to clients as the address for their events. Set it when clients connect through a load balancer or a different host name.

Defaults to the host that the client connected to and the port of `endpoint`.

### `state = string (optional)`

The name of the directory that holds the bookmarks, below `wef/` in the state directory. Only one pipeline at a time can use a state. The name may contain letters, digits, `.`, `-`, and `_`.

Defaults to a name derived from `endpoint`.

### `max_request_size = int (optional)`

The largest envelope to accept, in bytes. The operator tells clients to stay below this size when they batch events, and accepts a little more for the framing of Kerberos-encrypted requests. The limit also applies after decompression. Must be at least `8192`.

Defaults to `512000`.

### `max_connections = int (optional)`

The maximum number of requests to process at the same time. Because the operator holds acknowledgements until it stored a batch, size this for the number of clients that may send batches at the same time.

Defaults to `256`.

## Output schema

Each Windows event produces one event:

```tql
{
  data: string,
  peer: {
    ip: ip,
    port: int,
  },
  wef: {
    client: string,
    machine_id: string,
    subscription_id: string,
    subscription_uuid: string,
    subscription_version: string,
  },
}
```

* `data`: The event XML, as the client sent it.
* `peer`: The address of the client.
* `wef.client`: The authenticated client identity: the Kerberos principal of the host, or the subject common name of its certificate.
* `wef.machine_id`: The name that the client claims to have. Do not trust it for authorization.
* `wef.subscription_id`: The `id` of the subscription.
* `wef.subscription_uuid`: The UUID that Windows uses for the subscription.
* `wef.subscription_version`: The version of the subscription that the client used. It also covers where and how the client delivers events, so it can differ between clients.

## Examples

The following examples receive Windows events and restrict subscriptions.

### Receive events from domain-joined hosts

```tql
let $query = r#"
<QueryList>
  <Query Id="0">
    <Select Path="Security">*</Select>
  </Query>
</QueryList>
"#
accept_wef kerberos={keytab: "/etc/tenzir/wef.keytab"},
  subscriptions=[{id: "security", query: $query}]
this = data.parse_winlog()
```

### Receive logon events from hosts with certificates

```tql
let $query = r#"
<QueryList>
  <Query Id="0">
    <Select Path="Security">*[System[(EventID=4624 or EventID=4625)]]</Select>
  </Query>
</QueryList>
"#
accept_wef "0.0.0.0:5986",
  tls={
    certfile: "server.pem",
    keyfile: "server-key.pem",
    client_ca: "clients-ca.pem",
    require_client_cert: true,
  },
  subscriptions=[{id: "logons", query: $query}]
this = data.parse_winlog()
```

### Collect more from domain controllers

```tql
let $security = r#"
<QueryList>
  <Query Id="0">
    <Select Path="Security">*</Select>
  </Query>
</QueryList>
"#
let $system = r#"
<QueryList>
  <Query Id="0">
    <Select Path="System">*</Select>
  </Query>
</QueryList>
"#
accept_wef kerberos={keytab: "/etc/tenzir/wef.keytab"},
  subscriptions=[
    {id: "dc-security", query: $security, clients: {only: ["dc*$@example.org"]}},
    {id: "system", query: $system},
  ]
publish "windows"
```

## See Also

* [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md)
* [Microsoft Windows Event Forwarding](../../integrations/microsoft/windows-event-forwarding.md)
* [Microsoft Windows Event Collector](../../integrations/microsoft/windows-event-collector.md)
* [Microsoft Windows Event Logs](../../integrations/microsoft/windows-event-logs.md)
