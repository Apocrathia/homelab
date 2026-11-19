# deployments: Terragrunt deployment units

One directory per infrastructure domain: `cloudflare`, `gitlab`, `okta`,
`proxmox`, and `tailscale`. The units compose the shared modules from
`../modules/` and pull provider credentials from 1Password Connect.

> **Navigation**: [← Back to Terraform README](../README.md)
