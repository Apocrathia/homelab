---
title: "MISP + OpenCTI deployment scoping"
kind: assessment
status: complete
found_at: 2026-10-10
area: security
---

# MISP + OpenCTI on the homelab — design scoping doc

> Research note (October 2026). Deployment scoping for MISP (threat
> sharing) and OpenCTI (threat intelligence) on the homelab: chart choices,
> storage/secrets foundation, SSO, integration, risks, and a slice plan.
> Promoted from `.scratch/misp-opencti-design.md` into the ledger on
> 2026-10-10 when the operator approved the deployment. Follow-ups are
> landing as issues `docs/issues/misp-deployment.md` and
> `docs/issues/opencti-deployment.md`.

**Promotion corrections (2026-10-10, slice 1):** the scratch version named
the MariaDB backup bucket `opencti-mariadb-backups` — wrong owner; MariaDB
runs under MISP and slice 8's dump CronJob is the consumer — corrected to
`misp-mariadb-backups` throughout this copy. No other content changes.

Every load-bearing claim carries a source URL. `[verified]` = read from primary source
(upstream docs/repo/compose/Dockerfile) or read-only live cluster query. `[inference]` =
my reasoning on top of verified facts; flagged where a smoke test is needed.

---

## 1. MISP on Kubernetes

### 1.1 Current version and licensing

