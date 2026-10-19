---
title: "Command line interface"
canonical: https://tenzir.com/docs/reference/platform/command-line-interface
source: https://tenzir.com/docs/reference/platform/command-line-interface.md
section: "Docs"
---

# Command line interface

> The Tenzir Platform command-line interface (CLI) allows you to interact with the Tenzir Platform from the command line to manage organizations, workspaces, and nodes.

The Tenzir Platform command-line interface (CLI) allows you to interact with the Tenzir Platform from the command line to manage organizations, workspaces, and nodes.

## Installation

Install the [`tenzir-platform`](https://pypi.org/project/tenzir-platform/) package from PyPI.

```text
pip install tenzir-platform
```

## Global Options

The following options are available for all `tenzir-platform` commands:

* `-v, --verbose`: Enable verbose logging for additional error information and debugging output.

## Environment Variable Configuration

The Tenzir Platform CLI supports several environment variables to configure authentication and platform connection settings. All configuration variables for the CLI share the prefix `TENZIR_PLATFORM_CLI_`.

### Supported Settings

* `TENZIR_PLATFORM_CLI_API_ENDPOINT`: The URL of the Tenzir Platform API instance to connect to. Defaults to `https://rest.tenzir.app/production-v1`.

* `TENZIR_PLATFORM_CLI_EXTRA_HEADERS`: Additional headers that the CLI should send with any request to the Tenzir Platform. Must provide as a JSON object.

* `TENZIR_PLATFORM_CLI_ISSUER_URL`: The OIDC issuer URL for authentication. Defaults to the issuer URL that the public Tenzir Platform instance uses at <https://app.tenzir.com>.

* `TENZIR_PLATFORM_CLI_CLIENT_ID`: The client ID for the CLI client. Defaults to the client id that the public Tenzir Platform instance uses at <https://app.tenzir.com>.

* `TENZIR_PLATFORM_CLI_CLIENT_SECRET`: The client secret for the CLI client. When set, the CLI automatically attempts to use the client credentials flow instead of the device code flow for authentication.

* `TENZIR_PLATFORM_CLI_CLIENT_SECRET_FILE`: Path to a file containing the client secret. Alternative to providing the secret directly via `TENZIR_PLATFORM_CLI_CLIENT_SECRET`.

* `TENZIR_PLATFORM_CLI_ID_TOKEN`: If provided, skip the login workflow completely and use this token for authentication.

* `TENZIR_PLATFORM_CLI_AUDIENCE`: Override the OIDC audience parameter. Defaults to the client ID. Required for non-interactive logins with some identity providers like Microsoft Entra.

* `TENZIR_PLATFORM_CLI_SCOPE`: Override the default OIDC scopes. Defaults to `openid email` for device code flow and `openid` for client credentials flow. Use this to customize the requested permissions during authentication.

## Authentication

### Synopsis

```text
tenzir-platform auth login
tenzir-platform workspace list [--json]
tenzir-platform workspace select <workspace>
tenzir-platform workspace create [--name=<name>]
tenzir-platform workspace rename <name>
```

### Description

The `tenzir-platform auth login` command authenticates you with the platform.

* `tenzir-platform workspace list` shows all workspaces available to you. Use `--json` for machine-readable output.
* `tenzir-platform workspace select` selects a workspace for subsequent operations.
* `tenzir-platform workspace create` creates a new personal workspace. If `--name` is omitted, the platform generates a name with a timestamp. To create an organization-owned workspace, use `tenzir-platform org create-workspace` instead.
* `tenzir-platform workspace rename` renames the currently selected workspace.

#### `<workspace>`

A workspace ID (e.g., `t-abcd1234`), a workspace name, or a numeric index from `tenzir-platform workspace list`.

## Manage Organizations

### Synopsis

```text
tenzir-platform org create <name>
tenzir-platform org delete
tenzir-platform org info
tenzir-platform org create-workspace [--name=<name>]
tenzir-platform org invite [--role=<role>] [--label=<label>]
tenzir-platform org list-invitations
tenzir-platform org revoke-invitation <invitation_id>
```

### Description

The following commands manage organizations. Each user can belong to at most one organization. Members of an organization gain access to all organization-owned workspaces by default.

* `tenzir-platform org create` creates a new organization with the given display name. You become its first admin.
* `tenzir-platform org delete` permanently deletes your organization along with all of its workspaces and their contents. Only organization admins can run this command. This action cannot be undone.
* `tenzir-platform org info` shows the organization name, member count, and number of pending invitations.
* `tenzir-platform org create-workspace` creates a workspace owned by your organization. Only organization admins can run this command. If `--name` is omitted, the platform generates a name with a timestamp.
* `tenzir-platform org invite` creates an invitation token for your organization. Share the token with the invitee so they can join. Invitations expire after 7 days.
* `tenzir-platform org list-invitations` lists all invitations for your organization with their status, role, and label.
* `tenzir-platform org revoke-invitation` revokes a pending invitation.

#### `<name>`

The display name for the organization.

#### `--role=<role>`

The role to assign to the invited member. Either `admin` or `member`. Defaults to `member`.

#### `--label=<label>`

A human-readable description to help track the invitation.

#### `<invitation_id>`

The unique ID of the invitation, as shown in `tenzir-platform org invite` or `tenzir-platform org list-invitations`.

## Manage Workspace Invitations

### Synopsis

```text
tenzir-platform workspace invite [--label=<label>]
tenzir-platform workspace list-invitations
tenzir-platform workspace revoke-invitation <invitation_id>
```

### Description

Workspace admins can invite users directly to a specific workspace, independent of organization membership. Invitations expire after 7 days.

* `tenzir-platform workspace invite` creates an invitation token for the currently selected workspace. Share the token with the invitee.
* `tenzir-platform workspace list-invitations` lists all invitations for the currently selected workspace with their status and label.
* `tenzir-platform workspace revoke-invitation` revokes a pending invitation.

#### `--label=<label>`

A human-readable description to help track the invitation.

#### `<invitation_id>`

The unique ID of the invitation, as shown in `tenzir-platform workspace invite` or `tenzir-platform workspace list-invitations`.

## Manage Nodes

### Synopsis

```text
tenzir-platform node list
tenzir-platform node ping <node_id>
tenzir-platform node create [--name <node_name>]
tenzir-platform node delete <node_id>
tenzir-platform node run [--name <node_name>] [--image <container_image>]
```

### Description

The following commands interact with the selected workspace:

* `tenzir-platform node list` lists all nodes in the selected workspace, including their ID, name, and connection status.
* `tenzir-platform node ping` pings the specified node.
* `tenzir-platform node create` registers a new node at the platform. This command creates a new API key that a node can use to connect to the platform. It does not start or configure a node.
* `tenzir-platform node delete` removes a node from the platform. This command does not stop the node; it only removes it from the platform.
* `tenzir-platform node run` creates and registers an ad-hoc node, then starts it on the local host. This command requires Docker Compose. The platform deletes the temporary node when you stop the `run` command.

#### `<node_id>`

The unique ID of the node, as shown in `tenzir-platform node list`.

#### `<node_name>`

The name of the node as shown in the app.

#### `<container_image>`

The Docker image to use for the ad-hoc created node. We recommend using one of the following images:

* `tenzir/tenzir:latest` to use the latest release.
* `tenzir/tenzir:main` to use the current development version.
* `tenzir/tenzir:v5` to pin to a major release.
* `tenzir/tenzir:v5.1` to pin to a minor release.
* `tenzir/tenzir:v5.1.3` to use a specific release.

## Manage Secrets

The Tenzir Platform provides secret storage that pipelines running on a Tenzir node can access.

### Synopsis

```text
tenzir-platform secret add <name> [--file=<file>] [--value=<value>] [--env]
tenzir-platform secret update <secret_id> [--file=<file>] [--value=<value>] [--env]
tenzir-platform secret delete <secret_id>
tenzir-platform secret list [--json]
```

### Description

The following commands manage secrets in the Tenzir Platform:

* `tenzir-platform secret add` adds a new secret to the platform. You can provide the secret value directly via the `--value` option, read it from a file using the `--file` option, or source it from an environment variable using the `--env` flag. The platform identifies the secret by the provided `<name>`.

* `tenzir-platform secret update` updates an existing secret identified by `<secret_id>`. Like adding a secret, you can provide the new value via `--value`, `--file`, or `--env`.

* `tenzir-platform secret delete` removes a secret from the platform. The command identifies the secret to delete by its `<secret_id>`.

* `tenzir-platform secret list` lists all secrets available in the platform. Use the `--json` flag to output the list in JSON format for easier integration with other tools.

#### `<name>`

The unique name to identify the secret. Pipelines use this name when they access the secret.

#### `<secret_id>`

The unique identifier of the secret, as shown in the output of `tenzir-platform secret list`.

#### `--file=<file>`

Specifies a file containing the secret value. The platform securely stores the file’s contents as the secret value.

#### `--value=<value>`

Specifies the secret value directly as a command-line argument.

#### `--env`

Indicates that the command should source the secret value from an environment variable. You must set the environment variable before you run the command.

#### `--json`

Outputs the list of secrets in JSON format when used with the `tenzir-platform secret list` command.

## Manage external secret stores

You can configure workspaces to use external secret stores instead of the Tenzir Platform’s built-in secret store.

Currently, the platform supports [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) and [HashiCorp Vault](https://www.vaultproject.io/), and [Azure Key Vault](https://azure.microsoft.com/products/key-vault) as external stores.

By default, the platform mounts external secret stores as read-only. You can’t add or update secrets from the CLI or web interface. Some external secret store implementations may offer write access options.

### Synopsis

```text
tenzir-platform secret store add aws
    --region=<region>
    --assumed-role-arn=<assumed_role_arn>
    [--name=<name>]
    [--prefix=<prefix>]
    [--access-key-id=<key_id>]
    [--secret-access-key=<key>]
tenzir-platform secret store add vault
    --address=<address>
    --mount=<mount>
    (--token=<token> | --role-id=<role_id> --secret-id=<secret_id>)
    [--name=<name>]
    [--namespace=<namespace>]
tenzir-platform secret store add azure
    --vault-url=<vault_url>
    --azure-tenant-id=<azure_tenant_id>
    --client-id=<client_id>
    --client-secret=<client_secret>
    [--name=<name>]
tenzir-platform secret store add azure
    --vault-url=<vault_url>
    --managed-identity
    --workspace=<workspace_id>
    [--managed-identity-client-id=<managed_identity_client_id>]
    [--name=<name>]
tenzir-platform secret store set-default <store_id>
tenzir-platform secret store delete <store_id>
tenzir-platform secret store list [--json]
```

### Description

When a node accesses a secret using the `secret("foo")` function in a pipeline, the platform looks up the secret named `foo` in the workspace’s default secret store and returns the value to the node.

When using an external secret store, the platform needs the necessary permissions to read secret values from that store.

For AWS Secrets Manager, the Tenzir Platform uses [AWS Security Token Service (STS)](https://docs.aws.amazon.com/STS/latest/APIReference/welcome.html) to assume a role with the necessary permissions. You must create this role and configure one of the following options:

1. Create an IAM user. Download access keys and pass them via the `--access-key-id` and `--secret-access-key` arguments. This approach is the easiest to set up but only acceptable for self-hosted testing or development instances of the Tenzir Platform because it stores long-term credentials in the Tenzir Platform.

2. Assign the permissions to the task role of the websocket gateway. We recommend this option if you’re running the Sovereign Edition of the Platform and deploying it to your own AWS account.

3. Assign the permission to assume the configured role to Tenzir’s AWS account with the ID `660178929208`. This option works only with our publicly hosted platform instance on `https://app.tenzir.com`.

We plan to add an OIDC-based option as an alternative to options 1 and 3.

For HashiCorp Vault, the platform connects directly to your Vault server and authenticates using one of the following methods:

1. **Token authentication**: Pass a Vault token via the `--token` argument. The token must have read access to secrets under the configured mount path. This approach works well for development or when using periodic tokens that can be renewed automatically.

2. **AppRole authentication**: Pass the role ID and secret ID via the `--role-id` and `--secret-id` arguments. The platform authenticates with Vault using the AppRole auth method. This approach is recommended for production deployments as it allows for automatic credential rotation.

The `--mount` parameter specifies the path to a Vault [KV version 2](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2) secrets engine (e.g., `secret`).

For Vault Enterprise deployments, use the `--namespace` parameter to specify the namespace.

Vault secrets are returned as JSON by default. You can append a `:key` suffix to the secret name to return just the value of that key as a string instead. For example, if a secret at path `database` contains keys `username` and `password`, use `secret("database:password")` in your pipeline to retrieve only the password value.

For Azure Key Vault, choose one of the following authentication methods:

1. **Service principal authentication**: Pass the Entra tenant ID, client ID, and client secret. Grant the service principal permission to list and get secrets in the vault before you run the command.

2. **Managed identity authentication**: Pass `--managed-identity` when the platform API runs on an Azure resource with a managed identity. The command uses the resource’s system-assigned identity by default. For a user-assigned identity, pass its client ID with `--managed-identity-client-id=<client_id>`. Managed identity authentication does not require an Azure tenant ID or client secret. A platform administrator must run this command and identify the target workspace with `--workspace=<workspace_id>`. This explicit administrator action binds the deployment identity and vault to that workspace.

Grant the managed identity the **Key Vault Secrets User** role when the vault uses Azure role-based access control. For a vault that uses access policies, grant the identity `list` and `get` permissions for secrets. Azure Key Vault stores are read-only, and the platform always retrieves the latest secret version by name.

## Manage Alerts

### Synopsis

```text
tenzir-platform alert add <node> <duration> <webhook_url> [<webhook_body>]
tenzir-platform alert delete <alert_id>
tenzir-platform alert list
```

### Description

The following commands set up alerts for specific nodes. When a node remains disconnected for the configured duration, the alert triggers by sending a POST request to the configured webhook URL.

#### `<node>`

The node to monitor. You can provide either a node ID or a node name, as long as the name is unambiguous.

#### `<duration>`

The amount of time to wait between the node disconnect and triggering the alert.

#### `<webhook_url>`

The platform sends a POST request to this URL when the alert triggers.

#### `<webhook_body>`

The body to send with the webhook. Must be valid JSON. The body may contain `$NODE_NAME`, which the platform replaces with the name of the node that triggered the alert.

Defaults to `{"text": "Node $NODE_NAME disconnected for more than {duration}s"}`, where the platform sets `$NODE_NAME` and `{duration}` dynamically from the CLI parameters.

### Example

Consider nodes like this:

```text
$ tenzir-platform node list
🟢 Node-1 (n-w2tjezz3)
🟢 Node-2 (n-kzw21299)
🔴 Node-3 (n-ie2tdgca)
```

We want to receive a Slack notification whenever Node-3 is offline for more than three minutes. First, we create a webhook as described in the [Slack docs](https://api.slack.com/messaging/webhooks). Next, we configure the alert in the Tenzir Platform:

```text
tenzir-platform alert add Node-3 3m "https://hooks.slack.com/services/XXXXX/YYYYY/ZZZZZ" '{"text": "Alert! Look after node $NODE_NAME"}'
```

If Node-3 doesn’t reconnect within three minutes, a message appears in the configured Slack channel.

## Manage workspaces

On-premise setup required

This CLI functionality requires an on-premise platform deployment, available with the [Sovereign Edition](https://tenzir.com/pricing.md).

These CLI commands are available only to local platform administrators. The [`TENZIR_PLATFORM_OIDC_ADMIN_RULES` variable](https://tenzir.com/docs/guides/platform-setup/configure-identity-provider.md) defines who’s an administrator in your platform deployment.

### Synopsis

```text
tenzir-platform admin list-global-workspaces
tenzir-platform admin create-workspace <owner_namespace> <owner_id> [--name=<workspace_name>] [--category=<workspace_category>]
tenzir-platform admin update-workspace <workspace_id> [--name=<workspace_name>] [--icon-url=<icon_url>] [--owner-namespace=<owner_namespace>] [--owner-id=<owner_id>] [--category=<workspace_category>]
tenzir-platform admin delete-workspace <workspace_id>
```

### Description

The `tenzir-platform admin list-global-workspaces`, `tenzir-platform admin create-workspace`, `tenzir-platform admin update-workspace`, and `tenzir-platform admin delete-workspace` commands list, create, update, or delete workspaces, respectively.

New workspaces need an access rule

Only a `user` workspace comes with a default access rule. A `team` or `organization` workspace starts without any rule, so nobody can open it and it does not show up in `tenzir-platform workspace list`, not even for platform administrators. Until you add an [access rule](command-line-interface.md#configure-access-rules), `tenzir-platform admin list-global-workspaces` is the only command that shows the workspace.

#### `<owner_namespace>`

One of `user`, `organization`, or `team`, depending on who owns the workspace:

* `user`: a single person, identified by the `sub` claim of their OIDC token.
* `organization`: an organization that already exists in the platform, created with [`tenzir-platform org create`](https://tenzir.com/docs/reference/platform/command-line-interface.md#manage-organizations). The workspace follows that organization’s membership and policies.

The `team` namespace is the custom option. Its owner id is a label of your own choosing, such as a customer or department name, which the platform stores as-is and never derives access from. Use it to define who reaches a workspace entirely through [access rules](command-line-interface.md#configure-access-rules), instead of delegating that decision to the platform’s organization membership.

The selected namespace determines the *default* access rules for the workspace:

* For a user workspace, the platform creates a single access rule that allows access to the user whose user ID matches the given `owner_id`.
* For a team or organization workspace, the platform creates no rules by default. You must manually add them using the `add-auth-rule` subcommand described below.

#### `<owner_id>`

The unique ID of the workspace owner:

* If `<owner_namespace>` is `user`, this matches the user’s `sub` claim in the OIDC token.
* If `<owner_namespace>` is `organization`, this is the ID of an existing organization and has the form `org-xxxxxxxx`. A workspace that names an organization that does not exist fails to open with a server error, so use the `team` namespace for free-form identifiers.
* If `<owner_namespace>` is `team`, this is an arbitrary string that uniquely identifies the team the workspace belongs to.

#### `--name <workspace_name>`

The name of the workspace as shown in the app.

#### `--category <workspace_category>`

An arbitrary string that the app uses as a header when it groups several workspaces of the same owner. Only workspaces that share an owner ID group together.

#### `--icon-url <icon_url>`

The image that the app shows for this workspace.

#### `--owner-namespace <owner_namespace>` and `--owner-id <owner_id>`

The new owner of an existing workspace. Both options take the same values as the corresponding `create-workspace` arguments. Use them to correct a workspace that carries the wrong owner, such as one that names a nonexistent organization:

```bash
tenzir-platform admin update-workspace <workspace_id> --owner-namespace=team --owner-id=<owner_id>
```

#### `<workspace_id>`

The unique ID of the workspace, as shown in `tenzir-platform workspace list` or `tenzir-platform admin list-global-workspaces`.

## Configure access rules

On-premise setup required

You can use this CLI functionality only with an on-premise platform deployment, which is available to users of the [Sovereign Edition](https://tenzir.com/pricing.md).

These CLI commands are available only to local platform administrators. The [`TENZIR_PLATFORM_OIDC_ADMIN_RULES` variable](https://tenzir.com/docs/guides/platform-setup/configure-identity-provider.md) defines who’s an administrator in your platform deployment.

### Synopsis

```text
tenzir-platform admin list-auth-rules <workspace_id>


tenzir-platform admin add-auth-rule allow-all <workspace_id>
tenzir-platform admin add-auth-rule user <workspace_id> <user_id>
tenzir-platform admin add-auth-rule
    email-domain <workspace_id> <domain> [--connection=<connection>]
tenzir-platform admin add-auth-rule
    organization-membership <workspace_id> <organization_claim> <organization> [--connection=<connection>]
tenzir-platform admin add-auth-rule
    organization-role <workspace_id> <roles_claim> <role> <organization_claim> <organization> [--connection=<connection>]


tenzir-platform admin delete-auth-rule <workspace_id> <auth_rule_index>
```

### Description

You can use the `tenzir-platform admin list-auth-rules`, `tenzir-platform admin add-auth-rule`, and `tenzir-platform admin delete-auth-rule` commands to list, create, or delete authentication rules for all users, respectively, if you have admin permissions.

Authentication rules allow you to access the workspace with the provided `<workspace_id>` if your `id_token` matches the configured rule. You gain access to a workspace if any configured rule allows access. The following rules exist:

* **Email Suffix Rule**: `tenzir-platform admin add-auth-rule email-domain` allows access if the `id_token` contains an `email` field that ends with the configured `<domain>`.

* **Organization Membership**: `tenzir-platform admin add-auth-rule organization-membership` allows access if the `id_token` contains an `<organization_claim>` field that exactly matches the provided `<organization>`.

  Note that you can freely choose the `<organization_claim>` and `<organization>`, so you can also repurpose this rule for generic claims that are not necessarily related to organizations.

* **Organization Role Rule**: `tenzir-platform admin add-auth-rule organization-role` allows access if the `id_token` contains an `<organization_claim>` field that exactly matches the provided `<organization>`, and a `<roles_claim>` field that must be a list containing a value exactly matching `<role>`.

  We recommend using organization role rules to check if you have a specific role with an organization.

* **User Rule**: `tenzir-platform admin add-auth-rule user` allows access if the `id_token` contains a `sub` field that exactly matches the provided `<user_id>`.

* **Allow all rule**: `tenzir-platform admin add-auth-rule allow-all` allows access to every user. Use this rule to set up a workspace that all users of a platform instance can access.

#### `--connection <connection>`

Restricts a rule to `sub` claims that start with `<connection>|`. Omit the option to let the rule match any `sub` claim.

The intended use case is an identity provider that is itself federated. Such a provider brokers several upstream providers and records which one a user came from as a prefix of the `sub` claim. Auth0, for example, calls these upstreams connections and issues a `sub` such as `github|132020102`, so passing `--connection=github` holds the rule to users who arrived through that upstream.
