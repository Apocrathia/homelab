# playbooks: Ansible entry points

`site.yml` imports the thinner playbooks: common baseline, kopia backups, the
game host, and ollama. `bootstrap.yml` is the day-0 play that creates the login
user before key auth exists.

> **Navigation**: [← Back to Ansible README](../README.md)