- MISP core is on the 2.5.x line; the official docker packaging pins `CORE_TAG=v2.5.48`
  and `MODULES_TAG=v3.0.10` in its current `template.env` [verified —
  https://github.com/MISP/misp-docker/blob/master/template.env].
- MISP (core) is AGPL-3.0 licensed software [verified — GitHub license API on
  https://github.com/MISP/MISP].
  The official misp-docker repository is GPL-3.0 [verified — GitHub API license field,
  https://github.com/MISP/misp-docker].

### 1.2 Containerization options

| Option                                     | What it is                                                                                                                                                                       | Maintenance                                                                                                                                                      | License                                                               | Verdict                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| **MISP/misp-docker** (official images)     | `misp-core` + `misp-modules` images on GHCR (`ghcr.io/misp/misp-docker/misp-core`), plus optional `misp-guard` and a separate `misp-nginx` image; docker-compose reference stack | Active — repo pushed 2026-10-09; images "pushed regularly" [verified — https://github.com/MISP/misp-docker]                                                      | GPL-3.0                                                               | **Best base** for any k8s path                  |
| **cmu-sei/misp-helm**                      | Community Helm chart (SEI Carnegie Mellon team) deploying official misp-core images + bitnami MariaDB 19.0.5 + official valkey chart 0.9.4 + ntppool smtp 2.4.0 as subcharts     | Active — chart 5.0.1, appVersion 2.5.44; commits Aug 2026 incl. Gateway API HTTPRoute support added 2026-08-25 [verified — https://github.com/cmu-sei/misp-helm] | "Apache v2-style" per LICENSE.txt header (GitHub reports NOASSERTION) | **Best chart**                                  |
| **NUKIB/misp**                             | Single immutable image (update = new image pull, no in-container update) + NUKIB misp-modules image; compose includes MariaDB + Redis                                            | Active — pushed 2026-09-14 [verified — https://github.com/NUKIB/misp]                                                                                            | (image repo, AGPL source)                                             | Viable fallback; simpler but less chart support |
| DCSO MISP-dockerized                       | Old multi-container "dockerized" family                                                                                                                                          | Dead — last push 2020-05 [verified — https://github.com/DCSO/MISP-dockerized]                                                                                    | —                                                                     | Skip                                            |
| pburgisser/misp-helm-chart                 | Solo chart from the "MISP at scale on k8s" writeup                                                                                                                               | Stale — last push 2022-11 [verified — https://github.com/pburgisser/misp-helm-chart]                                                                             | —                                                                     | Skip                                            |
| MISP/misp-docker issue #112 ("Helm Chart") | The chart conversation that produced cmu-sei/misp-helm                                                                                                                           | Closed 2024; SEI maintainer (maheckathorn) said they run it internally [verified — https://github.com/MISP/misp-docker/issues/112]                               | —                                                                     | Confirms cmu-sei lineage                        |

Chart distribution note: cmu-sei/misp-helm has **no gh-pages/index.yaml and no published
helm repo** (branches: `main` only) [verified — GitHub branches API]. Flux consumption
would be `chart: ./` style via a GitRepository pointing at the repo tree (same pattern
the homelab already uses for the in-repo generic-app chart), or a vendored copy. The chart
is NOT on ArtifactHub as a publisher; Renovate would track it via the
`datasource=git-tags` annotation like generic-app does.

Chart defaults that need overrides for this homelab [verified —
https://github.com/cmu-sei/misp-helm/blob/main/values.yaml]:

- `image.tag: latest` → pin a version tag + digest (house style; renovate annotation
  `datasource=docker depName=ghcr.io/misp/misp-docker/misp-core`).
- `ingress` (nginx) default → disable; use the chart's `httproute` block (Gateway API
  only in this cluster).
- `pvc.attachments` default 1Gi → Longhorn, larger (10–20Gi).
- MariaDB subchart: single instance, auth from values/secret; set storageClass longhorn.

### 1.3 Database: MariaDB vs PostgreSQL — the load-bearing verdict

- MISP's own sizing doc states: "The main database of MISP relies on MariaDB" [verified —
  https://www.misp-project.org/sizing-your-misp-instance/]. The official docker-compose
  runs `mariadb:10.11` [verified —
  https://github.com/MISP/misp-docker/blob/master/docker-compose.yml].
- **NEW (2026-09-17, MISP 2.5.47): PostgreSQL is now a fresh-install option.** A
  ledger-based migration system added PostgreSQL support: "MISP can now be installed on
  PostgreSQL as an alternative to MySQL/MariaDB. This is a fresh-install path … verified
  against PostgreSQL 16 … It has not seen performance work at scale yet and CI does not
  run the full test suite against it, so treat it as early support. The On Demand
  correlation engine and the search benchmark remain MySQL-only." [verified —
  https://www.misp-project.org/2026/09/17/misp.2.5.47.released.html/ and
  https://github.com/MISP/MISP/blob/2.5/docs/CONFIG.postgresql.md (PG 13+, developed and
  verified against 16; Default correlation engine used on PG)].
- **BUT the official misp-core image cannot use it**: the misp-docker Dockerfile installs
  only `php${PHP_PACKAGE_VERSION}-mysql` (no php-pgsql) and deletes everything in
  `/var/www/MISP/INSTALL/*` except `MYSQL.sql` — the PostgreSQL baseline
  `INSTALL/POSTGRESQL.sql` does not exist in the image [verified —
  https://github.com/MISP/misp-docker/blob/master/core/Dockerfile]. Running MISP on
  CNPG would therefore require a **custom-built image fork** maintained by us on top of
  an upstream-declared "early support" database path.

**Verdict: MariaDB in-cluster (bitnami subchart via cmu-sei/misp-helm) is the only
pragmatic path.** The CNPG cluster cannot host MISP's DB without accepting a custom image
fork + early-support Postgres + MySQL-only correlation features. Recommend against.

### 1.4 Components (what else MISP needs) [verified — misp-docker docker-compose.yml]

- **Redis/Valkey**: required (cache, feed caching, background jobs). Official compose uses
  `valkey/valkey:7.2` with optional password and snapshotting disabled by default.
- **Workers**: run inside the misp-core container under supervisord —
  `NUM_WORKERS_DEFAULT/PRIO/EMAIL/UPDATE/CACHE` env vars, defaults 5/5/5/1/5. No separate
  worker Deployment needed. Single misp-core replica is a fine homelab shape.
- **Cron**: scheduled tasks (pull/push/update) run inside the container via its own
  cron. No k8s CronJob needed [verified — README: "Scheduled tasks run updates, pushes,
  and pulls"].
- **misp-modules**: separate container (enrichment/import/export modules), optional but
  recommended. cmu-sei chart deploys it.
- **SMTP**: compose uses `ghcr.io/egos-tech/smtp` (Exim relay); cmu-sei uses the
  ntppool `smtp` subchart. Point at the existing homelab mail relay [inference — repo
  has mail relay conventions; confirm at implementation].
- **Mail/PGP/S/MIME**: MISP features; not deployment blockers.

### 1.5 Sizing (homelab shape)

From MISP's sizing doc [verified — https://www.misp-project.org/sizing-your-misp-instance/]:

- "a web server with 2+ cores and 8-16 GB of memory should be plenty"
- "16GB memory and 2 vcpus are quite common for smaller sharing hubs"
- the COVID community instance ran 8GB/4 vcpu for 1000+ users; training instances on
  2GB/1vcpu
- feed caching can use up to ~1.2GB RAM if all default feeds enabled; SSDs recommended
  for MariaDB.

Single-instance proposal (homelab):

- misp-core: 1 replica, requests ~500m/2Gi, limits 1–2 CPU/4Gi
- misp-modules: requests 100m/256Mi
- MariaDB: 1 replica, `innodb_buffer_pool_size` ~1–2Gi, 10Gi Longhorn PVC
- valkey: 128–256Mi, no persistence needed (cache only) — small PVC if desired
- attachments PVC: 10–20Gi Longhorn (default feeds + sample uploads small; attachments
  grow with use)

### 1.6 SSO: MISP OIDC for authentik — mechanism verified

- MISP ships a core plugin `OidcAuth` (2.5 branch):
  `app/Plugin/OidcAuth/README.md` [verified —
  https://github.com/MISP/MISP/blob/2.5/app/Plugin/OidcAuth/README.md]. It uses the
  `certmichelin/openid-connect-php` library, is set via `Security.auth = OidcAuth.Oidc`,
  and supports:
  - provider_url/issuer, client_id/secret
  - `role_mapper`: maps IdP roles/claims to MISP role IDs (e.g. `"misp-admin" => 1`)
  - `mixedAuth` (optional MISP-local logins remain)
  - PKCE (`code_challenge_method`), `disable_request_object`, `disable_pushed_authorization_request`
  - known caveat: users blocked at the IdP are NOT blocked in MISP (keys still work) →
    set `offline_access` + `check_user_validity` ~300s (docs recommend this).
    [review correction, 2026-10-10 (slice 3): this hardening is NOT wired on this
    image — the chart envs `OIDC_OFFLINE_ACCESS` / `OIDC_CHECK_USER_VALIDITY` render
    but nothing in misp-docker v2.5.44 consumes them; blocked users keep working
    keys until disabled in MISP. Actual behavior documented in the MISP README.]
- The official misp-docker image exposes this via env vars — no file editing:
  `OIDC_ENABLE, OIDC_PROVIDER_URL, OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET,
OIDC_ROLES_PROPERTY="roles", OIDC_ROLES_MAPPING={"admin":1}, OIDC_AUTH_METHOD
(client_secret_post), OIDC_SCOPES, OIDC_LOGOUT_URL, OIDC_ALLOW_EMAIL_LINKING,
OIDC_REQUIRE_EMAIL_VERIFIED` [verified —
  https://github.com/MISP/misp-docker/blob/master/template.env]. The cmu-sei chart
  mirrors these (`oidcEnable, oidcProviderUrl, oidcRolesMapping, oidcCodeChallengeMethod
S256, oidcCheckUserValidity 600` default etc.) [verified — chart values.yaml].
  [review correction, 2026-10-10 (slice 3): the chart renders
  `OIDC_AUTHENTICATION_METHOD` but the image reads `OIDC_AUTH_METHOD` — name
  mismatch, cosmetic; the image default (`client_secret_post`) is already correct.]
- **authentik integration steps** (native OIDC, not proxy mode):
  1. authentik: create an OAuth2/OIDC provider for MISP (redirect URI
     `https://<misp-host>/users/login` — final path to confirm during implementation;
     the plugin callback handling is inside MISP's `/users/login` flow [inference from
     plugin README flow; exact callback documented during lap]).
  2. Add a property mapping for the `roles` claim (e.g. admins group → `misp-admin`).
  3. MISP chart env: OIDC_ENABLE=true, provider URL = authentik discovery endpoint,
     client id/secret from 1Password-backed secret, OIDC_ROLES_MAPPING
     `{"misp-admin": 1, "misp-user": 3}`.
  4. Authentik app tile via the house per-app blueprint/terraform pattern, admins
     binding via the `admins` group.
- Maturity assessment: the plugin is part of MISP core (not a third-party plugin) and is
  the documented path in the official image; it has real-world usage but the README
  itself calls out edge caveats (blocked users, email linking) [verified — plugin README
  "Caveats"]. For a single-admin homelab, low risk.

---

## 2. OpenCTI on Kubernetes

### 2.1 Current version and cadence

- OpenCTI releases moved to date-based versioning in 2026: e.g. `7.261008.0` (published
  2026-10-09) with separate LTS lines (`7.260309.0-lts.8`, `7.260811.0-lts.1`) [verified —
  https://github.com/OpenCTI-Platform/opencti/releases]. Releases are near-daily; updates
  must be deliberate (pin chart, upgrade on purpose).
- Licensing: OpenCTI Community Edition is Apache-2.0; Enterprise Edition features are
  under a separate commercial license [verified —
  https://github.com/OpenCTI-Platform/opencti/blob/master/LICENSE]. Everything this
  design needs (OIDC, TAXII, connectors, feeds) is Community Edition.

### 2.2 Component stack — and a correction to the brief

**OpenCTI does NOT use PostgreSQL.** The parent brief asked "can the CNPG Postgres
cluster host its DB" — it cannot; there is no Postgres in OpenCTI's architecture.

Evidence (all current master):

- The documented dependency table lists: Elasticsearch/OpenSearch, Redis, RabbitMQ,
  S3/Silo/MinIO — no Postgres [verified —
  https://github.com/OpenCTI-Platform/opencti/blob/master/docs/docs/deployment/overview.md,
  "Infrastructure requirements" table].
- The platform default config has sections `redis/elasticsearch/minio/rabbitmq` — no
  `postgres` section [verified —
  https://github.com/OpenCTI-Platform/opencti/blob/master/opencti-platform/opencti-graphql/config/default.json].
- The official docker stack has no Postgres service for OpenCTI; the only Postgres
  (`pgvector/pgvector:pg17`) belongs to the optional XTM One component [verified —
  https://github.com/OpenCTI-Platform/docker/blob/master/docker-compose.yml].
- OpenCTI's primary data store is the Elasticsearch/OpenSearch index layer + S3 for files.

**CNPG fit verdict: OpenCTI consumes zero Postgres.** CNPG stays available for MISP only
if we ever take the custom-image path — and even then, not recommended (see 1.3).

### 2.3 Stack requirements [verified unless marked]

From the official dependency table (docs overview.md, master):

| Component                  | Version floor      | Reference sizing (docs)            | Homelab note                                                                                                                                            |
| -------------------------- | ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Elasticsearch / OpenSearch | ES ≥ 8.0, OS ≥ 2.9 | 2 cores, ≥8GB RAM, SSD, ≥16GB disk | The big one; tune down for homelab                                                                                                                      |
| Redis                      | ≥ 7.1              | 1 core, ≥1GB RAM, SSD, ≥16GB       | default stream retention ≈ 2M events ≈ ~8GB RAM possible; `redis.trimming` tunable [verified — installation docs "Additional memory information"]       |
| RabbitMQ                   | ≥ 3.11             | 1 core, ≥512MB, ≥2GB disk          | needs `max_message_size=536870912`, `consumer_timeout=86400000` (24h) [verified — https://github.com/OpenCTI-Platform/docker/blob/master/rabbitmq.conf] |
| S3 / Silo / MinIO          | ≥ RELEASE.2023-02  | 1 core, ≥128MB                     | use existing NAS rustfs (see 2.6)                                                                                                                       |
| OpenCTI platform           | —                  | 2 cores, ≥8GB RAM, stateless       | Node.js; `NODE_OPTIONS=--max-old-space-size=8096` default (8GB heap) — tune down                                                                        |
| Worker                     | —                  | 1 core, ≥128MB                     | ≥1 worker; 1 platform : 3 workers guidance                                                                                                              |

Current official docker stack images (for version anchoring): `redis:8.10.1`,
`docker.elastic.co/elasticsearch/elasticsearch:8.19.21`, `rabbitmq:4.3-management`,
`pgsty/silo:latest` (Silo is the community-maintained MinIO fork Filigran now ships in
the default stack) [verified — OpenCTI-Platform/docker docker-compose.yml].

License note: Elasticsearch is SSPL (non-FOSS); **OpenSearch is Apache-2.0** — recommend
OpenSearch as the engine for this homelab [inference from licensing; OpenCTI supports
both via `ELASTICSEARCH__ENGINE_SELECTOR`].

### 2.4 Helm chart options

- **There is no official Filigran helm chart.** The official installation docs point at
  the community chart as the helm path: "OpenCTI Helm Charts for Kubernetes …
  basic installation and examples" → https://github.com/devops-ia/helm-opencti
  [verified — https://docs.opencti.io/latest/deployment/installation/ → "Helm Charts"].
- **devops-ia/helm-opencti** [verified — https://github.com/devops-ia/helm-opencti and
  https://artifacthub.io/packages/helm/helm-opencti/opencti]:
  - chart 3.0.18 / appVersion 7.261008.0 — tracks upstream releases same-day (commit
    "new release: 7.261008.0" on 2026-10-09) [verified — commits API]
  - ArtifactHub **verified publisher**; repo index https://devops-ia.github.io/helm-opencti/
    → standard Flux HelmRepository, Renovate `datasource=helm` works
  - subcharts (all optional, condition-gated): ECK stack 0.20.0, **opensearch 3.9.0
    (official chart)**, **rustfs 1.0.1 (charts.rustfs.com — rustfs is literally a chart
    dependency option)**, bitnami rabbitmq 16.0.13, dragonfly (redis alias)
  - Gateway API support: `gateway.enabled/create/parentRefs` — can attach HTTPRoute to
    the existing `main-gateway` via parentRefs, house pattern compatible
  - first-class `connectors` + `connectorsGlobal` values (env, envFromSecrets for
    1Password-backed keys), built-in `worker` Deployment, and a ready-made
    `connector-misp.yaml` example [verified —
    https://github.com/devops-ia/helm-opencti/blob/main/charts/opencti/connector-examples/connector-misp.yaml]
  - chart default env: `MINIO__ENDPOINT: <release>-rustfs-svc`, `ELASTICSEARCH__URL`,
    `RABBITMQ__HOSTNAME`, `NODE_OPTIONS: --max-old-space-size=8096`, provider config
    via `PROVIDERS__*` env [verified — chart values.yaml]
- **opensearch subchart knobs that matter for this cluster** [verified —
  https://github.com/opensearch-project/helm-charts/blob/main/charts/opensearch/values.yaml]:
  - `singleNode: true` + `opensearchJavaOpts` (chart default in devops-ia: `-Xmx512M
-Xms512M` — too low for real use; set 3–4Gi heap for homelab)
  - persistence toggle → Longhorn PVC
  - `vm.max_map_count` handling: pod-level `sysctl.enabled` (namespaced) and
    `sysctlInit.enabled` (privileged busybox initContainer) both default **false** →
    either enable one, or set it host-side on Talos (machine config patch in `talos/**`,
    a protected path — operator decision). See Risks.
- Kubernetes-specific gotcha: the docs' docker path requires `vm.max_map_count` for
  Elasticsearch; OpenSearch has the same requirement [verified — installation docs
  warning + opensearch chart values]. The devops-ia chart does NOT set the sysctl for
  you by default [inference from subchart defaults].

### 2.5 OIDC / SSO for authentik — mechanism verified

- OpenCTI supports OpenID Connect natively via the `OpenIDConnectStrategy` (Node OpenID
  Client), configured by env vars:
  `PROVIDERS__OPENID__STRATEGY=OpenIDConnectStrategy`,
  `PROVIDERS__OPENID__CONFIG__ISSUER`, `__CLIENT_ID`, `__CLIENT_SECRET`,
  `__REDIRECT_URIS=[\"https://opencti.../auth/oic/callback\"]`, `__LABEL` ("Login with
  Authentik"), optional `LOGOUT_REMOTE`, plus **groups mapping**
  (`GROUPS_MANAGEMENT__GROUPS_SCOPE/PATHS/MAPPING`, claims from access_token by default,
  `TOKEN_REFERENCE=id_token` or `READ_USERINFO=true` as alternates)
  [review correction, 2026-10-10 (slice 5): the groups-path env key is
  `GROUPS_MANAGEMENT__GROUPS_PATH` — singular `PATH`, not the `PATHS` shorthand
  above; the deployed helmrelease uses the correct key] [verified —
  https://github.com/OpenCTI-Platform/opencti/blob/master/docs/docs/deployment/authentication.md
  (also https://docs.opencti.io/latest/deployment/authentication/)].
- Custom CA trust if the IdP cert is internal: `NODE_EXTRA_CA_CERTS` env [verified —
  same doc].
- authentik steps: OAuth2/OIDC provider with redirect
  `https://<opencti-host>/auth/oic/callback`; groups claim from authentik groups
  (e.g. `admins`); `groups_mapping: ["admins:<OpenCTI admin group>"]`; first login
  creates the user; local strategy can stay enabled as break-glass.
- Websockets: OpenCTI UI uses websockets; Cilium Gateway/HTTPRoute must pass
  upgrade headers (the docs give an nginx example; our gateway is Cilium — normal
  HTTP proxy behavior, verify during lap) [verified — installation docs "Deploy behind a
  reverse proxy"].

### 2.6 S3: can rustfs serve it?

- OpenCTI's file storage is S3-API driven (`minio` config: endpoint, port, use_ssl,
  access/secret keys, bucket_name default `opencti-bucket`) [verified —
  config/default.json]. The devops-ia chart even ships rustfs as an optional in-cluster
  subchart [verified — chart deps].
- Plan: disable the chart's rustfs subchart; point `MINIO__ENDPOINT` at the existing
  NAS rustfs (`storage.services.apocrathia.com:9009`), create a dedicated
  `opencti-files` bucket + scoped credentials per the house rustfs docs
  (docs/infrastructure/rustfs-bucket-user-creation.md) [verified house procedure].
- **[inference / needs smoke test]** rustfs is S3-compatible (verified for kopia and
  other consumers per repo docs), and Silo/MinIO is OpenCTI's default; OpenCTI's S3
  client usage (bucket + object CRUD) is expected to work on rustfs. Two things to smoke
  test on lap: bucket creation (pre-create per house docs if the platform doesn't) and
  multipart upload of imported files.

### 2.7 CNPG verdict summary (for task 2's question)

- db-per-app vs shared: **moot for OpenCTI** — no Postgres at all.
- For MISP: shared CNPG not viable with the official image (1.3).

---

## 3. Integration

### 3.1 MISP → OpenCTI connector (official, verified)

- The OpenCTI-Platform/connectors repo ships `external-import/misp` — status "Filigran
  Verified" [verified —
  https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/misp].
- Mechanism: pulls MISP events/attributes over the **MISP REST API** (PyMisp) using a
  MISP auth key with read permission; converts to STIX 2.1; config is env-only
  (`MISP_URL, MISP_KEY, MISP_SSL_VERIFY, MISP_CREATE_REPORTS/INDICATORS/OBSERVABLES,
MISP_IMPORT_DISTRIBUTION_LEVELS, MISP_IMPORT_THREAT_LEVELS, MISP_IMPORT_ONLY_PUBLISHED,
MISP_THREAT_LEVEL_SCORE_MAPPING`, poll interval `CONNECTOR_DURATION_PERIOD=PT5M`)
  [verified — connector README].
- **Not bundled**: it's a separate container you deploy alongside the platform; the
  devops-ia chart has a first-class example manifest (connector-misp.yaml) and a
  generic `connectors:` values structure with `envFromSecrets` so the MISP auth key can
  come from a 1Password-backed secret. Config effort: **low** (env vars + one API key
  minted in MISP + network path between namespaces).
- Direction: one-way MISP→OpenCTI. (A reverse "push OpenCTI data to MISP" is not part of
  this scope; OpenCTI→MISP pushing exists via export connectors but out of scope.)

### 3.2 MISP TAXII/feeds

- MISP has **no built-in TAXII server**; separate `MISP-Taxii-Server` (OpenTAXII config)
  exists for TAXII 1.1 exposure, and MISP can also push to external TAXII 2.1 servers
  [verified — https://github.com/misp/MISP-Taxii-Server,
  https://www.misp-project.org/2023/04/29/misp.how.to.push.to.a.taxii.server.html/].
- MISP's native sharing mechanisms (HTTP feeds with manifest.json, sync servers) are
  consumed by the OpenCTI MISP connector directly — no TAXII needed in this design.

### 3.3 OpenCTI export surface (for downstream consumers)

- OpenCTI embeds a **TAXII 2.1 API** endpoint ("OpenCTI has an embedded TAXII API
  endpoint which provides valid STIX 2.1 bundles", token auth, pagination) [verified —
  https://github.com/OpenCTI-Platform/opencti/blob/master/docs/docs/usage/feeds.md].
- Also: **live streams** (STIX 2.1 bundles, create/update/delete, can be public,
  dependency resolution) and **CSV feeds** (URL, rolling interval) — all filterable
  with access control [verified — same doc].

### 3.4 Tenzir funnel (sibling SIEM lane) — mechanism fit

- Tenzir's old STIX distribution layer (tenzir/threatbus, which had MISP + OpenCTI
  plugins) is **archived** (last push 2023-03) [verified —
  https://github.com/tenzir/threatbus]. I found **no native TAXII connector in the
  current Tenzir platform** in public docs/package catalog searches [inference from
  search — not exhaustively verified; sibling lane should confirm on their side].
- Given the sibling's intake menu (syslog→LB, HEC, from_kafka, rustfs file-drop +
  from_s3, from_http API pull, OTLP), the realistic intake row is:
  1. **`from_http` against an OpenCTI TAXII 2.1 collection or public live-stream URL**
     (STIX 2.1 JSON over HTTP — plain API pull; pagination + auth handled by the
     pipeline/package), or
  2. **rustfs file-drop / from_s3**: OpenCTI (or MISP) scheduled STIX exports into a
     bucket the sibling's node watches.
- Either way the sibling lane owns the **"intake row + OCSF mapping package"** (their
  funnel convention per the parent brief). Integration dependency, noted, not designed
  here.

### 3.5 End-to-end chain (proposed)

```
MISP ──(OpenCTI MISP connector, REST+authkey)──▶ OpenCTI ──(TAXII 2.1 collection or
live stream via from_http / or STIX export file-drop to rustfs)──▶ Tenzir funnel
(OCSF mapping package owned by sibling lane)
```

---

## 4. Risks

1. **Chart maintenance concentration (medium).** Both charts are small-team community
   charts: cmu-sei/misp-helm (SEI research org backing, 4 maintainers, but SEI's own
   README notes their open-sourcing process is slow; chart appVersion lags MISP by a few
   releases — chart at 2.5.44 vs MISP 2.5.48 [verified]) and devops-ia/helm-opencti
   (1-2 maintainers, daily releases, ArtifactHub verified publisher). Mitigation: pin
   chart versions; charts are plain YAML — forking is cheap if abandoned.
2. **Image tag defaults vs house digest pinning (low, but do it).** cmu-sei chart
   defaults `image.tag: latest` [verified — values.yaml]; house style pins digests with
   renovate annotations. Renovate coverage differs: devops-ia chart has a proper helm
   index (Renovate-friendly); cmu-sei chart is consumed via GitRepository tags
   (git-tags datasource — same pattern as the in-repo generic-app chart) [verified — no
   published index for cmu-sei].
3. **OpenSearch memory footprint (high impact, mitigated by cluster size).** Docs
   reference sizing is ≥8GB for the search engine alone [verified — overview.md]. Live
   read-only cluster check: 4 nodes × 16 vCPU / ~64Gi each; memory usage 31–60%, CPU
   usage 71–83% at research time [verified — `kubectl top nodes`, 2026-10-10]. OpenSearch
   single-node with 3–4Gi heap fits comfortably in memory terms; **CPU is the tighter
   resource** — set requests low (250–500m) and monitor. Platform 8GB Node heap default
   should be tuned down (~3–4Gi) for homelab scale [inference].
4. **`vm.max_map_count` / Talos node config (decision needed).** OpenSearch needs
   `vm.max_map_count=262144` [verified — OpenCTI installation docs + opensearch chart].
   Three options: (a) Talos machine config patch — touches `talos/**`, a protected
   path; (b) enable the opensearch chart's privileged `sysctlInit` initContainer
   [verified — chart values]; (c) namespaced `sysctl.enabled` via kubelet safe-sysctl
   allowlist. Cleanest for the lab is (a) or (b); needs an operator call.
5. **MariaDB operational burden (medium).** No MySQL operator in the cluster [verified —
   repo has only CNPG for databases]. The bitnami MariaDB subchart gives us: single
   instance on Longhorn, chart-managed upgrades (major versions can require
   dump/restore), and no WAL-level backup story like CNPG's. Mitigation: mysqldump
   CronJob → rustfs bucket (kopia-style) + test a restore once; keep MariaDB minor
   pinned; Renovate PRs reviewed manually. Postgres-on-CNPG alternative requires a
   custom MISP image + upstream-early-support path (see 1.3) — higher risk than
   bitnami MariaDB.
6. **Backup story (medium).** Existing patterns: kopia ClusterRepository on rustfs for
   PVCs [verified — flux/manifests/03-services/backup/clusterrepository.yaml], CNPG
   native backups (not applicable here — see 1.3/2.2). Proposal: namespace labels for
   kopia coverage of Longhorn PVCs (attachments, MariaDB, OpenSearch) + DB-native dump
   CronJob for MariaDB (dump into rustfs) + OpenCTI file storage already on rustfs
   (S3 is its own durability domain) + optional OpenSearch snapshots repo. Accept that
   restoring OpenCTI means PVC restore + index rebuild; document RPO honestly.
7. **Update strategy (medium).** OpenCTI releases daily (date-based) with LTS lines
   [verified — releases page]. Recommend: pin to the chart version, ride the chart's
   appVersion bumps deliberately (monthly-ish), consider the LTS app lines; MISP 2.5.x
   moves slower. Renovate drafts MRs; Trivy/gitleaks/semgrep gate as usual.
8. **SSO edge cases (low).** MISP OidcAuth caveats (blocked IdP users keep working
   auth keys → enable `offline_access` + `check_user_validity 300`) [verified —
   plugin README; review correction 2026-10-10 (slice 3): the enable-side chart
   envs are inert on misp-docker v2.5.44 — see the §1.6 correction; manual MISP
   user disable is the working mitigation]; OpenCTI first OIDC login creates users — protect with authentik group
   gate before enabling. Both apps keep local break-glass accounts.
9. **rustfs S3 compatibility for OpenCTI (needs one smoke test).** See 2.6 — expected
   fine; verify bucket bootstrap + multipart on lap 1.

---

## 5. Proposed lap structure (vertical slices)

House style: `docs/issues/_template.md` frontmatter + observable acceptance criteria +
named feedback-loop commands [verified —
.agents/context/vertical-slices.md, docs/issues/_template.md]. Each slice is one
shippable MR-sized unit. New area dir proposal: `flux/manifests/04-apps/security/` with
per-app subdirs (misp, opencti) matching existing area layout; authentik dashboard
category "Security" (planned by operator).

**Lap 0 — Issue + plan (docs only)**

- File `docs/issues/` entries per app from this doc; operator decisions recorded.
- Acceptance: issues filed with status/plan refs; this doc linked as research.

**Slice 1 — Storage + secrets foundation (both apps)**

- rustfs buckets + scoped users per house docs: `misp-files` (if used beyond attachments),
  `opencti-files`, `misp-mariadb-backups` (backup bucket for MISP's MariaDB — slice 8 dumps into it); 1Password items
  (`misp-secrets`, `opencti-secrets`, `opencti-misp-connector`) → ESO ExternalSecrets.
- Acceptance: bucket roundtrip test with new creds (PUT/GET/DELETE in-bucket 200,
  cross-bucket 403) per rustfs docs battery; ExternalSecret syncs `Ready`.

**Slice 2 — MISP deploy (no SSO yet)**

- cmu-sei/misp-helm via GitRepository; MariaDB/valkey subcharts on Longhorn; official
  images pinned by digest; gateway HTTPRoute; local admin login.
- Acceptance: `kustomize build` clean; Trivy scan on changed paths green; pods healthy
  (misp-core, misp-modules, mariadb, valkey); `https://misp.<domain>` loads behind
  gateway; default feeds pull succeeds (logs).

**Slice 3 — MISP SSO (authentik OIDC)**

- authentik OIDC provider + roles claim mapping + tile in "Security" category;
  misp chart OIDC envs; break-glass local admin preserved (mixedAuth).
- Acceptance: login via authentik works; role mapping `admins → misp role 1`; blocked
  user check documented; logout returns to IdP.

**Slice 4 — OpenCTI deploy (no SSO yet)**

- devops-ia/helm-opencti from its helm repo; OpenSearch single-node subchart on
  Longhorn (heap 3–4Gi) + `vm.max_map_count` decision applied; dragonfly + bitnami
  rabbitmq (with max_message_size/consumer_timeout settings); MINIO\_\_\* pointed at NAS
  rustfs; worker enabled; gateway HTTPRoute (websocket check); platform heap tuned.
- Acceptance: `/health?health_access_key=...` returns green; MITRE seeded entities land;
  file import writes object into `opencti-files` bucket in rustfs (smoke test for 2.6);
  kustomize/Trivy green.

**Slice 5 — OpenCTI SSO (authentik OIDC)**

- `PROVIDERS__OPENID__*` env; groups mapping to an OpenCTI admin group; local strategy
  kept as break-glass.
- Acceptance: "Login with Authentik" flow works end-to-end; user lands in mapped group;
  logout OK.

**Slice 6 — MISP → OpenCTI connector**

- connector-misp via chart `connectors:` values; MISP auth key from 1Password; network
  path misp↔opencti namespaces.
- Acceptance: create a test MISP event with indicators; within one poll interval it
  appears in OpenCTI as a report with indicators/observables (connector dashboard
  shows success counts).

**Slice 7 — Tenzir handoff (sibling lane dependency — coordination only)**

- Export surface chosen (TAXII collection vs live stream vs rustfs STIX file-drop);
  sibling gets the intake row spec + auth token; they own the OCSF mapping package.
- Acceptance: sibling acknowledges intake row exists in their funnel; first STIX bundle
  observed by their node (their acceptance, not ours).

**Slice 8 — Backups + ops docs**

- MariaDB dump CronJob → rustfs bucket (with one tested restore); kopia namespace
  labels for PVCs; READMEs for both apps (update strategy: pinned chart versions,
  OpenCTI LTS-or-monthly cadence, MISP follows chart appVersion).
- Acceptance: restore drill reproduces a working MISP login; READMEs merged.

Slice ordering rationale: each has an observable outcome; OpenCTI (4) can start in
parallel with MISP (2) since they don't share components. Slice 6 depends on 2+4+5.

---

## 6. Open questions for the operator (decision gates)

1. **MISP DB**: accept bitnami MariaDB subchart in-cluster (recommended), yes/no?
   (Postgres-on-CNPG = custom image fork + upstream "early support" — I recommend
   against; see 1.3.)
2. **Search engine**: OpenSearch (Apache-2.0, recommended) vs Elasticsearch via ECK?
   Heap size OK at 3–4Gi single node?
3. **`vm.max_map_count`**: Talos machine-config patch (protected `talos/**`) vs
   privileged initContainer via chart? (Cluster-wide precedent vs blast-radius.)
4. **SSO mode**: native OIDC for both apps (recommended; both have first-class OIDC
   and role/group mapping) vs authentik proxy mode (faster, but loses MISP role
   mapping and OpenCTI group mapping)?
5. **Placement/naming**: `flux/manifests/04-apps/security/{misp,opencti}/` + authentik
   "Security" category — confirm (nomenclature.md check pending operator).
6. **Scope check**: is MISP required before OpenCTI, or OK to land OpenCTI first
   (slices 4–5 independent)? MISP adds value mainly as feed/CTI staging for OpenCTI
   and the community sharing features.
7. **MariaDB backup RPO**: dump CronJob cadence acceptable (e.g. daily + on-demand
   pre-upgrade), or do we want something closer to CNPG-style continuous?

## One paragraph on case-management alternatives (asked-and-answered context)

The parent already ruled TheHive out on OSS EOL grounds (TheHive 3 EOL 2021, TheHive 4
EOS 2022-12-31, TheHive 5 = paid closed-source StrangeBee) [parent-provided; not
re-researched]. For completeness: if case management is later wanted alongside, OpenCTI
itself ships case/incident entities (Cases, Incident Response workflows in-platform
[verified — docs User Guide "Analysis → Cases"]), which covers lightweight analyst
workflow without a separate case product. No further alternatives researched per brief.

---

## 7. Source index

MISP:

- Official docker images: https://github.com/MISP/misp-docker (README, docker-compose.yml, template.env, core/Dockerfile — all fetched 2026-10-10)
- Sizing: https://www.misp-project.org/sizing-your-misp-instance/
- 2.5.47 release (PG support): https://www.misp-project.org/2026/09/17/misp.2.5.47.released.html/
- PG install guide: https://github.com/MISP/MISP/blob/2.5/docs/CONFIG.postgresql.md
- OidcAuth plugin: https://github.com/MISP/MISP/blob/2.5/app/Plugin/OidcAuth/README.md
- cmu-sei chart: https://github.com/cmu-sei/misp-helm (Chart.yaml, values.yaml, commits)
- Chart lineage issue: https://github.com/MISP/misp-docker/issues/112
- NUKIB single image: https://github.com/NUKIB/misp
- Dead/stale: https://github.com/DCSO/MISP-dockerized, https://github.com/pburgisser/misp-helm-chart
- MISP TAXII: https://github.com/misp/MISP-Taxii-Server, https://www.misp-project.org/2023/04/29/misp.how.to.push.to.a.taxii.server.html/

OpenCTI:

- Releases: https://github.com/OpenCTI-Platform/opencti/releases
- Docs (source of truth): https://github.com/OpenCTI-Platform/opencti/blob/master/docs/docs/deployment/overview.md,
  .../deployment/installation.md, .../deployment/authentication.md, .../usage/feeds.md
- Docker stack: https://github.com/OpenCTI-Platform/docker (docker-compose.yml, .env.sample, rabbitmq.conf)
- Default config: https://github.com/OpenCTI-Platform/opencti/blob/master/opencti-platform/opencti-graphql/config/default.json
- Helm chart: https://github.com/devops-ia/helm-opencti, https://artifacthub.io/packages/helm/helm-opencti/opencti,
  repo index https://devops-ia.github.io/helm-opencti/
- OpenSearch chart: https://github.com/opensearch-project/helm-charts/blob/main/charts/opensearch/values.yaml
- MISP connector: https://github.com/OpenCTI-Platform/connectors/tree/master/external-import/misp
  and chart example https://github.com/devops-ia/helm-opencti/blob/main/charts/opencti/connector-examples/connector-misp.yaml

Tenzir:

- Archived Threat Bus: https://github.com/tenzir/threatbus
- Current docs: https://tenzir.com/docs/ (no TAXII connector found in public surfaces)

Homelab repo (read during research):

- App pattern: flux/manifests/04-apps/productivity/n8n/helmrelease.yaml (CNPG + generic-app + authentik)
- generic-app values: helm/generic-app/values.yaml (authentik modes proxy/oidc/bookmark; postgres subchart)
- rustfs onboarding: docs/infrastructure/rustfs-bucket-user-creation.md
- Backup pattern: flux/manifests/03-services/backup/clusterrepository.yaml (kopia on NAS rustfs)
- CNPG operator: flux/manifests/03-services/postgresql/
- Slice/issue conventions: .agents/context/vertical-slices.md, docs/issues/\_template.md
- HelmRepository registry: flux/manifests/01-bootstrap/helm/repositories/

Live cluster (read-only queries, 2026-10-10):

- `kubectl get nodes` / `kubectl top nodes`: 4 × talos (16 CPU, ~64Gi), mem 31–60%, CPU 71–83%
- `kubectl get storageclass`: longhorn default (expansion enabled)
