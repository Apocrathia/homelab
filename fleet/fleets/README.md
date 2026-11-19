# Fleets — one YAML file per fleet

`home.yml` defines the Home fleet: policy and script globs, controls (disk
encryption, IdP-backed setup experience), Fleet-maintained apps, and the enroll
secret. `gitops.sh` applies with `--delete-other-fleets`, so a fleet missing
from this directory is deleted in Fleet.

> **Navigation**: [← Back to Fleet GitOps config](../README.md)
