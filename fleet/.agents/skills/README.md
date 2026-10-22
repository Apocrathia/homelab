# Vendored fleet-gitops skill

The `fleet-gitops` skill under this directory is vendored from
[github.com/fleetdm/fleet](https://github.com/fleetdm/fleet) so the Fleet
GitOps workflow and its validator travel with the `fleet/` tree. `scripts/` and
`references/` keep upstream bytes; `SKILL.md` is hand-adapted for this tree.

## Provenance

- Upstream: `.claude/skills/fleet-gitops` in github.com/fleetdm/fleet
- Pinned: upstream commit
  [`53b0c0e41e414e9d2c5d83f97d909ef4a95917a0`](https://github.com/fleetdm/fleet/commit/53b0c0e41e414e9d2c5d83f97d909ef4a95917a0)
  of `main` (2026-10-22; upstream ships `.claude` agents on `main`, no tag)
- `scripts/validate.py` is a byte-identical upstream copy, sha256
  `d565557063d6225b9799474b4563de1cfd613786ebaad4ca8df51496e90ad4bd`
- `references/` near-verbatim upstream, with exactly these adaptations:
  - `profiles-apple.md` lines 9/12/13: `../lib/macos/...` →
    `../platforms/macos/...`
  - `profiles-android.md` line 9: `../lib/android/...` →
    `../platforms/android/...`
- `SKILL.md` hand-adapted for this tree (paths and CI pointers); stays
  prettier-clean.

Byte-identity is protected: `scripts/` and `references/` are excluded from
prettier (see repo `.prettierignore`) — upstream bytes win over formatting.
Gitleaks and `detect-private-key` still scan every file.

## Refresh

1. Re-fetch `fleet-gitops/` from upstream (github.com/fleetdm/fleet,
   `.claude/skills/fleet-gitops`) at a new pinned `main` commit; record the
   new SHA in Provenance.
2. Re-apply the documented adaptations above (the `../lib/` →
   `../platforms/` path fixes in `profiles-apple.md` and
   `profiles-android.md`), and re-merge upstream `SKILL.md` changes into the
   hand-adapted copy.
3. Re-verify `scripts/validate.py` against the sha256 pinned above; if
   upstream changed it, update the pin and this README together.
