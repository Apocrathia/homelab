# tasks: acme_sh role logic

`main.yml` fails loudly on a missing domain or Cloudflare token, installs cron
and git, clones acme.sh from upstream, and issues the cert via DNS-01 with an
install-cert reload hook.

> **Navigation**: [← Back to acme_sh: ACME certificates via acme.sh](../README.md)
