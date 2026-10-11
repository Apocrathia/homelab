# Matrix (Synapse + MAS)

Self-hosted Matrix homeserver: Synapse (v1.162.0) with authentication fully delegated to Matrix Authentication Service (MAS, 1.26.0), which upstreams to Authentik OIDC. Tailnet-only in phase 1: no federation, user IDs are `@user:matrix.apocrathia.com`, and the first login JIT-provisions the Matrix account from the Authentik claims.

> **Navigation**: [← Back to Social README](../README.md)

## Access

| Hostname                                 | Serves                                                                                      | Route                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `matrix.apocrathia.com`                  | server_name host: client API, `/.well-known/matrix/client` (MAS discovery block), `/health` | `httproute.yaml` (compat paths split to MAS, rest to Synapse) |
| `matrix.gateway.services.apocrathia.com` | MAS OAuth host: login UI, OIDC endpoints, Authentik callback                                | `httproute.yaml` (dual parentRefs, litellm pattern)           |

## Stack

```
Element X ──> gateway (TLS) ──> synapse:8008 ──> matrix-postgres (CNPG, synapse + mas DBs)
                 │                  ▲  └─ shared-secret ▶
                 └─ login/refresh ──┤
                                    └──> mas:8080 ──> Authentik OIDC (upstream provider)
```

Three pods: `synapse`, `mas`, `matrix-postgres-1`. MAS is stateless (Postgres holds everything). Synapse `/data` is a 10Gi Longhorn PVC (kopia nightly); Postgres holds rooms/accounts in `synapse` + `mas` databases of the hand-rolled CNPG Cluster (`postgres.yaml`).

## SSO flow

1. Client fetches `https://matrix.apocrathia.com/.well-known/matrix/client` → MSC2965 block points at the MAS issuer.
2. Client follows to `matrix.gateway.services.apocrathia.com`, MAS redirects to the Authentik provider (`.../application/o/matrix/`).
3. Authentik returns `preferred_username` / `name` / `email` claims; MAS provisions the account (localpart = authentik username) and issues Matrix tokens.
4. Synapse introspects MAS tokens via its own shared-secret channel — `password_config` and registration stay off; Synapse enforces the SSO-only lockdown at startup.

The `matrix` Authentik application (admins-only binding) is created by the tofu Workspace in `crossplane.yaml`; the module ref is pinned to the current generic-app chart tag.

## Required 1Password item

`vaults/Secrets/items/matrix-secrets` (see `secret.yaml`) with fields:

| Field                | Used for                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `password`           | Postgres `synapse` owner password (CNPG initdb + homeserver DB URI)                                  |
| `mas-db-password`    | Postgres `mas` role password (MAS `database.password_file`)                                          |
| `init-mas.sql`       | `CREATE ROLE mas LOGIN PASSWORD '<mas-db-password>'; CREATE DATABASE mas OWNER mas;` (CNPG postInit) |
| `shared-secret`      | MAS ↔ Synapse API secret (MAS `matrix.secret_file` + Synapse `secret_path`)                         |
| `encryption`         | 32-byte hex (64 chars) for MAS cookie/db field encryption — never change after first start           |
| `rsa-key.pem`        | MAS OIDC RS256 signing key (from `mas-cli config generate`)                                          |
| `oidc-client-secret` | Authentik OAuth2 client secret — copied from Authentik after first workspace sync                    |
| `signing-key`        | Synapse ed25519 signing key (PEM), copied to `/data/matrix.apocrathia.com.signing.key` at boot       |

## Initial setup (operator prep)

1. **1Password item**: create `matrix-secrets` with the fields above. Generate keys once:
   ```bash
   docker run --rm ghcr.io/element-hq/matrix-authentication-service:1.26.0 config generate
   # → take matrix.secret (shared-secret), secrets.encryption (encryption), keys (rsa-key.pem)
   docker run --rm ghcr.io/element-hq/synapse:v1.162.0 generate
   # → take /data/matrix.apocrathia.com.signing.key (signing-key)
   ```
2. **DNS**: add a Cloudflare A record `matrix.apocrathia.com` → tailnet gateway IP (the door clients use; `matrix.gateway.services.apocrathia.com` already resolves via the existing split DNS). The `https-matrix` listeners on both gateways ship in this MR (`03-services/gateway/gateway.yaml` + `03-services/tailscale/tailnet-gateway.yaml`; `certificate.yaml` issues the secret, `referencegrant.yaml` admits the Gateways), so this A record is the only shared-infra step left. The A record is public — it publishes the hostname and the tailnet gateway's IP in public DNS; informational only, the tailnet IP is WAN-unreachable by design.
3. **Apply** and wait: CNPG bootstrap, both HelmReleases, workspace sync (creates the `matrix` Authentik application + OAuth2 provider, client id `matrix`).
4. **Client secret**: copy the OAuth2 client secret from the Authentik UI (`matrix` provider) into the `oidc-client-secret` field, then restart the `mas` deployment.
5. **First login = JIT provision**. Promote yourself:
   ```bash
   kubectl exec -n matrix deployment/mas -c mas -- /usr/local/bin/mas-cli manage promote-admin <localpart>
   ```

## Post-deploy validation

- Pods: `matrix-postgres-1`, `deployment/synapse`, `deployment/mas` all Running (synapse stays in Init:ContainersNotReady until the 1Password item exists — that is the fail-fast signal, not a bug).
- Routes: both `httproute` objects `Accepted=True` on every parentRef that exists.
- Cert: `kubectl get certificate -n matrix matrix-apocrathia-com-tls` → `Ready=True`.
- Workspace: `kubectl get workspace -n matrix matrix-authentik` → `Synced=True`, and the `matrix` application appears in Authentik (admins binding only).
- First SSO login JIT-provisions the account; `mas-cli doctor` reports no issues.

## Limitations

- **Postgres has no barman/kopia backup in this slice** (recipe scope): the CNPG cluster ships no `barmanObjectStore` block and the kopia policy only covers the synapse Longhorn volume. Rooms/accounts live in the cluster PVC only. Add a `backup:` block + `scheduled-backup` (tak pattern) before trusting it with real data.
- No Element Web yet (phase 2): MAS serves it as a downstream OIDC client later; no Authentik wiring needed for it.

## Troubleshooting

```bash
kubectl get pods -n matrix
kubectl logs -n matrix deployment/synapse -f
kubectl logs -n matrix deployment/mas -f
kubectl get cluster -n matrix matrix-postgres
kubectl get httproute -n matrix   # both routes Accepted=True

# rendered config (placeholders must all be substituted)
kubectl exec -n matrix deployment/synapse -c synapse -- cat /data/homeserver.yaml

# MAS self-checks (config validity + upstream wiring)
kubectl exec -n matrix deployment/mas -c mas -- /usr/local/bin/mas-cli doctor
```

## Federation later (phase 2, recipe §5)

Currently tailnet-only: `serve_server_wellknown` omitted, `suppress_key_publication: true`. To federate: add public DNS for `matrix.apocrathia.com`, set `serve_server_wellknown: true` in `config/homeserver.yaml` (remote servers then send federation to the same 443 route), and drop `suppress_key_publication`. Do not change `server_name` after accounts exist — it is baked into every room membership.

## References

- **[Synapse docs](https://element-hq.github.io/synapse/latest/)** - homeserver config reference
- **[MAS docs](https://element-hq.github.io/matrix-authentication-service/)** - config reference + Authentik SSO sample
- **[Element](https://element.io)** - client apps (Element X discovers MAS via the well-known block)
