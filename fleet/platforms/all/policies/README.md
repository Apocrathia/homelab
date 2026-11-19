# Policies (all platforms) — osquery checks shared by every fleet

Holds `fleet-dm-was-here.yml`: it fails when the "Fleet DM Was Here" Desktop
marker is missing and triggers the script in `../scripts/`. Home loads this
tree through the `paths: ../platforms/**/policies/**/*.yml` glob in
`fleets/home.yml`.

> **Navigation**: [← Back to cross-platform assets](../README.md)
