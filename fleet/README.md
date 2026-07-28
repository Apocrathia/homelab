# Fleet GitOps config

Declarative Fleet org settings, policies, queries, and team definitions. Applied
with `fleetctl gitops` by the CI job in [`.gitlab-ci.yml`](./.gitlab-ci.yml).

> **Navigation**: [← Back to Fleet deployment README](../flux/manifests/04-apps/management/fleet/README.md)

## Upstream pattern

This tree follows [fleetdm/fleet-gitops](https://github.com/fleetdm/fleet-gitops):

- `default.yml` — global settings for “All teams”
- `teams/*.yml` — one file per team (optional; omit until you need teams)
- `lib/` — reusable snippets referenced by path from those YAML files
- `gitops.sh` — thin wrapper around `fleetctl gitops` (dry-run then apply)

YAML field reference: [Fleet GitOps docs](https://fleetdm.com/docs/using-fleet/gitops).

`gitops.sh` defaults to `--delete-other-fleets`: any fleet/team in Fleet that is
not defined under `teams/` is removed on apply. Keep that in mind when adding the
first team file.

## Layout

```
fleet/
├── .gitlab-ci.yml          # CI job (included from repo root)
├── gitops.sh               # fleetctl gitops wrapper
├── default.yml             # Global org settings
├── lib/
│   ├── all/                # Cross-platform: labels, queries, scripts, icons
│   ├── controls/           # Team controls bundles (path: from teams/*.yml)
│   ├── macos/              # Profiles, policies, platform scripts, …
│   ├── windows/
│   ├── linux/
│   ├── ios/
│   └── ipados/
└── teams/
    └── home.yml            # Single team for homelab devices
```

| Path             | Role                                                               |
| ---------------- | ------------------------------------------------------------------ |
| `default.yml`    | Server URL, org info, enroll secrets, SSO, global policies/queries |
| `lib/**`         | Shared assets; reference from YAML with `path:` / `paths:`         |
| `lib/controls/`  | Controls bundles for teams (`controls.path` in `teams/*.yml`)      |
| `teams/home.yml` | Home team policies, controls, software                             |
| `gitops.sh`      | Invoked by CI; set `FLEET_DRY_RUN_ONLY=true` for validation only   |

Empty `lib/` directories keep a `.keep` file so git retains the skeleton. Drop
`.keep` when you add real content.

## What lives where

- **Org-wide SSO, server URL, global enroll secret** → `default.yml` →
  `org_settings`
- **IdP icon for the login button** → `lib/all/icons/` (URL in
  `sso_settings.idp_image_url`)
- **Policies / queries shared across teams** → `lib/…` and list them under
  `policies:` / `reports:` in `default.yml` or a team file
- **Team-scoped controls / policies** → `teams/home.yml` (hosts can enroll
  directly into Home with the team enroll secret). Controls live in
  `lib/controls/home.yml` (`controls.path`); scripts under `lib/all/scripts/`
  are registered via a `paths:` glob. Policy
  `lib/all/policies/fleet-dm-was-here.yml` fails when the Desktop/home marker
  is missing and runs `fleet-dm-was-here.sh` (pass→fail only; ~hourly cadence).
- **macOS CIS Level 1 (macOS 26 Tahoe)** →
  `lib/macos/policies/cis-macos-26-l1.yml` (from Fleet
  [`ee/cis/macos-26`](https://github.com/fleetdm/fleet/tree/main/ee/cis/macos-26);
  see [CIS Benchmarks](https://fleetdm.com/guides/cis-benchmarks)). Assessment
  only — many checks need MDM profiles to pass. FileVault enforcement:
  `enable_disk_encryption` in `lib/controls/home.yml`.
- **macOS CIS MDM profiles (macOS 26)** →
  `lib/macos/configuration-profiles/cis-macos-26/` (from Fleet
  [`ee/cis/macos-26/test/profiles`](https://github.com/fleetdm/fleet/tree/main/ee/cis/macos-26/test/profiles)).
  Vendored only — add under `apple_settings.configuration_profiles` in the Home
  controls bundle when ready to enforce.

Secrets and tokens are never committed. Enroll secrets live in 1Password
`fleetdm-secrets` and matching GitLab CI variables:

- `global-enroll-secret` / `FLEET_GLOBAL_ENROLL_SECRET` — Fleet pod
  `FLEET_PACKAGING_GLOBAL_ENROLL_SECRET` and `default.yml`
- `home-enroll-secret` / `FLEET_HOME_ENROLL_SECRET` — `teams/home.yml`

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

- [fleetdm/fleet-gitops](https://github.com/fleetdm/fleet-gitops)
- [YAML files reference](https://fleetdm.com/docs/using-fleet/gitops)
- [fleetctl CLI](https://fleetdm.com/docs/using-fleet/fleetctl-cli)
