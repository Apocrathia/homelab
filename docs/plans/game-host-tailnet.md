---
title: "Game host tailnet exposure (AMP over 443 + OIDC)"
status: draft
found_at: 2026-09-12
updated_at: 2026-09-12
area: networking
---

# Game host tailnet exposure

## Goal

Expose the bare game host (`game.services.apocrathia.com`, AMP) to the tailnet
without subnet routes or ts.net names, following the same shape as the friends
tailnet split-DNS work:

- friends and admins resolve `game.apocrathia.com` to the host's tailnet
  (CGNAT) address through the existing `tailnet-dns` split-DNS resolver
- the AMP web UI moves from `:8080` plain HTTP to `https://` on 443 behind
  nginx with a Let's Encrypt cert minted via Cloudflare DNS-01 (no public
  A record, no open ports — Cloudflare API only)
- AMP authenticates through Authentik via OIDC; the existing `amp` bookmark
  application is upgraded to a real OIDC application
- web UI access is admins-only; game instance ports are open to all tailnet
  members (friends)

## References

- CubeCoders AMP HTTPS setup (nginx reverse proxy — the vhost this role
  templates is based on):
  <https://discourse.cubecoders.com/t/setting-up-secure-http-https-with-amp/2305>
- CubeCoders AMP OIDC with Authentik (AMPConfig.conf keys, AMP\_ role prefix):
  <https://discourse.cubecoders.com/t/using-oidc-authentication-with-authentik/26618>
- AMP OIDC groups claim (Keycloak mapper, confirms AMP reads `groups`):
  <https://discourse.cubecoders.com/t/oidc-using-keykloak-causes-error-on-login/26000>
- AMP OIDC with Authelia (shows AMP requests `openid profile groups email`):
  <https://discourse.cubecoders.com/t/setup-oidc-using-authelia/37220>
- acme.sh DNS API (dns_cf) and options:
  <https://github.com/acmesh-official/acme.sh/wiki/dnsapi#1-cloudflare-option>
- acme.sh default CA is ZeroSSL since v3.0 — `--server letsencrypt` pins LE:
  <https://codeberg.org/neilpang/acme.sh/wiki/Change-default-CA>

- Tailscale policy file syntax (grants, tagOwners, tests):
  <https://tailscale.com/kb/1337/acl-syntax>
- Tailnet split-DNS plan (the cluster-workload counterpart pattern; the two
  docs describe one architecture from both sides):
  `docs/plans/tailnet-split-dns.md`

## Slices

1. **Ansible — nginx + acme.sh (DNS-01)** (`ansible/roles/nginx_site` +
   in-repo `ansible/roles/acme_sh`, `ansible/playbooks/game.yml`): generic
   reverse-proxy site — 443 ssl -> upstream with websocket headers. The
   in-repo acme_sh role owns the four commands (clone, install, issue,
   install-cert) with Cloudflare DNS-01 and `--server letsencrypt` pinned
   (acme.sh defaults to ZeroSSL); renewal cron + reloadcmd are acme.sh's
   own. A Galaxy wrapper was evaluated and dropped — our usage is one
   domain on one host, and the wrapper's install plumbing outweighed its
   logic. All AMP specifics (domain, upstream, shared webroot, token
   lookup) live in `ansible/inventory/host_vars/game.yml`. The roles are
   app-agnostic: the next host is a host_vars entry plus a playbook line.
2. **Ansible — tailscale** (`ansible/roles/tailscale`): join with
   host_vars-declared tags (`tag:game` for this host), no subnet routes,
   accept tailnet DNS.
3. **Authentik blueprint** (`flux/manifests/03-services/authentik/blueprints/amp.yaml`):
   `AMP_Super Admins` group, the existing `groups` scope mapping (AMP
   requests the standard `groups` scope and maps prefixed names to roles),
   OIDC provider with strict redirect URI `https://game.apocrathia.com/`,
   app upgraded from bookmark.
4. **Terraform + CoreDNS** (`terraform/deployments/tailscale/tailnet/`):
   `tagOwners` + `tag:game`; grants `admin -> tag:game tcp:443` and
   `member -> tag:game tcp:25565` (extend per game instance); split-DNS zone
   `game.apocrathia.com` on the same resolver; static hosts-file A record in
   the tailnet-dns Corefile (placeholder IP replaced post-join).

## Operator-led steps (not GitOps)

- Generate the tag-scoped auth key in the Tailscale console
  (Settings -> Keys -> Generate auth key): **Reusable**, **Pre-authorized**
  (no per-device approval click), **Expiration** set (e.g. 90d; reissue when
  the next host onboards). Store it as a 1Password API Credential item:
  vault `Secrets`, title `tailscale-ansible-authkey`, token in the default
  `credential` field. CI picks it up via `ansible/ci/fetch_op_secrets.py`
  (1Password Connect) and passes it as `-e @op_secrets.json`. Blast radius:
  any holder of the key joins as `tag:game` — note the revoke procedure in
  the 1Password item (console: Settings -> Keys -> revoke). No interactive
  login on the host: the role passes `--authkey`, and pre-authorization
  skips the console approval click. The LAN was already the trust boundary
  for these hosts, so this is tightening, not new exposure.
- Run the playbooks against `game`; read `tailscale ip -4` on the host; put
  the address into the CoreDNS hosts block and drop the placeholder comment.
- AMP instance config (host file edit, ADS stopped):
  `Core.Webserver.UsingReverseProxy=True`, then the `Login.*` OIDC keys with
  the client secret from the Authentik provider.
- Authentik: copy the provider client ID/secret when first configuring AMP
  (blueprints create the provider but do not print secrets).

## Escalation path (tags)

One tag (`tag:game`) with explicit per-port grants is the honest model while
the host is the unit: game instances are ports on it, and each port addition
is a reviewed policy diff. Per-instance tags would mean re-keying the host
per game (authkeys are tag-scoped). When a second game HOST appears, that is
the moment for `tag:game-2` etc. — same join role, new tagOwners entry.

## Notes

- The tailnet sharing surface is 443 (admins) + game ports (members) only —
  no tailnet grant touches 8080, so AMP's LAN-bound web port stays LAN-only.
  `amp-exporter` keeps hitting `http://game.apocrathia.com:8080` over the
  LAN and needs no change.
- Optional later hardening: bind ADS to 127.0.0.1 (localhost) on the host.
  That requires flipping `amp-exporter` to `https://game.apocrathia.com`
  (local logins coexist with OIDC, so the exporter's credentials keep
  working). Not in this MR.

## Verification

Post-ship (binding census — import race watch): the blueprint CM change makes
all 4 Authentik workers re-import the file; the same race that left demo-app
with duplicate admins bindings can fire (unique_together has NULL policy_id;
Postgres NULLs never collide). After this lands, run the census and expect
exactly 1 row:

```sql
SELECT count(*) FROM authentik_policies_policybinding
WHERE target = (amp application) AND "group" = (admins group);
```

Also: `AMP_Super Admins` is a role-mapping group (AMP reads the prefixed
name from the groups claim), NOT an access tier — it must never carry app
policybindings of its own. Do not add any in review or follow-ups.

1. Admin device: `https://game.apocrathia.com` loads with a valid LE cert,
   OIDC login round-trips through `auth.gateway.services.apocrathia.com`.
2. Friend account: resolves `game.apocrathia.com` to the host's 100.x
   address (not the LAN IP), `:25565` connects, `:443` and `:8080` are
   refused by the tailnet policy.
3. `tailscale debug netmap` on the friend device shows the split-DNS route
   for `game.apocrathia.com`.
