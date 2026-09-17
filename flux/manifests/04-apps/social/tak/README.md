# OpenTAKServer

OpenTAKServer (OTS) is an open-source TAK server: it serves the Team Awareness Kit ecosystem (ATAK on Android) with Cursor-on-Target (CoT) streaming, mission/data-package sync, and client certificate enrollment. Friends authenticate through Authentik LDAP - ATAK enrolls with their Authentik credentials, OTS's CA signs a client certificate, and all client traffic is mTLS.

> **Navigation**: [← Back to Social README](../README.md)

## Access

- **WebUI**: `https://tak.gateway.services.apocrathia.com` (Authentik proxy, admins + users tier; friends reach it over the tailnet)
- **ATAK (LAN + tailnet)**: same hostname, ports below

| Port | Service                            | TLS terminated by                                    | Notes                                                       |
| ---- | ---------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| 80   | WebUI / SPA                        | Gateway (HTTPS) -> Authentik outpost -> plain HTTP   | `/api` + `/socket.io` bypass Authentik (OTS session tokens) |
| 8088 | CoT streaming (TCP)                | none                                                 | plain ATAK connections                                      |
| 8089 | CoT streaming (SSL)                | OTS CA server cert                                   | ATAK client certificates                                    |
| 8443 | Marti API (missions, datapackages) | OTS CA server cert + client cert verification (mTLS) | `/Marti/api/tls` returns 404 here                           |
| 8446 | Certificate enrollment             | Gateway TLS (Let's Encrypt zone wildcard)            | gateway terminates TLS; nginx proxies only `/Marti/api/tls` |

All five ports are exposed by the `tak` Service; the TCP ports (8088/8089/8443/8446) are routed by `tcproutes.yaml` on **both** `main-gateway` (LAN) and `tailnet-gateway` (tailnet).

## Pod layout

One pod, six containers (trimmed from the upstream compose; MediaMTX skipped day one):

| Container         | Image                                 | Role                                                                                        |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `tak-api`         | ghcr.io/brian7704/opentakserver       | Flask app on loopback :8081 (pod-internal only); writes the CA, signs certs, serves the API |
| `cot-parser`      | ghcr.io/brian7704/ots_cot_parser      | consumes CoT from RabbitMQ into Postgres                                                    |
| `eud-handler`     | ghcr.io/brian7704/ots_eud_handler     | TCP CoT streaming :8088                                                                     |
| `eud-handler-ssl` | ghcr.io/brian7704/ots_eud_handler_ssl | SSL CoT streaming :8089                                                                     |
| `webui`           | ghcr.io/brian7704/opentakserver-ui    | nginx + SPA; serves :80, :8443, :8446 (vhosts from `config/nginx/`)                         |
| `rabbitmq`        | rabbitmq                              | CoT fan-out, guest/guest on loopback only, ephemeral                                        |

The OTS containers share `/app/ots` on one Longhorn PVC (`tak-data`): CA, issued client certs, config.yml, uploads, datapackages. The webui mounts it read-only for the CA. **Losing this volume breaks every enrolled client** - it is backed up nightly (kopiur, nas-rustfs).

Postgres is a standalone CNPG Cluster (`tak-postgres`, `postgres.yaml`) on the postgis image; CNPG's managed extensions don't cover postgis, so `postInitApplicationSQL` creates it (bootstrap-time only, at cluster creation).

## Authentication

- **WebUI**: Authentik proxy (admins + users bindings). The SPA's own login then hits the OTS API with LDAP credentials.
- **ATAK enrollment**: ATAK posts Authentik username/password to `:8446/Marti/api/tls`; OTS checks them against the dedicated LDAP outpost (`tak-ldap-outpost`, deployed in this namespace by `authentik-blueprint.yaml`) and signs the client CSR with the OTS CA. Enrolled clients then use the certificate on :8089/:8443.
- **LDAP access control**: the provider's application (`tak-ldap`) carries admins + users group bindings - that is what gates who may bind/search (the LDAP provider lost its `search_group` field in newer authentik; the outpost checks application access, verified against 2026.8.2 source).
- **LDAP bind mode**: direct bind for authentication - users bind with their own Authentik username/password as `cn=<username>,ou=users,<base_dn>` (flask-ldap3-login direct-bind path), and their groups are read over their own bound connection at login. OTS's runtime group lookups (`/api/groups/all`, fired on every page) open a separate connection bound as the `tak-ldap-bind` service account, which the blueprint creates without a password (operator sets it). Known limitation: those runtime lookups search groups with `member=<username>`, but authentik stores full DNs in `member` - the webui group dropdowns therefore stay empty in LDAP mode even with the bind user configured; login-time role assignment (channels, `tak_admin`) is unaffected.
- **Channel groups**: create Authentik groups per channel trio: `tak_<name>`, `tak_<name>_read`, `tak_<name>_write`. Membership in `tak_<name>` maps to that ATAK channel role; `tak_admin` grants the OTS administrator role.

## Required 1Password item

`vaults/Secrets/items/opentakserver-secrets` with fields:

| Field                    | Used for                                               |
| ------------------------ | ------------------------------------------------------ |
| `username`               | Postgres owner + CNPG initdb - set to `tak`            |
| `password`               | Postgres password (CNPG initdb + config.yml DB URI)    |
| `secret-key`             | Flask SECRET_KEY                                       |
| `security-password-salt` | Flask-Security-Too password salt                       |
| `ca-password`            | OTS CA private key password                            |
| `ldap-bind-password`     | Password of the `tak-ldap-bind` authentik service user |

Fields `database-url`, `rabbitmq-username`, `rabbitmq-password`, and `mediamtx-token` are unused leftovers from an earlier attempt and can be deleted.

The pod stays pending until the item exists (OnePasswordItem). LDAP + the database URI are rendered into `/app/ots/config.yml` by the `render-config` init container on every boot - upstream OTS has no env-var support for LDAP settings.

## Post-deploy operator steps

1. **LDAP bind user password**: the blueprint creates `tak-ldap-bind` (service account, `users` group). Set its password in the Authentik UI (Directory -> Users -> tak-ldap-bind) to the `ldap-bind-password` value from 1Password, then restart the tak deployment. Until then every WebUI page shows "failed to get group list" - runtime group lookups bind as this user; login itself is direct bind and works regardless.
2. **Tailnet policy**: apply the policy change shipped with this MR (`terraform/deployments/tailscale/tailnet/policy.hujson` - `terragrunt apply`). Until applied, tailnet CoT is blocked by the deny-by-default policy.
3. **Channel groups**: create the `tak_<name>` / `_read` / `_write` trios in Authentik for each channel you want, and add friends (and yourself, in `tak_admin`, for the OTS administrator role) to the relevant groups. Users authenticate against LDAP with their own Authentik credentials.
4. **ATAK enrollment**: add the server in ATAK as `tak.gateway.services.apocrathia.com` with the ports above, then enroll the client certificate. Enrollment goes through gateway-terminated TLS on :8446 (the Let's Encrypt zone wildcard), so iOS/iTAK clients have no certificate prompt. SSL CoT on :8089 and the mTLS Marti API on :8443 still present the OTS CA server cert (hardcoded CN=`opentakserver`, no SAN) - installed TAK clients match against the enrolled truststore and do not enforce hostname, but plain web clients will warn there.

## First boot

The webui container crash-loops until `tak-api` has written the CA (`/app/ots/ca`) - nginx cannot bind its 8443/8446 TLS listeners without the certificates. This self-heals within a few restarts once the CA exists. gatus will show the app down until then.

## Troubleshooting

```bash
# Pod + container status (webui crash-looping on first boot is expected)
kubectl get pods -n tak
kubectl logs -n tak deployment/tak -c tak-api -f

# Rendered config (placeholders must all be substituted)
kubectl exec -n tak deployment/tak -c tak-api -- cat /app/ots/config.yml

# LDAP outpost (ports 3389/6636 are locked to this namespace)
kubectl get pods -n tak -l goauthentik.io/outpost-type=ldap

# Postgres (postgis extension present after bootstrap)
kubectl get cluster -n tak tak-postgres

# TCPRoute attachment on both gateways
kubectl get tcproute -n tak
```

## Limitations

- **MediaMTX skipped** day one (`OTS_MEDIAMTX_ENABLE=False`); video streaming can be added later.
- **UDP day one**: no UDPRoute (experimental CRDs arrive with the bootstrap CRD swap); MQTT-over-tailnet and Mumble integration are future work.
- **RabbitMQ is ephemeral** (upstream parity): queued CoT messages are lost on pod restart (upstream TTL is 1 day anyway).
- **Postgres 15**: CNPG's official postgis companion image is stale at 15-3.3; OTS has no newer-PG needs.

## References

- **[OpenTAKServer](https://github.com/brian7704/OpenTAKServer)** - server source
- **[OpenTAKServer-Docker](https://github.com/brian7704/OpenTAKServer-Docker)** - upstream compose this deployment mirrors
- **[OpenTAKServer docs](https://docs.opentakserver.io)** - official docs (LDAP docs are an empty stub; this README and the upstream sources above are the grounding)
- **[ATAK](https://tak.gov/products/atak-android)** - the client app
