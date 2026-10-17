---
title: "Configure secret store"
canonical: https://tenzir.com/docs/guides/platform-setup/configure-secret-store
source: https://tenzir.com/docs/guides/platform-setup/configure-secret-store.md
section: "Docs"
---

# Configure secret store

> The Tenzir Platform provides a secret store for each workspace. All Tenzir Nodes connected to the workspace can access its secrets. You can manage secrets using the CLI or the web interface. Alternatively, you can use an external secret store.

The Tenzir Platform provides a secret store for each workspace. All Tenzir Nodes connected to the workspace can access its secrets. You can manage secrets using the CLI or the web interface. Alternatively, you can use an external secret store.

Read more about how secrets work in our [explanations page](../../explanations/secrets.md).

## Configuring the platform secret store

### Managing Secrets via the CLI

To add a new secret to the Platform’s secret store:

Add value to the Platform's secret store

```sh
tenzir-platform secret add geheim --value=1528F9F3-FAFA-45B4-BC3C-B755D0E0D9C2
```

Refer to the [CLI reference](../../reference/platform/command-line-interface.md#manage-secrets) for more details on updating or deleting secrets.

### Managing Secrets via Web Interface

To manage secrets from the web interface, go to the `Workspace Settings` screen by clicking the gear icon in the workspace selector.

## Configuring External Secret Stores

You can configure the Tenzir Platform to provide access to secrets stored in an external secret store instead of using it own store. This access is read-only.

### AWS Secrets Manager

To add AWS Secrets Manager as an external secret store, use the CLI:

Add AWS Secrets Manager as external secret store

```sh
tenzir-platform secret store add aws \
  --region='eu-west-1' \
  --assumed-role-arn='arn:aws:iam::1234567890:role/tenzir-platform-secrets-access' \
  --prefix=tenzir/
```

* The Tenzir Platform must have permissions to read secrets under the specified prefix from the external store.
* The platform must be able to assume the specified role in AWS.

See the [CLI reference](../../reference/platform/command-line-interface.md#manage-external-secret-stores) for more details.

### HashiCorp Vault

To add HashiCorp Vault as an external secret store, use the CLI with either token or AppRole authentication:

Add Vault with token authentication

```sh
tenzir-platform secret store add vault \
  --address=https://vault.example.com:8200 \
  --mount=secret \
  --token=hvs.CAESxxxxxxx
```

Add Vault with AppRole authentication

```sh
tenzir-platform secret store add vault \
  --address=https://vault.example.com:8200 \
  --mount=secret \
  --role-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  --secret-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

* The `--mount` parameter specifies the path to a Vault [KV version 2](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2) secrets engine.

- For Vault Enterprise, use `--namespace` to specify the namespace.

- The Tenzir Platform must have read permissions for secrets under the mount.

- Secrets with multiple keys can be accessed using a `:key` suffix. For example, if a secret at path `database` contains `username` and `password` fields:

  ```tql
  from_http "https://example.org", headers={"Authorization": secret("database:password")}
  ```

See the [CLI reference](../../reference/platform/command-line-interface.md#manage-external-secret-stores) for more details.

### Azure Key Vault

To add Azure Key Vault as an external secret store, choose either an Entra service principal or a managed identity. In both cases, grant the identity permission to list and get secrets in the vault. Then run the command for the currently selected workspace.

Add Azure Key Vault as an external secret store

```sh
tenzir-platform secret store add azure \
  --vault-url=https://example.vault.azure.net \
  --azure-tenant-id=<entra_tenant_id> \
  --client-id=<client_id> \
  --client-secret=<client_secret>
```

The platform uses the service principal to read enabled secrets and retrieves the latest version for each secret by name. Azure Key Vault stores are read-only in the platform, so create, update, rotate, and delete secrets in Azure.

The command stores the client secret in the platform’s workspace configuration. The platform masks it when it returns secret-store metadata.

If the platform API runs on an Azure resource with a managed identity, you can use that identity instead of a service principal:

Add Azure Key Vault with a managed identity

```sh
tenzir-platform secret store add azure \
  --vault-url=https://example.vault.azure.net \
  --managed-identity
```

This uses the resource’s system-assigned identity. For a user-assigned identity, pass its client ID with `--managed-identity-client-id=<client_id>`. Managed identity authentication does not require an Azure tenant ID or client secret, and the platform does not store either credential in the workspace configuration.

See the [CLI reference](../../reference/platform/command-line-interface.md#manage-external-secret-stores) for more details.
