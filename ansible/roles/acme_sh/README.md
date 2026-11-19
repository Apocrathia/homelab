# acme_sh: ACME certificates via acme.sh

Clones and installs acme.sh, then issues a per-host Let's Encrypt certificate
for `acme_sh_domain` over DNS-01 with a Cloudflare token (1Password Connect
in CI, `-e` locally). The issued certificate lands where the nginx_site role
expects it.

> **Navigation**: [← Back to roles README](../README.md)
