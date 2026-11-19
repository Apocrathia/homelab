# providers — Terragrunt provider generators

One HCL file per vendor (cloudflare, gitlab, okta, proxmox, tailscale) that
generates the deployment's `provider.tf`: the 1Password Connect ephemeral auth
chain, no vendor tokens in the environment, no vault UUIDs in git.

> **Navigation**: [← Back to Terraform README](../README.md)
