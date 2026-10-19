---
title: "to_fluent_bit"
canonical: https://tenzir.com/docs/reference/operators/to_fluent_bit
source: https://tenzir.com/docs/reference/operators/to_fluent_bit.md
section: "Docs"
---

# to_fluent_bit

> Sends events via Fluent Bit.

Sends events via Fluent Bit.

```tql
to_fluent_bit plugin:string, [options=record, fluent_bit_options=record,
              tls=record]
```

## Description

The `to_fluent_bit` operator acts as a bridge into the [Fluent Bit](https://docs.fluentbit.io) ecosystem, making it possible to send events to Fluent Bit [output plugin](https://docs.fluentbit.io/manual/pipeline/outputs).

An invocation of the `fluent-bit` commandline utility

```bash
fluent-bit -o plugin -p key1=value1 -p key2=value2 -p…
```

translates to our `to_fluent_bit` operator as follows:

```tql
to_fluent_bit "plugin", options={key1: value1, key2:value2, …}
```

Read from Fluent Bit

You can acquire events from Fluent Bit using the [`from_fluent_bit`](https://tenzir.com/docs/reference/operators/from_fluent_bit.md) operator.

### `plugin: string`

The name of the Fluent Bit plugin.

Run `fluent-bit -h` and look under the **Outputs** section of the help text for available plugin names. The web documentation often comes with an example invocation near the bottom of the page, which also provides a good idea how you could use the operator.

### `options = record (optional)`

Sets plugin configuration properties.

The key-value pairs in this record are equivalent to `-p key=value` for the `fluent-bit` executable.

### `fluent_bit_options = record (optional)`

Sets global properties of the Fluent Bit service. E.g., `fluent_bit_options={flush:1, grace:3}`.

Consult the list of available [key-value pairs](https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/classic-mode/configuration-file#config_section) to configure Fluent Bit according to your needs.

We recommend factoring these options into the plugin-specific `fluent-bit.yaml` so that they are independent of the `fluent-bit` operator arguments.

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

## Direct operator usage

Use `to_fluent_bit` directly to send events to Fluent Bit:

```tql
to_fluent_bit "plugin"
```

## Examples

### Slack

Send events to [Slack](https://docs.fluentbit.io/manual/pipeline/outputs/slack):

```tql
let $slack_hook = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
to_fluent_bit "slack", options={webhook: $slack_hook}
```

## See Also

* [`from_fluent_bit`](https://tenzir.com/docs/reference/operators/from_fluent_bit.md)
* [Fluent Bit](../../integrations/fluent-bit.md)
