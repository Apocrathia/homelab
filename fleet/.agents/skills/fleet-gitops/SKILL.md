---
name: fleet-gitops
description: Manage the FleetDM MDM GitOps config under fleet/ (default.yml, fleets/*.yml, and the policies, reports, labels, scripts, software, and configuration profiles under platforms/). Covers Fleet-maintained apps, osquery queries, Apple/Windows/Android configuration profiles, controls, and org settings, plus validation and dry runs. Use when a task touches the fleet/ FleetDM MDM tree: policies, profiles, software, reports, scripts, controls, or org settings.
---

# Fleet GitOps

The `fleet/` tree is the source of truth for the live FleetDM instance. CI (`fleet/.gitlab-ci.yml` → `gitops.sh`) runs `fleetctl gitops` against the YAML on every merge to the default branch, so a merged change reaches real Macs, iPhones, and Linux hosts within minutes; MR pipelines get a dry run only. Work as if every file you touch ships to devices: match what the tree already does, validate against the real schema rather than memory, and never run `fleetctl gitops` without `--dry-run`. Applying is CI's job, after a human merges.

The reference for every key is https://fleetdm.com/docs/configuration/yaml-files. Fetch the relevant section whenever you're unsure what a section accepts; `fleetctl gitops` rejects unknown keys, and a key it accepts in the wrong place is often silently ignored.

## Orient before writing

1. **The GitOps root is `fleet/`.** `fleet/default.yml` holds org-wide settings plus global labels, policies, and reports. Fleet files are `fleet/fleets/*.yml`, one per fleet of hosts (`fleets/home.yml` is the only one today), plus optional `fleets/unassigned.yml` for hosts in no fleet. Everything else is the artifacts tree, `fleet/platforms/<platform>/<kind>/` (policies, reports, scripts, configuration profiles, icons). `gitops.sh` defaults to `--delete-other-fleets`: any fleet defined in Fleet but not under `fleets/` is deleted on apply, so keep that in mind when adding or renaming fleets.
2. **Read `default.yml` and the fleet file(s) you'll change, end to end.** They show the conventions you must match: inline items vs `path:` references, `paths:` globs, label names, how entries are commented, how files are named. Copy the nearest existing file of the same kind as your template and keep its field order. Look for an existing file that already does part of the job before creating a new one; two profiles that set the same key, or two policies that check the same thing, are a reviewer's problem.
3. **Check whether the folder you're writing into is already covered by a `paths:` glob** in the fleet file (Home loads `paths: ../platforms/**/policies/**/*.yml`). If it is, dropping the file in is enough. If not, add a `path:` entry. A file nobody references does nothing. Overlapping globs that match the same file fail GitOps as ambiguous.
4. **Confirm the scope.** The user names it ("Home", "all Macs", "engineering"); you map it to fleet files plus labels. When a request could mean more than one fleet, say which you picked and why rather than guessing silently.

## Where things go

| You need to…                                                       | Mechanism                                                                                                                                               | Lives in                                                             | Read first                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Check a condition and track compliance, optionally remediate       | `policies:` item (osquery SQL plus `resolution`), with `run_script`, `install_software`, or `resend_configuration_profile`                              | fleet file, or `default.yml` for a global policy without automations | [references/queries.md](references/queries.md)                   |
| Collect data on a schedule                                         | `reports:` item                                                                                                                                         | `default.yml` or fleet file                                          | queries.md                                                       |
| Target a subset of hosts                                           | `labels:` (dynamic SQL, manual host list, or host-vitals criteria), then `labels_include_any` / `labels_include_all` / `labels_exclude_any` on the item | `default.yml` (global) or fleet file                                 | queries.md                                                       |
| Install, update, or make software self-service                     | `software:` with `fleet_maintained_apps` (check the catalog first), `packages`, or `app_store_apps`; a `type: patch` policy keeps it current            | fleet file only                                                      | [references/software.md](references/software.md)                 |
| Fix a CVE                                                          | identify the affected title, then the software row above                                                                                                | fleet file                                                           | software.md                                                      |
| Configure macOS, iOS, or iPadOS                                    | `.mobileconfig` or DDM `.json` listed under `controls.apple_settings.configuration_profiles`                                                            | fleet file (`default.yml` covers unassigned hosts)                   | [references/profiles-apple.md](references/profiles-apple.md)     |
| Configure Windows                                                  | SyncML `.xml` listed under `controls.windows_settings.configuration_profiles`                                                                           | same                                                                 | [references/profiles-windows.md](references/profiles-windows.md) |
| Configure Android                                                  | Android Management API Policy `.json` listed under `controls.android_settings.configuration_profiles`                                                   | same                                                                 | [references/profiles-android.md](references/profiles-android.md) |
| Run a script from a policy or on demand                            | script file listed in `controls.scripts`                                                                                                                | fleet file                                                           | queries.md                                                       |
| OS update deadlines, disk encryption, setup experience, enrollment | `controls` keys (`macos_updates`, `windows_updates`, `enable_disk_encryption`, `setup_experience`, …)                                                   | fleet file; a few keys are `default.yml` only                        | yaml-files doc, `controls`                                       |
| Org name, SSO, Apple Business Manager, VPP, webhooks, integrations | `org_settings`                                                                                                                                          | `default.yml` only                                                   | yaml-files doc, `org_settings`                                   |

Software management and label-scoped profiles and software need Fleet Premium; on Fleet Free the `software:` section is skipped entirely.

Before authoring a profile, policy, script, or label from scratch, look for a vetted example in Fleet's guides at https://fleetdm.com/guides (CIS benchmark policies and profiles for macOS and Windows, Apple and Android profiles, DDM declarations, rollout-ring labels, Windows Update CSPs, and platform scripts). Fetch the raw file, copy it into this tree's layout and naming (see [fleet/README.md](../../../README.md) for how vendored CIS content lands), adapt it, and say in your report where it came from.

## Rules the repo can't show you

These are enforced by `fleetctl gitops` or by Fleet, and are the usual reasons a reasonable-looking change fails the dry run or deploys and does nothing:

- **Omitting a key clears it.** A top-level key missing from a file (`policies`, `reports`, `controls`, `agent_options`, …) means "delete everything in this section," not "leave it alone"; `custom_host_vitals` omitted deletes every vital. Edit sections in place and never drop a key to skip it (that's why `default.yml` and the fleet files keep empty sections as bare keys).
- **Paths are relative to the file that contains them.** From `default.yml` that's `./platforms/...`; from `fleets/home.yml` it's `../platforms/...`; a policy's `run_script.path` is relative to the policy file. `path:` names one file and can't contain `*`, `?`, `[`, or `{`; `paths:` is a glob, and every option on that entry (labels, `self_service`, …) applies to all matched files.
- **Labels must exist before they're referenced.** Every name in a `labels_*` list must be declared in a `labels:` section (global in `default.yml`, or in that fleet's file), unless this instance manages labels in the UI, in which case the label must already exist there. Built-in labels (`macOS`, `MS Windows`, `All Linux`, `iOS`, …) can't be referenced; use `platform` instead. Profiles and policies take at most one include list (`labels_include_all` or `labels_include_any`) plus at most one exclude list (`labels_exclude_any`, or `labels_exclude_all` on policies); software takes only one of `labels_include_all`, `labels_include_any`, or `labels_exclude_any`; reports take only an include list. No label can be in both an include and an exclude list. Label keys go on each item, not on the `policies:` list. Renaming a label deletes and recreates it, so membership is empty until hosts check in.
- **Automations are fleet-scoped.** `run_script`, `install_software`, `resend_configuration_profile`, and `calendar_events_enabled` only work on policies in a fleet file (or `unassigned.yml`), and the script, package, Fleet-maintained app, or profile they point at must be defined in that same fleet's `controls.scripts`, `software`, or `controls` section.
- **File roles are fixed.** `org_settings` only in `default.yml`; `software:` only in fleet files; `agent_options` and `reports` not in `unassigned.yml`; each fleet file's `name` must be unique.
- **Quote anything YAML would mangle.** `version: "1.2"`, `app_store_id: "361285480"`, `auto_update_window_start: "21:00"` (unquoted `21:00` parses as the integer 75600), and names containing colons or emoji. Label and report names must be ASCII; fleet names may use emoji.
- **Secrets never land in git.** The tree already uses `$VARIABLE` placeholders that CI substitutes (`$FLEET_URL`, `$FLEET_GLOBAL_ENROLL_SECRET`, `$FLEET_HOME_ENROLL_SECRET` are GitLab CI/CD variables). Follow that pattern and tell the user which new CI variable to add. Inside scripts and profiles, `$FLEET_SECRET_NAME` is a secret stored in Fleet and `$FLEET_VAR_HOST_…` is a per-host value Fleet fills in at delivery. A dry run skips any profile containing `$FLEET_SECRET_`, so say so when it applies.
- **Naming.** The product says "fleet" where the API and some keys still say `team`, and "report" where older YAML says `queries`. Use the new words in prose and new files; keep the existing keys in files you edit.

## Validate before you report

Validation is what makes an agent-written change safe to merge. Run these in order and report exactly what ran:

1. **Static checks.** From the repo root, run the validator that ships beside this file:
   ```bash
   python3 fleet/.agents/skills/fleet-gitops/scripts/validate.py fleet
   ```
   It parses every YAML file, resolves every `path:` and `paths:`, checks label references, policy, report, and label fields, osquery table names and platforms against Fleet's schema, Fleet-maintained app slugs against the catalog, software quoting rules, and the structure of every `.mobileconfig`, DDM `.json`, Windows `.xml`, and Android `.json`. Fix every FAIL; carry each WARN into your report. `--help` lists options such as `--table <name>` for an osquery schema lookup. If the script isn't present, do the same checks by hand with the commands in the reference files.
2. **Schema checks for profiles**, per the platform reference: `contour profile validate --strict` and `contour profile ddm validate` for Apple when contour is installed, the DDF node lookup for Windows, the Policy discovery document for Android. These catch invented keys and wrong value types that static checks can't.
3. **Server dry run**, if `fleetctl` is installed and configured against the right instance, exactly the way CI runs it, from `fleet/`:
   ```bash
   fleetctl gitops -f default.yml -f fleets/*.yml --dry-run
   ```
   This is the same gate the MR's CI pipeline runs. If fleetctl isn't configured, say that the MR's CI dry run is the remaining gate; don't ask the user for an API token, and never run the command without `--dry-run`. Applying is CI's job after a human merges, never the agent's.

Never describe a validation you didn't run, and quote the relevant output when something fails. A clean static pass plus a dry run is strong evidence; a profile that only looks right is not.

## Reviewing someone else's change

Run the validator on the branch, read the diff, and check what tools can't: does the change address the request rather than its wording, is the scope right (fleets and labels), does it overlap or conflict with an existing profile or policy, are identifiers and names unique, did a secret or an environment-specific URL get hardcoded, and for Windows, do the target hosts meet the node's edition and build applicability.

## Report

End with a short summary a reviewer can act on: which files changed and why; which fleets and labels the change targets; each validation you ran with its result; what wasn't validated and why (no fleetctl config, profile skipped by dry run, enum value only checkable on device); and any CI variable the user must add.
