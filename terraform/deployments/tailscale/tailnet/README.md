# tailnet: Tailscale tailnet deployment

Terragrunt unit managing the whole tailnet: `policy.hujson` (imported verbatim
from the live policy; tailscale_acl overwrites the entire file), DNS with the
ControlD resolvers, and tailnet settings. OAuth client credentials come from
1Password Connect.

> **Navigation**: [← Back to tailscale: Tailscale deployment](../README.md)
