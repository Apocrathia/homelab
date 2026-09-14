# tailscale

Joins a Debian host to the tailnet (`taila8ef8c.ts.net`) as a tagged
device with zero subnet routes (A-prime: the tailnet never carries LAN
routes).

## Key defaults

- `tailscale_accept_dns: false` — the host keeps its LAN resolver.
  MagicDNS would route DNS through the tailnet's global resolver, which
  cannot resolve LAN-only names (broke kopia's `storage.services.*`
  endpoint). Desktop hosts that want MagicDNS and `*.ts.net` names can
  override per-host: set `tailscale_accept_dns: true` in `host_vars`.
- `tailscale_tags: []` — no tag, no join. Tag must exist in
  `terraform/deployments/tailscale/tailnet/policy.hujson` tagOwners.
- Auth key arrives via CI (`ansible/ci/fetch_op_secrets.py`,
  `-e @op_secrets.json`); local runs pass `-e tailscale_authkey=...`.
  Reusable, pre-authorized, tag-scoped key in vault `Secrets`.

## What it asserts

- No routes, no exit node — the apply fails if the host advertises any
  (structural A-prime enforcement).
- Join re-runs on tag drift or accept-dns drift (live `CorpDNS` vs
  desired), so preference changes are self-healing.
