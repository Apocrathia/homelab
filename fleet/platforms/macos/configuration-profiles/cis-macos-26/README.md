# CIS macOS 26 Tahoe — MDM profiles

Vendored from Fleet
[`ee/cis/macos-26/test/profiles`](https://github.com/fleetdm/fleet/tree/main/ee/cis/macos-26/test/profiles)
(CIS Apple macOS 26 Tahoe Benchmark v1.0.0). Filenames are CIS control IDs
(e.g. `2.2.1-and-2.2.2.mobileconfig`).

These files are **not** applied until listed under
`controls.apple_settings.configuration_profiles` in a fleet YAML (e.g.
`fleets/home.yml`). Assessment policies live in
`platforms/macos/policies/cis-macos-26-l1.yml`.

Guide: [CIS Benchmarks](https://fleetdm.com/guides/cis-benchmarks).
