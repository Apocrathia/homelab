# ContextForge

IBM [ContextForge](https://ibm.github.io/mcp-context-forge/) (mcp-context-forge) gateway for MCP, A2A, and HTTP APIs.

> **Navigation**: [← Back to Artificial Intelligence README](../README.md)

## Overview

The gateway runs as a `generic-app` workload. PostgreSQL is CloudNative-PG via the same chart. Cache Redis is a second `generic-app` release in this namespace (`contextforge-redis`), matching the multi–HelmRelease pattern used elsewhere (for example JetKVM).

## Access

External URL: `https://contextforge.gateway.services.apocrathia.com` (Gateway API HTTPRoute on `main-gateway`).

## Secrets (1Password)

Create vault item `contextforge-secrets` referenced in [helmrelease.yaml](./helmrelease.yaml). Synced keys must include:

| Key                       | Purpose                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `username`                | PostgreSQL owner (use `contextforge` to match CNPG bootstrap defaults)               |
| `password`                | PostgreSQL password (URL-safe characters avoid encoding edge cases)                  |
| `jwt-secret-key`          | JWT signing secret (strong, 32+ bytes)                                               |
| `auth-encryption-secret`  | Encrypts stored auth material                                                        |
| `platform-admin-email`    | Bootstrap admin email                                                                |
| `platform-admin-password` | Bootstrap admin password                                                             |
| `oidc-client-id`          | OAuth2 client ID from Authentik after the provider exists (optional until SSO works) |
| `oidc-client-secret`      | OAuth2 client secret (same)                                                          |

Authentik OIDC mode does not pass `client_id` / `client_secret` from Helm; the provider is created so Authentik generates credentials. Copy them into the vault item, then let 1Password sync and restart the workload so `SSO_GENERIC_*` picks them up.

## In-cluster MCP and SSRF

`SSRF_ALLOW_PRIVATE_NETWORKS` stays `false`; `SSRF_ALLOWED_NETWORKS` in [helmrelease.yaml](./helmrelease.yaml) lists this cluster’s pod and service CIDRs from [talos/cilium-install.md](../../../../../talos/cilium-install.md) (`10.42.0.0/16`, `10.69.0.0/16`). If Talos/Cilium addressing changes, update the env to match.

## MCP server catalog (ToolHive / LiteLLM parity)

The Admin UI **bulk import JSON** (see [bulk-import-sample.json](./bulk-import-sample.json)) is for **REST-shaped tools**, not for registering **MCP servers**.

Homelab MCP URLs (ToolHive streamable HTTP, same as [litellm/litellm.yml](../litellm/litellm.yml) `mcp_servers`) are listed in [mcp-catalog.yml](./mcp-catalog.yml). [mcp-catalog.json](./mcp-catalog.json) mirrors that file for tooling—regenerate after YAML edits:

```bash
ruby -ryaml -rjson -e '
  d = YAML.load_file("mcp-catalog.yml")
  File.write("mcp-catalog.json", JSON.pretty_generate(d) + "\n")
'
```

Kustomize emits ConfigMap `contextforge-mcp-catalog`; the pod mounts it at `/etc/contextforge` and [helmrelease.yaml](./helmrelease.yaml) sets `MCPGATEWAY_CATALOG_FILE` / `MCPGATEWAY_CATALOG_ENABLED`.

Upstream intent is **catalog discovery** (and optionally **auto-register on gateway startup**), not the same workflow as **Export/Import** JSON. Confirm behavior on your image (`v1.0.0-RC2`) before relying on it; if the file is ignored or only used for the MCP Registry browser, use **Admin → MCP Servers** manual add or the **HTTP API** next.

### Manual catalog verification

```bash
# Pod sees the file and env (adjust pod name if different)
kubectl get pods --namespace contextforge
kubectl exec --namespace contextforge deploy/contextforge -- ls -la /etc/contextforge
kubectl exec --namespace contextforge deploy/contextforge -- printenv | grep MCPGATEWAY_CATALOG

# Startup / reload messages (look for catalog, parse, register errors)
kubectl logs --namespace contextforge deploy/contextforge --tail=200
```

In the Admin UI, open **MCP Registry** (or equivalent catalog section) and check whether entries from the YAML appear. If nothing shows, try **POST** catalog reload from the [catalog docs](https://ibm.github.io/mcp-context-forge/manage/catalog/) (with an admin JWT) after you confirm the file path.

When you add or change an MCP in LiteLLM, update `mcp-catalog.yml` the same way (keep the two lists aligned).

## Local database export (optional)

`contextforge-db-export.json` in this directory is **gitignored** (`*-db-export.json`). It can hold a full `public` schema dump for inspection or for a placeholder → inject-secrets → import workflow.

Refresh (valid JSON; suppresses kubectl’s “Defaulted container” line on stderr):

```bash
kubectl exec pod/contextforge-postgres-1 --namespace contextforge -- sh -c '
tables=$(psql -U postgres -d contextforge -Atc "SELECT tablename FROM pg_tables WHERE schemaname = '\''public'\'' ORDER BY 1");
echo "{\"database\":\"contextforge\",\"schema\":\"public\",\"tables\":[";
sep=""; for t in $tables; do
  [ -z "$t" ] && continue
  json=$(psql -U postgres -d contextforge -tAc "SELECT coalesce(json_agg(row_to_json(x)), '\''[]'\''::json) FROM public.\"$t\" x")
  cnt=$(psql -U postgres -d contextforge -tAc "SELECT count(*)::text FROM public.\"$t\"")
  printf "%s{\"name\":\"%s\",\"row_count\":%s,\"rows\":%s}" "$sep" "$t" "$cnt" "$json"
  sep=","
done
echo
echo "]}"' 2>/dev/null > contextforge-db-export.json
```

Treat exports as **credential-bearing** (`email_users.password_hash`, `sso_providers.client_secret_encrypted`, `sso_auth_sessions`, etc.). For Git-safe templates, replace those with placeholders and inject real values only in the import step.

## References

- [ContextForge documentation](https://ibm.github.io/mcp-context-forge/)
- [MCP Server Catalog](https://ibm.github.io/mcp-context-forge/manage/catalog/) (`mcp-catalog.yml` format)
- [Upstream repository](https://github.com/IBM/mcp-context-forge)
