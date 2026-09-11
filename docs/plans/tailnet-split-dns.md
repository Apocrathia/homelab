---
title: "Tailnet split DNS for friends (retire the public tailnet path)"
status: active
found_at: 2026-09-10
updated_at: 2026-09-10
area: networking
---

# Tailnet split DNS for friends (retire the public tailnet path)

## Goal

Friends get homelab app access over Tailscale with zero public DNS and zero
LAN routes. They are invited tailnet users (`group:friends`), resolve the same
`gateway.services.apocrathia.com` hostnames the LAN uses through tailnet split
DNS pointed at a tailnet-internal resolver, and authenticate through Authentik
on every app. The old public path - the Cloudflare `*.tailnet.apocrathia.com`
A record, the wildcard Certificate, and the direct-to-Service routes - is
retired entirely.

## Scope

**In scope:**

- `tailnet-dns` stack: CoreDNS + etcd + a second ExternalDNS instance serving
  `gateway.services.apocrathia.com` to the tailnet (slice 1)
- `tailnet-gateway` `https-gateway-services` listener and dual-parentRef
  routes (Authentik, demo-app) (slice 1)
- Retirement of the public `*.tailnet.apocrathia.com` path: Cloudflare record,
  wildcard Certificate, old gateway listener and orphaned ReferenceGrant,
  demo-app/jellyfin direct routes, `autogroup:shared` policy grant,
  external-dns `excludeDomains`, tailnet search paths (slice 4)
- README and plan-doc reconciliation

**Out of scope:**

- Authentik group bindings and outpost authorization for friends (slice 2,
  follow-up MR)
- Inviting friends, filling `group:friends`, enabling split DNS with the
  resolver device IP (slice 3, follow-up MR + operator invite step)
- Jellyfin friend access (later slice; outpost-vs-OIDC mode decision first)
- Subnet routes or LAN IP advertisement to the tailnet - rejected outright

## Decisions

- **Tailnet-internal DNS over subnet exposure** - CoreDNS + etcd + ExternalDNS
  inside the cluster, exposed via `tailscale.com/expose` (operator L3, TCP/UDP 53) - zero LAN routes; friends never see a LAN IP. Reversible: delete the
  `tailnet-dns` Kustomization.
- **Friends are invited tailnet users, not device-shares.** Device-share
  (`autogroup:shared`) is retired with the public path: the share dialog, its
  policy grant, and the tailscale#14445 workaround are gone.
- **All friend-facing routes MUST go Gateway -> Authentik outpost** (locked,
  slice 4): the route's backendRef is the app's outpost Service
  (`ak-outpost-<app>-outpost:9000`). Direct-to-Service friend-facing routes
  are forbidden - friends get the same SSO, redirect URIs, and app permissions
  as the LAN; nothing friend-facing bypasses the IdP.
- **Same hostnames on both sides.** Friends resolve
  `gateway.services.apocrathia.com` via tailnet split DNS to `tailnet-gateway`;
  the LAN resolves the same names via UniFi to `main-gateway`. Dual-parentRef
  routes attach to both gateways.
- **Deny-by-default stays.** Admins get `tag:k8s` 443 and tcp/udp 53
  only; no exit-node, no internet. `group:friends` and its grant (same
  ports) are added together with the first invite in slice 3 - no user
  emails are committed to git before invitations exist.
- **Terraform applies from CI.** The `tofu-apply` GitLab job
  (`.gitlab/tofu.gitlab-ci.yml`, stage deploy) runs
  `terragrunt run --all --parallelism 1 --non-interactive -- apply
-auto-approve` on the default branch whenever `terraform/**/*` changes. The
  Cloudflare record removal and the tailnet policy change are applied
  automatically on merge; no manual apply step.
- **Search paths emptied** - the tailnet search domain only resolved via the
  retired public wildcard record.

## Steps

- [x] Slice 1 - tailnet-internal DNS (this MR): `tailnet-dns` stack,
      `https-gateway-services` listener, dual-parentRef pilots (Authentik,
      demo-app), external-dns `--gateway-name` filters, admin 443+53 grants,
      `dns_split_dns` scaffolding in terragrunt.
- [x] Slice 4 - retire the public path (this MR): Cloudflare record block
      removed; Certificate, old listener, and orphaned ReferenceGrant removed;
      demo-app and jellyfin direct routes removed; `autogroup:shared` grant
      removed; external-dns `excludeDomains` dropped; search paths emptied;
      READMEs rewritten.
- [ ] Slice 2 - Authentik: friends group bindings, outpost authorization
      (follow-up MR).
- [ ] Slice 3 - invite friends: create `group:friends` (first invite's
      email) plus the `group:friends -> tag:k8s` 443+53 grant in
      `policy.hujson`, read the `tailnet-dns` device IP, set
      `dns_split_dns` in `terraform/deployments/tailscale/tailnet/terragrunt.hcl`,
      invite the users (follow-up MR + operator invite step).

## Feedback loop

- `kustomize build flux/manifests`, plus per-dir builds for
  `flux/manifests/03-services/tailscale`,
  `flux/manifests/03-services/external-dns`,
  `flux/manifests/04-apps/demo-app`,
  `flux/manifests/04-apps/media/servers/jellyfin`
- `yamllint --strict -c .yamllint` and `prettier --check` on changed files
- `kube-linter lint --config .kube-linter.yaml flux/`
- `tofu fmt -check` on changed terraform paths; `terragrunt hcl format
--check` on edited hcl files; comment-stripped `policy.hujson` parses as
  JSON
- `trivy fs --scanners secret` on changed paths
- `grep -rn "tailnet.apocrathia" flux/ terraform/deployments` - no live
  config references may remain (this plan is the archive)

## Notes

Post-merge, automatic: the `tofu-apply` CI job applies both the Cloudflare
record removal and the trimmed tailnet policy in the same run. Device-share
friends are cut off at merge time (grant and record go together), not at
DNS-propagation time. Until slice 3 enables split DNS there is a window with
no friends-facing DNS at all - public record gone, split DNS not yet enabled -
accepted by the operator; the pilot had no real friend users.

Optional manual cleanup: the lingering `tailnet-apocrathia-com-tls` Secret in
the `cert-manager` namespace (the Certificate CR is removed by this MR;
cert-manager may leave the emitted Secret behind).

Slice 3 then creates `group:friends` with the first invite and re-adds the grant.
