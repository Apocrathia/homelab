# Authentik tiles

The tofu-managed dashboard tiles for apps that have no in-cluster
workload of their own (bookmarks and external-UI launchpads). Each
`<app>/` folder is the canonical file pair — `crossplane.yaml`
(ProviderConfig + Workspace) + `authentik.tf` (the module) — stitched
by its `kustomization.yaml`, plus the app icon.

> **Navigation**: [← Back to Authentik README](../README.md)

## Adopted, not created

Every tile's live objects (application + policy bindings) were minted by
the retired `blueprints/` ConfigMaps. Each workspace ADOPTS them via
gated import blocks (see each `authentik.tf`): the application imports
ungated by slug; binding uuids ride the merge-gate varmap (recipe §8) —
witness ids never appear in git.

## What is deliberately NOT here

- The `amp-oidc-provider` and `proxmox-oidc-provider` OIDC providers —
  they stay blueprint-orphaned (live, unmanaged); the tiles only link
  the apps to them by name (`authentik_provider_oauth2_config`)
- The `AMP_Super Admins` group (AMP role mapping) — same orphan class
- The retired `blueprints/icons/` URLs in `meta_icon` — live-verbatim;
  repointing them to the new `tiles/<app>/icon.*` paths is a separate
  deliberate follow-up

## Remaining blueprints

`blueprints/` keeps the non-tile set (okta source, webauthn MFA,
app-access groups, terraform service account); the kubernetes blueprint
lives in `kube-auth/`, tak-ldap in `tak/`'s own dir.
