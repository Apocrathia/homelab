# Icons

Self-hosted authentik dashboard icon server. Serves every repo icon from one
flat, unauthenticated LAN URL so dashboard tiles stop fetching
`gitlab.com/Apocrathia/homelab/-/raw/main/...` (GitLab's unauth-per-IP rate
limiter 429s icon fetches at scale - closed by construction once nothing
fetches gitlab raw URLs from a browser).

> **Navigation**: [← Back to Management README](../README.md)

## URL contract

```text
https://icons.gateway.services.apocrathia.com/<flat-name>
```

- Every `<app-dir>/icon.svg|icon.png` under `flux/manifests/` serves as
  `<dirname>.<ext>` - e.g. `flux/manifests/04-apps/home/mealie/icon.svg`
  becomes `https://icons.gateway.services.apocrathia.com/mealie.svg`.
- Every file in `flux/manifests/03-services/authentik/blueprints/icons/`
  serves as its basename - e.g. `gitlab.svg`, `home-assistant.svg`.
- The flat name is the **directory** name, not the authentik slug. Slugs
  deliberately differ from dir names (`cilium` -> `hubble`,
  `kube-prometheus-stack` -> `grafana`, `backup` -> `kopia`,
  `crossplane` -> `crossview`, `renovate-operator` -> `renovate`,
  `kube-auth` -> `kubernetes`, `tdarr` -> `tdarr-server`,
  `mumble` -> `mumble-web`, `fleet` -> `fleetdm` + `fleetdm-mdm`,
  `flux-system` -> `flux-operator` + `flux-operator-oidc`) - the URL follows
  the icon's directory, and every lane for that directory shares the same
  URL.

New app recipe: drop `icon.svg`/`icon.png` in the app dir, set the lane's
`meta_icon` (tofu lane, chart `authentik.icon` value, or blueprint `icon:`)
to the URL above, commit. No registration step - the next sync serves it.

## How it serves

One pod, three containers, two emptyDirs, zero credentials:

1. **git-sync** sidecar clones the public repo
   (`https://gitlab.com/Apocrathia/homelab.git`, depth-1, 60s pull loop,
   no auth - the repo is public) into the `repo` emptyDir and publishes the
   synced worktree at `/git/repo` with an atomic symlink flip.
2. **flatten** sidecar copies the icons out into the `html` emptyDir every
   30s, applying the two flatten rules above. Per-file staging + `mv`
   (rename) means nginx never reads a half-written file.
3. **nginx** serves the flat dir over a hardened config
   (`nginx.conf`, demo-app pattern: non-root, read-only rootfs, rate limits)
   at `https://icons.gateway.services.apocrathia.com` via the chart
   HTTPRoute (wildcard cert + external-dns; no new TLS/DNS work).

Icons update within roughly one git-sync period (60s) plus one flatten tick
(30s) of landing on `main`. The pod is a mini-reconciler: it serves straight
off `main`, bypassing the flux apply gate - fine for public bytes.

## Failure modes

- **GitLab outage**: new icon commits stop syncing; the cached flat dir keeps
  serving. A cold start mid-outage waits (pod stays not-ready on the
  `/gitlab.svg` readiness probe) until the first successful clone.
- **Host down**: tiles render iconless; cosmetic and self-healing.
- **Removed icons** linger in the flat dir until pod restart; nothing
  references them, so nobody fetches them.

## Access

- **External URL**: `https://icons.gateway.services.apocrathia.com`
  (unauthenticated, LAN-only - browser `<img>` fetches happen outside
  authentik sessions)
- **Internal Service**: `http://icons.icons.svc.cluster.local:80`
- No authentik integration: the app is not a dashboard tile itself.

## Troubleshooting

```bash
kubectl -n icons get pods
kubectl -n icons logs deployment/icons -c git-sync   # sync loop state
kubectl -n icons logs deployment/icons -c flatten    # flatten output

# Fetch an icon through the full chain
curl -fsSI https://icons.gateway.services.apocrathia.com/gitlab.svg
```

## References

- **[git-sync](https://github.com/kubernetes/git-sync)** - sidecar that
  clones and holds the repo in sync (v4, `--period=60s`)
