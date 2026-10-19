# CDN

A `git clone` behind nginx, cosplaying as a CDN. Two pods re-clone this repo
every 180 seconds and serve the whole damn tree over HTTP with a straight
face. Is it a real CDN? No. Does it technically count? The operator has
ruled that it does: "this is such a makeshift shitty cdn, but it
technically counts."

It exists for a real reason: dashboard tiles used to pull repo bytes
straight off GitLab's raw endpoint, whose unauth-per-IP rate limiter 429s
icon fetches at scale. Now no browser touches raw GitLab URLs - problem
closed by construction.

> **Navigation**: [← Back to Management README](../README.md)

## URL convention

The part that matters (yes, the "CDN" serves one repo at one path - that's
the whole product):

```text
https://cdn.gateway.services.apocrathia.com/homelab/<repo-relative-path>
```

- App icons: `flux/manifests/.../<app-dir>/icon.svg|icon.png` serves at its
  repo path - e.g.
  `https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/04-apps/home/mealie/icon.svg`.
- Tofu-lane tiles (the former blueprint apps) live at
  `/homelab/flux/manifests/03-services/authentik/tiles/<name>/icon.svg` -
  e.g. `.../tiles/gitlab/icon.svg`.
- Any other tracked repo file is also right there. No flattening, no
  registry, no CDN features - just the tree, with a rate limit.

Readiness/gatus probe: repo-root file (`/homelab/README.md`), never a
lane-owned path - the tofu-tiles migration deleted
`blueprints/icons/gitlab.svg` and 404'd the probe, taking the whole
icon fleet down (2026-10-19 incident).

The `/homelab` prefix is deliberate, not indecision: it names the synced
repo in the URL space, so a future second repo gets its own slot
(e.g. `/other-repo/...`) on the same host without path collisions.
Namespaced jank scales.

**New app recipe:** drop `icon.svg`/`icon.png` in the app dir, set the
lane's `meta_icon` (tofu lane, chart `authentik.icon` value, or blueprint
`icon:`) to the URL above, commit. No registration step, nothing to
restart - the next clone cycle serves it.

## How it serves

Two pods, two containers, one emptyDir per pod, zero credentials - a
content delivery architecture you can draw on a napkin:

1. **git-sync** clones the public repo
   (`https://gitlab.com/Apocrathia/homelab.git`, depth-1, 180s loop, no
   auth - the repo is public) into the `repo` emptyDir and publishes the
   synced worktree at `/git/homelab` with an atomic symlink flip.
2. **nginx** serves the clone root (`nginx.conf`, demo-app pattern:
   non-root, read-only rootfs, rate limits). The symlink is the URL
   namespace: `/homelab/<repo path>`. That's the trick. That's the whole
   trick.

Replicas: 2. Safe because each pod clones independently (per-pod git-sync
plus its own emptyDir - no shared volume) and chart anti-affinity spreads
the pods across nodes - even a CDN that is a `git clone` gets redundancy.

Icons land within roughly one git-sync period (180s) of hitting `main`.
The pods serve straight off `main`, bypassing the flux apply gate - fine
for public bytes. The cache-invalidation story is "wait three minutes."

## Why the tailnet door (load-bearing)

Friends reach the authentik dashboard over Tailscale, and their browsers
fetch these same `meta_icon` URLs. cdn must answer on the tailnet too, or
every dashboard tile they load breaks - and then this whole contraption
is pointless for exactly the people it protects. The chart `tailnet`
block adds a second parentRef to the same HTTPRoute hostname - no extra
hostname, no extra route.

## Failure modes

- **Read-only rootfs**: git-sync's image sets `HOME=/tmp` and writes its
  gitconfig there at startup, pre-clone - the sidecar needs /tmp
  writable (the `git-sync-tmp` emptyDir, this container only) or it dies
  instantly.
- **GitLab outage**: new commits stop syncing; the cached tree keeps
  serving stale icons with total confidence. git-sync runs
  `--max-failures=-1` (retry forever), so a 429 storm degrades to
  staleness instead of a sidecar crash-loop; nginx never stops serving
  the stale tree. A cold start mid-outage waits (pod stays not-ready on
  the readiness probe against a real repo file) until the first
  successful clone.
- **GitLab rate limits**: the poll runs every 180s, keeping the 2
  replicas around ~40 unauth req/hr from the home IP - under gitlab's
  observed ~60/hr per-IP cap. The poll stays that slow on purpose.
- **Host down**: tiles render iconless; cosmetic and self-healing.
- **Removed files** drop out on the next sync tick - serving straight
  off the synced tree means no flat-copy drift.

## Access

- **External URL**: `https://cdn.gateway.services.apocrathia.com`
  (unauthenticated, LAN + tailnet - browser `<img>` fetches happen
  outside authentik sessions)
- **Internal Service**: `http://cdn.cdn.svc.cluster.local:80`
- No authentik integration: the app is not a dashboard tile itself.

## Troubleshooting

```bash
kubectl -n cdn get pods
kubectl -n cdn logs deployment/cdn -c git-sync  # sync loop state

# Fetch a file through the full chain
curl -fsSI https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/03-services/authentik/blueprints/icons/gitlab.svg
```

## References

- **[git-sync](https://github.com/kubernetes/git-sync)** - the "edge" of
  this CDN (v4, `--period=180s`)
