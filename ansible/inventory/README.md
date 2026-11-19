# inventory — Ansible hosts and groups

`hosts.yml` defines the desktops and servers plus the purpose-group opt-ins
(kopia, ollama) that the playbooks target. Non-secret vars live in `group_vars/`
and `host_vars/`; secrets stay in 1Password.

> **Navigation**: [← Back to Ansible README](../README.md)
