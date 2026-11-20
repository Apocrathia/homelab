# dns: Cloudflare DNS deployment

Terragrunt unit for the public DNS records: sources `modules/cloudflare-dns`,
pulls the Cloudflare token from 1Password Connect, and leaves cert-manager
challenge records alone. The lockfile pins provider versions.

> **Navigation**: [← Back to cloudflare: Cloudflare deployment](../README.md)
