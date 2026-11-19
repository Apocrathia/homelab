# defaults: acme_sh role variables

`main.yml` sets the cert domain, SANs, the Let's Encrypt issuer pin, the
Cloudflare DNS-01 provider, and the fixed 120s DNS sleep. The Cloudflare token
has no default; CI injects it from 1Password.

> **Navigation**: [← Back to acme_sh: ACME certificates via acme.sh](../README.md)
