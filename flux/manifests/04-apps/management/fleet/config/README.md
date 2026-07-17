# Fleet GitOps config

Declarative Fleet org settings, policies, queries, and team definitions. Applied
with `fleetctl gitops` by the CI job in [`.gitlab-ci.yml`](./.gitlab-ci.yml).

> **Navigation**: [← Back to Fleet README](../README.md)

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
config/
├── .gitlab-ci.yml          # CI job (included from repo root)
├── gitops.sh               # fleetctl gitops wrapper
├── default.yml             # Global org settings
├── lib/
│   ├── all/                # Cross-platform: labels, queries, agent-options, icons
│   ├── macos/              # Profiles, policies, scripts, software, …
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
| `teams/home.yml` | Home team policies, controls, software (no team enroll secret)     |
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
- **Team-scoped controls / policies** → `teams/home.yml` (hosts enroll globally,
  then transfer into Home in the UI)

Secrets and tokens are never committed. The global enroll secret is stored in
1Password as `fleetdm-secrets` → `enroll-secret`, injected into the Fleet pod as
`FLEET_PACKAGING_GLOBAL_ENROLL_SECRET`, and into CI as
`FLEET_GLOBAL_ENROLL_SECRET` (referenced from `default.yml`). Use the same value
in all three places. Home has no team enroll secret.

Other CI variables: `FLEET_URL`, `FLEET_API_TOKEN`. See the
[parent README](../README.md#ci-apply) for schedule setup.

## Local dry-run

```bash
export FLEET_URL=https://fleet.gateway.services.apocrathia.com
export FLEET_API_TOKEN=...
export FLEET_GLOBAL_ENROLL_SECRET=...
fleetctl config set --address "$FLEET_URL" --token "$FLEET_API_TOKEN"
FLEET_DRY_RUN_ONLY=true ./gitops.sh
```

## References

- [fleetdm/fleet-gitops](https://github.com/fleetdm/fleet-gitops)
- [YAML files reference](https://fleetdm.com/docs/using-fleet/gitops)
- [fleetctl CLI](https://fleetdm.com/docs/using-fleet/fleetctl-cli)
