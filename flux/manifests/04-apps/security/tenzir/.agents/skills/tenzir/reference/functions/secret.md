---
title: "secret"
canonical: https://tenzir.com/docs/reference/functions/secret
source: https://tenzir.com/docs/reference/functions/secret.md
section: "Docs"
---

# secret

> Use the value of a secret.

Use the value of a secret.

```tql
secret(name:string) -> secret
```

## Description

Tenzir resolves the secret once, before the first event arrives. It first looks up the value in the environment or configuration of the Tenzir Node. A `tenzir` client process can use secrets only if it has a Tenzir Node to connect to.

If the secret is not found in the node, a request is made to the Tenzir Platform. Should the platform also not be able to find the secret, an error is raised.

See [Secrets](../../explanations/secrets.md) for more details.

### `name: string`

The name of the secret to use. This must be a constant.

## Legacy Model

The configuration option `tenzir.legacy-secret-model` changes the behavior of the `secret` function to return a `string` instead of a `secret`.

The legacy model only allows using secrets from the Tenzir Node’s configuration. No secrets from the Tenzir Platform’s secret store will be available.

We do not recommend enabling this option.

## Examples

### Using secrets in an operator

```tql
accept_tcp "127.0.0.1:4000" {
  read_ndjson
}
to_splunk "https://localhost:8088", hec_token=secret("splunk-hec-token")
```

### Secrets cannot be stored in events

```tql
from {}
x = secret("geheim")
```

```tql
{x: "***"}
```

Tenzir stores the string `"***"` instead of the secret and emits a warning. Pass the secret directly to the operator or function that uses it.

## See Also

* [`config`](https://tenzir.com/docs/reference/functions/config.md)
* [`env`](https://tenzir.com/docs/reference/functions/env.md)
