# tasks: kopia role logic

`main.yml` validates the required secrets and backup paths, then imports the
install (per-distro), repository connect, policy, and schedule task files.
Credentials pass via environment, never argv. The `.keep` file only holds the
directory in git.

> **Navigation**: [← Back to kopia README](../README.md)
