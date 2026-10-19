---
title: "Azure Authentication"
canonical: https://tenzir.com/docs/reference/azure-authentication
source: https://tenzir.com/docs/reference/azure-authentication.md
section: "Docs"
---

# Azure Authentication

> Tenzir’s Azure operators authenticate with Microsoft Entra ID using the Azure SDK’s default credential chain, a shared account key, an application client secret, or workload identity federation. This page describes the shared azureauth option used by fromazureblobstorage and toazureblobstorage.

Tenzir’s Azure operators authenticate with Microsoft Entra ID using the Azure SDK’s default credential chain, a shared account key, an application client secret, or workload identity federation. This page describes the shared `azure_auth` option used by [`from_azure_blob_storage`](https://tenzir.com/docs/reference/operators/from_azure_blob_storage.md) and [`to_azure_blob_storage`](https://tenzir.com/docs/reference/operators/to_azure_blob_storage.md).

## Ambient credentials

If you omit both `azure_auth` and `account_key`, the operators use the Azure SDK’s [default credential chain](https://learn.microsoft.com/en-us/azure/developer/cpp/sdk/authentication/credential-chains), which reads process-wide environment variables:

* `AZURE_TENANT_ID`
* `AZURE_CLIENT_ID`
* `AZURE_CLIENT_SECRET`
* `AZURE_AUTHORITY_HOST`
* `AZURE_CLIENT_CERTIFICATE_PATH`
* `AZURE_FEDERATED_TOKEN_FILE`

The chain also picks up a workload identity that Azure Kubernetes Service (AKS) projects into the pod and the session that `az login` writes on a developer machine, which makes it the simplest option when the node talks to a single Entra tenant.

Operators that use ambient credentials share the node’s configured identity. Use `azure_auth` to configure an identity for each operator instance, for example when a node must reach storage accounts in several tenants.

## Account key

Pass a storage account’s shared key with `account_key`. Wrap it with [`secret`](https://tenzir.com/docs/reference/functions/secret.md) so the key stays out of the pipeline definition:

```tql
from_azure_blob_storage "abfss://logs@account.dfs.core.windows.net/**.json",
  account_key=secret("azure-account-key")
```

The `account_key` and `azure_auth` options are mutually exclusive.

## `azure_auth` options

The `azure_auth` record accepts these fields:

| Field           | Type                 | Description                                                           |
| --------------- | -------------------- | --------------------------------------------------------------------- |
| `tenant_id`     | `string` or `secret` | The Microsoft Entra tenant ID or tenant domain. Required.             |
| `client_id`     | `string` or `secret` | The application client ID. Required.                                  |
| `client_secret` | `string` or `secret` | The application client secret.                                        |
| `web_identity`  | `record`             | A federated OpenID Connect (OIDC) token used as a client assertion.   |
| `authority`     | `string` or `secret` | The OAuth authority. Defaults to `https://login.microsoftonline.com`. |

The `client_secret` and `web_identity` fields are mutually exclusive, and one of them must be present. The blob operators hand the credential to the Azure SDK, which requests the storage scope itself, so they reject a `scope` field.

## Client secret

Authenticate as an Entra application with a client secret:

```tql
from_azure_blob_storage "abfss://logs@account.dfs.core.windows.net/**.json",
  azure_auth={
    tenant_id: secret("entra-tenant-id"),
    client_id: secret("entra-client-id"),
    client_secret: secret("entra-client-secret"),
  }
```

The application needs a role assignment on the storage account or container, such as Storage Blob Data Reader for reading and Storage Blob Data Contributor for writing.

## Workload identity federation

Workload identity federation replaces the client secret with an OIDC token that an external identity provider issues to the workload, so there is no long-lived credential to rotate. Configure a [federated credential](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation) on the Entra application that trusts the provider, then point `web_identity` at the token:

```tql
from_azure_blob_storage "abfss://logs@account.dfs.core.windows.net/**.json",
  azure_auth={
    tenant_id: secret("entra-tenant-id"),
    client_id: secret("entra-client-id"),
    web_identity: {
      token_file: "/var/run/secrets/azure/tokens/azure-identity-token",
    },
  }
```

Entra expects the token’s audience to be `api://AzureADTokenExchange`. Unlike AWS, Entra has no role to assume: `tenant_id` and `client_id` already name the identity.

Exactly one of the following token sources must be specified in `web_identity`:

* **`token_file`**: Path to a file containing the JWT. This is standard for Kubernetes workload identity, where the platform projects a service account token into the pod.
* **`token_endpoint`**: Configuration for fetching the token over HTTP. Use this for cloud metadata services and CI token endpoints, as described in [the token endpoint options](azure-authentication.md#token-endpoints).
* **`token`**: Direct token value, useful for testing or when the token comes from another source.

### Token endpoints

The `token_endpoint` record fetches the assertion from an HTTP endpoint:

| Field          | Type                 | Description                                                                                                |
| -------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `url`          | `string` or `secret` | The endpoint that returns a token. Required.                                                               |
| `headers`      | `record`             | HTTP headers to send with the request.                                                                     |
| `query_params` | `record`             | Query parameters to append to `url`, percent-encoded.                                                      |
| `path`         | `string` or `null`   | JSON path to the token in the response. Defaults to `.access_token`. Use `null` for a plain-text response. |

Both `headers` and `query_params` take `string` or [`secret`](https://tenzir.com/docs/reference/functions/secret.md) values. Existing query parameters in `url` are preserved.

Most providers name the audience parameter `audience`, and for Entra its value is always `api://AzureADTokenExchange`.

## Examples

### Read blobs from a GCP virtual machine

The GCP metadata server returns a bare JWT rather than a JSON object, so set `path` to `null`:

```tql
from_azure_blob_storage "abfss://logs@customer.dfs.core.windows.net/**.json.gz",
  azure_auth={
    tenant_id: secret("customer-entra-tenant"),
    client_id: secret("customer-entra-client"),
    web_identity: {
      token_endpoint: {
        url: "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity",
        query_params: { "audience": "api://AzureADTokenExchange" },
        headers: { "Metadata-Flavor": "Google" },
        path: null,
      },
    },
  } {
  read_json
}
```

### Write blobs from a GitHub Actions job

A job with `id-token: write` permission gets an endpoint URL and a request token in its environment. The URL already ends in an `api-version` parameter, and `query_params` appends the audience to it:

```tql
to_azure_blob_storage "abfss://results@account.dfs.core.windows.net/run.json",
  azure_auth={
    tenant_id: secret("entra-tenant-id"),
    client_id: secret("entra-client-id"),
    web_identity: {
      token_endpoint: {
        url: env("ACTIONS_ID_TOKEN_REQUEST_URL"),
        query_params: { "audience": "api://AzureADTokenExchange" },
        headers: {
          "Authorization": "Bearer " + env("ACTIONS_ID_TOKEN_REQUEST_TOKEN"),
        },
        path: ".value",
      },
    },
  } {
  write_ndjson
}
```

## Microsoft Graph

The [`from_microsoft_graph`](https://tenzir.com/docs/reference/operators/from_microsoft_graph.md) operator uses an `auth` record with `tenant_id`, `client_id`, `client_secret`, `scope`, and `authority`. It supports client-secret authentication and does not accept `web_identity`.

## Azure Log Analytics queries

The experimental [`from_azure_log_analytics`](https://tenzir.com/docs/reference/operators/from_azure_log_analytics.md) operator requires an `azure_auth` record with `tenant_id`, `client_id`, and `client_secret`. It also accepts `scope` and `authority`; the default scope is `https://api.loganalytics.io/.default`. This differs from the Logs Ingestion API scope used by [`to_azure_log_analytics`](https://tenzir.com/docs/reference/operators/to_azure_log_analytics.md).

Grant the application query access to the target workspace, for example with the **Log Analytics Reader** role. The query operator doesn’t support ambient credentials or `web_identity`. It uses the shared client-credentials token provider rather than the Azure SDK credential chain.

## See Also

* [AWS Authentication](aws-authentication.md)
* [Azure Blob Storage](../integrations/microsoft/azure-blob-storage.md)
