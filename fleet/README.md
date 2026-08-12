# Fleet GitOps config

Declarative Fleet org settings, policies, reports, and fleet definitions.
Applied with `fleetctl gitops` by the CI job in
[`.gitlab-ci.yml`](./.gitlab-ci.yml).

> **Navigation**: [← Back to Fleet deployment README](../flux/manifests/04-apps/management/fleet/README.md)

## Upstream pattern

This tree follows the layout from `fleetctl new` (see also
[Fleet YAML files](https://fleetdm.com/docs/configuration/yaml-files)):

- `default.yml` — global / org-wide settings
- `fleets/*.yml` — one file per fleet (optional; omit until you need fleets)
- `platforms/` — reusable snippets referenced by path from those YAML files
- `gitops.sh` — thin wrapper around `fleetctl gitops` (dry-run then apply)

`gitops.sh` defaults to `--delete-other-fleets`: any fleet in Fleet that is not
defined under `fleets/` is removed on apply. Keep that in mind when adding or
renaming fleets.

## Layout

```
fleet/
├── .gitlab-ci.yml          # CI job (included from repo root)
├── gitops.sh               # fleetctl gitops wrapper
├── default.yml             # Global org settings
├── platforms/
│   ├── all/                # Cross-platform: policies, scripts, icons, reports
│   ├── macos/              # Profiles, policies, platform scripts, …
│   ├── windows/
│   ├── linux/
│   ├── ios/
│   └── ipados/
└── fleets/
    └── home.yml            # Single fleet for homelab devices
```

| Path              | Role                                                               |
| ----------------- | ------------------------------------------------------------------ |
| `default.yml`     | Server URL, org info, enroll secrets, SSO, global policies/reports |
| `platforms/**`    | Shared assets; reference from YAML with `path:` / `paths:`         |
| `fleets/home.yml` | Home fleet policies, controls, software                            |
| `gitops.sh`       | Invoked by CI; set `FLEET_DRY_RUN_ONLY=true` for validation only   |

Empty `platforms/` directories keep a `.keep` file so git retains the skeleton.
Drop `.keep` when you add real content.

## What lives where

- **Org-wide SSO, server URL, global enroll secret** → `default.yml` →
  `org_settings`
- **IdP icon for the login button** → `platforms/all/icons/` (URL in
  `sso_settings.idp_image_url`)
- **Policies / reports shared across fleets** → `platforms/…` and list them
  under `policies:` / `reports:` in `default.yml` or a fleet file
- **Fleet-scoped controls / policies** → `fleets/home.yml` (hosts can enroll
  directly into Home with the fleet enroll secret). Controls are inlined under
  `controls:` in that file (disk encryption + script library globs). Policy
  `platforms/all/policies/fleet-dm-was-here.yml` fails when the Desktop
  marker is missing and runs `fleet-dm-was-here.sh` (pass→fail only; ~hourly
  cadence).
- **Fleet software (Fleet-maintained apps)** → `software.fleet_maintained_apps`
  in `fleets/home.yml`. The `/darwin` slug scopes each app to macOS (GitOps
  rejects built-in labels like `macOS`). Install+patch (presence policy +
  `type: patch`): 1Password, Ableton Live Suite, Claude, Cursor, Fleet Desktop,
  Ghostty, Slack under `platforms/macos/policies/`. Self-service only (My Device,
  no auto-install): Blender, ChatGPT, Discord, GitHub Desktop, HandBrake, OBS,
  Obsidian, Podman Desktop, Rectangle, Spotify, Steam, Syncthing, Tailscale,
  VLC, Zoom. Home loads every platform policy tree via
  `paths: ../platforms/**/policies/**/*.yml` — drop a new `.yml` under any
  `platforms/*/policies/` and GitOps picks it up. Overlapping globs that match
  the same file will fail GitOps (ambiguous).
- **macOS CIS Level 1 (macOS 26 Tahoe)** →
  `platforms/macos/policies/cis-macos-26-l1.yml` (from Fleet
  [`ee/cis/macos-26`](https://github.com/fleetdm/fleet/tree/main/ee/cis/macos-26);
  see [CIS Benchmarks](https://fleetdm.com/guides/cis-benchmarks)). Assessment
  only — many checks need MDM profiles to pass. FileVault enforcement:
  `enable_disk_encryption` in `fleets/home.yml` controls.
- **macOS CIS MDM profiles (macOS 26)** →
  `platforms/macos/configuration-profiles/cis-macos-26/` (from Fleet
  [`ee/cis/macos-26/test/profiles`](https://github.com/fleetdm/fleet/tree/main/ee/cis/macos-26/test/profiles)).
  Vendored only — add under `apple_settings.configuration_profiles` in Home
  controls when ready to enforce.

Secrets and tokens are never committed. Enroll secrets live in 1Password
`fleetdm-secrets` and matching GitLab CI variables:

- `global-enroll-secret` / `FLEET_GLOBAL_ENROLL_SECRET` — Fleet pod
  `FLEET_PACKAGING_GLOBAL_ENROLL_SECRET` and `default.yml`
- `home-enroll-secret` / `FLEET_HOME_ENROLL_SECRET` — `fleets/home.yml`

Other CI variables: `FLEET_URL`, `FLEET_API_TOKEN`. See the
[Fleet deployment README](../flux/manifests/04-apps/management/fleet/README.md#ci-apply) for schedule setup.

## Local dry-run

```bash
export FLEET_URL=https://fleet.gateway.services.apocrathia.com
export FLEET_API_TOKEN=...
export FLEET_GLOBAL_ENROLL_SECRET=...
export FLEET_HOME_ENROLL_SECRET=...
fleetctl config set --address "$FLEET_URL" --token "$FLEET_API_TOKEN"
FLEET_DRY_RUN_ONLY=true ./gitops.sh
```

## References

- [YAML files reference](https://fleetdm.com/docs/configuration/yaml-files)
- [fleetctl CLI](https://fleetdm.com/docs/using-fleet/fleetctl-cli)
