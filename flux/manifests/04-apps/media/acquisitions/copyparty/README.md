# copyparty

A single-binary file server with resumable browser uploads (up2k): uploads
survive dropped connections, reboots, and corrupted chunks re-send
automatically. Deployed as the friends' contribution drop box — media and
files land as plain files on the NAS, ready for manual triage or import into
the media stack.

> **Navigation**: [← Back to Media README](../../README.md)

## Overview

This deployment includes:

- copyparty (`ac` edition: ffmpeg thumbnails, audio transcoding) on port 3923
- Authentik proxy provider for SSO; identity headers drive copyparty's
  per-user volume ACLs
- SMB-backed `/w` (the `Uploads` share) — uploads appear as regular files on
  the NAS under `u/<username>/`
- Longhorn `/state` for the sqlite databases, thumbnails, and the IdP
  user/group cache (kept off SMB)
- CiliumNetworkPolicy restricting ingress to the Authentik outpost, gatus
  probes, and node health checks (identity headers are trusted by source,
  so nothing else may talk to the pod)

## Access

- **URL**: <https://copyparty.gateway.services.apocrathia.com>
- **Friends (tailnet)**: same hostname via the tailnet-gateway parentRef;
  friends land at `/u/<username>/` (book a bookmark there — the webroot is
  admins-only)
- **On the NAS**: `//storage.services.apocrathia.com/Uploads/u/<username>/`

## Configuration

All tunables live in `copyparty-conf.yaml` (ConfigMap mounted at `/cfg`);
copyparty loads every `*.conf` it finds there. Volume ACLs:

- `/` (webroot) — admins only
- `/u/<username>/` — read/write/move/delete/admin for that user and admins

Auth: the Authentik outpost injects `X-Authentik-Username` /
`X-Authentik-Groups`; copyparty trusts these from cluster-internal sources
only (`xff-src: lan`). Groups arrive pipe-separated, which the default
`idp-gsep` already parses. WebDAV/SFTP clients cannot inject these headers —
browser uploads are the supported path for friends.

## Prerequisite

The `Uploads` SMB share must exist on `storage.services.apocrathia.com`
(or repoint `storage.smb.volumes[].source` in `helmrelease.yaml` at an
existing share).

## Troubleshooting

```sh
kubectl -n copyparty logs deploy/copyparty --tail=50
kubectl -n copyparty get pods,pvc
```

- Login loops or empty listings: check the pod actually receives
  `X-Authentik-Username` (logs complain loudly if the outpost subnet is not
  trusted).
- Uploads fail on mkdir: verify the SMB mount is read-write and the NAS-side
  user can create `u/` directories.
- Connection refused from inside the cluster: the NetworkPolicy only admits
  the outpost, gatus, and the node — by design.
