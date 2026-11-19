# ci — Ansible CI helpers

Two 1Password Connect fetchers: `fetch_op_secrets.py` materializes playbook
secrets (tailscale auth key, Cloudflare token) as extra-vars JSON, and
`fetch_op_ssh.py` writes the GitOps SSH key and known_hosts for the CI jobs.
`requirements.txt` pins ansible-core, ansible-lint, and the Connect SDK;
Renovate manages the pins.

> **Navigation**: [← Back to Ansible README](../README.md)
