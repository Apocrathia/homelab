# defaults: tailscale role variables

`main.yml` holds the join auth key (no default; CI injects it from 1Password),
the device tag applied at join time, and the policy calls: no subnet routes,
keep the LAN resolver instead of MagicDNS.

> **Navigation**: [← Back to tailscale README](../README.md)
