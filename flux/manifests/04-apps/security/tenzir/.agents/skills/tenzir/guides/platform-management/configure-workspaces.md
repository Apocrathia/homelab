---
title: "Configure workspaces"
canonical: https://tenzir.com/docs/guides/platform-management/configure-workspaces
source: https://tenzir.com/docs/guides/platform-management/configure-workspaces.md
section: "Docs"
---

# Configure workspaces

> Workspaces in the platform logically group nodes, secrets, and dashboards.

Workspaces in the [platform](../../explanations/platform.md) logically group nodes, secrets, and dashboards.

You can configure workspaces in two ways:

1. **Dynamically**: Create, update, or delete workspaces using the command line interface. 👉 Suited for ad-hoc workspace management.
2. **Statically**: Pre-define workspaces declaratively in configuration files. 👉 Suited for GitOps-based infrastructure management.

## Manage workspaces dynamically

The Tenzir Platform CLI allows administrators to create, modify, and delete workspaces on demand.

On-premise setup required

This CLI functionality requires an on-premise platform deployment, available with the [Sovereign Edition](https://tenzir.com/pricing.md).

Only local platform administrators can manage workspaces dynamically. The [`TENZIR_PLATFORM_OIDC_ADMIN_RULES` variable](https://tenzir.com/docs/guides/platform-setup/configure-identity-provider.md) defines who’s an administrator in your platform deployment.

### Creating and managing workspaces

You can create a workspace for an individual user, for a team, or for an organization. A user workspace comes with access for that specific user. Team and organization workspaces start with no access rules, giving you full control over who can access them.

Choose the owner namespace by deciding who controls access to the workspace:

* Use `user` for a workspace that belongs to one person.
* Use `organization` for an organization that already exists in the platform, so that the workspace follows that organization’s membership and policies. Its ID has the form `org-xxxxxxxx`, and a workspace that names an organization that does not exist fails to open with a server error.

The `team` namespace is the custom option, and the one most Sovereign Edition deployments want. Its owner ID is a label of your own choosing, such as a customer or department name, which the platform never derives access from. Use it to admit users through [access rules](configure-workspaces.md#understanding-access-control) that match the claims your identity provider issues, instead of modelling those groups as platform organizations.

For a detailed overview, of the available commands, take a look at our [CLI reference documentation](../../reference/platform/command-line-interface.md).

Add an access rule before you hand out the workspace

A team or organization workspace has no access rules when you create it. Nobody can open it, and it does not appear in `tenzir-platform workspace list`, not even for platform administrators. Creating a workspace is therefore always at least two commands: one to create it, and one to grant access. Use `tenzir-platform admin list-global-workspaces` to see workspaces that no rule matches yet.

### Example: Setting up a team workspace

Let’s walk through creating a workspace for the fictional “Scrooge & Marley Counting House” team, with access granted entirely through access rules:

1. **Create the team workspace:**

   ```bash
   tenzir-platform admin create-workspace team scrooge-marley --name "Scrooge & Marley Counting House"
   ```

   This creates a workspace with the owner ID `scrooge-marley` and the display name “Scrooge & Marley Counting House”. The command prints the ID of the new workspace, which the following steps use as `<workspace_id>`.

2. **Configure access for employees with company email addresses:**

   ```bash
   tenzir-platform admin add-auth-rule email-domain <workspace_id> '@scroogemarley.com'
   ```

3. **Add a specific user:**

   The specific format of the user id depends on the OIDC provider you configured. The provided id must match the `sub` of the generated OIDC token in order to allow access to the workspace.

   ```bash
   tenzir-platform admin add-auth-rule user <workspace_id> 'sub|12345678901'
   ```

4. **Grant access to users with the “accountant” role:**

   ```bash
   tenzir-platform admin add-auth-rule organization-role <workspace_id> roles accountant organization scrooge-marley
   ```

Each rule accepts an optional `--connection` flag that restricts it to `sub` claims starting with a given prefix. This is meant for an identity provider that is itself federated and records the upstream provider a user came from as that prefix, such as `github|132020102`.

If you gave a workspace the wrong owner, correct it without recreating it:

```bash
tenzir-platform admin update-workspace <workspace_id> --owner-namespace=team --owner-id=scrooge-marley
```

If you later need to remove the workspace:

```bash
tenzir-platform admin delete-workspace <workspace_id>
```

### Understanding access control

Access rules determine who can enter a workspace. Users gain access to the workspace if they match any configured rule. Think of rules as multiple keys to the same door.

The platform supports various rule types, from allowing everyone to restricting access to specific users or organization members.

For a complete reference of all available authentication rules and their parameters, see the [CLI reference documentation](../../reference/platform/command-line-interface.md#configure-access-rules).

## Define static workspaces

You pre-define **static workspaces** declaratively in configuration files. This “as-code” approach differs from the dynamic management approach, which you manage with the [command line interface](../../reference/platform/command-line-interface.md).

Here’s a minimal example of a static workspace configuration:

workspaces.yaml

```yaml
workspaces:
  static0: # Unique workspace identifier
    name: Tenzir # Display name in the UI
    category: Statically Configured Workspaces # Grouping category in the UI
    icon-url: https://storage.googleapis.com/tenzir-public-data/icons/tenzir-logo-square.svg
    auth-rules:
      - { "auth_fn": "auth_allow_all" } # Authentication rule (this allows everyone)
```

The `auth-rules` section defines who can access the workspace. The example above uses `auth_allow_all`. This rule grants access to everyone.

Generating Auth Rules

Use the `print-auth-rule` [CLI](../../reference/platform/command-line-interface.md) command to easily generate auth rules in the correct format:

```bash
tenzir-platform tools print-auth-rule allow-all
```

The `platform` service in a Tenzir Platform deployment uses the `WORKSPACE_CONFIG_FILE` environment variable to locate its static workspace configuration file:

docker-compose.yaml

```yaml
services:
  platform:
    environment:
      # Other environment variables...
      - WORKSPACE_CONFIG_FILE=/etc/tenzir/workspaces.yaml
    volumes:
      # Mount your config file.
      - ./workspaces.yaml:/etc/tenzir/workspaces.yaml
```

This example mounts a local `workspaces.yaml` file into the container. The platform service then accesses it at the location that `WORKSPACE_CONFIG_FILE` specifies.

### Add a workspace token

A **workspace token** is a shared secret that allows nodes to self-register as [ephemeral nodes](use-ephemeral-nodes.md) without manual provisioning. Add a `token` field to your static workspace configuration:

workspaces.yaml

```yaml
workspaces:
  static0:
    name: Tenzir
    category: Statically Configured Workspaces
    icon-url: https://storage.googleapis.com/tenzir-public-data/icons/tenzir-logo-square.svg
    auth-rules:
      - { "auth_fn": "auth_allow_all" }
    token: wsk_e9ee76d4faf4b213745dd5c99a9be11f501d7009ded63f2d5NmDS38vXR
```

For improved security, reference a file instead of inlining the token:

workspaces.yaml

```yaml
workspaces:
  static0:
    name: Tenzir
    # Other configuration...
    token-file: /run/secrets/workspace_token
```

Generate a valid token with the CLI:

```bash
tenzir-platform tools generate-workspace-token <workspace-id>
```

Caution

Workspace tokens have a specific format. Do not create them manually. Use the `generate-workspace-token` command or see the [ephemeral nodes guide](use-ephemeral-nodes.md#workspace-token-format) for format details.
