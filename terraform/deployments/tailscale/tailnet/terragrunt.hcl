# -----------------------------------------------------------------------------
# Tailscale tailnet
# -----------------------------------------------------------------------------
# Policy file, DNS, and tailnet settings for taila8ef8c.ts.net.
#
# Auth (1Password Connect — no TAILSCALE_* tokens in env):
#   OP_CONNECT_HOST  — http://onepassword-connect.onepassword-system.svc:8080
#   OP_CONNECT_TOKEN — Connect API token with read on the vault
#   TF_HTTP_*        — state backend
#
# Item: tailscale-terraform-secrets (API Credential: username = OAuth client
# ID, credential = client secret; section "dns" field "nextdns-id" = NextDNS
# profile ID, used to derive the tailnet's global resolver). Do NOT commit
# vault UUIDs.
#
# policy.hujson is imported verbatim from the live tailnet policy; keep it
# byte-identical to intent — tailscale_acl overwrites the WHOLE policy file.

include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/providers/tailscale.hcl"
}

terraform {
  source = "../../../modules/tailscale-tailnet"
}

inputs = {
  onepassword_vault_name                 = "Secrets"
  onepassword_tailscale_token_item_title = "tailscale-terraform-secrets"

  acl_policy = file("${get_terragrunt_dir()}/policy.hujson")

  dns_magic_dns          = true
  dns_override_local_dns = true
  # No search paths: the tailnet search domain only resolved via the retired
  # public wildcard record.
  dns_search_paths = []
  # Split DNS for the homelab zones (tailnet split DNS plan, slice 3,
  # broadened from gateway.services.apocrathia.com to the LAN zones):
  # restricted nameserver -> the tailnet-dns resolver device
  # (flux/manifests/03-services/tailnet-dns). CoreDNS serves the app zone
  # (gateway.services...) from etcd via longest-suffix match and forwards
  # LAN-only names - services names to the services VLAN resolver
  # (10.100.1.1), the access zone to the access VLAN resolver (10.100.0.1).
  # Device IP read post-rollout via
  # `kubectl -n tailscale-system exec sts/<ts-tailnet-dns-*> -- tailscale ip -4`.
  # The IP is stable across restarts (operator-persisted proxy state), so
  # this is one-time. Admin-console equivalent: DNS -> Add nameserver ->
  # Custom -> one entry per zone (services.apocrathia.com,
  # access.apocrathia.com, game.apocrathia.com) + device IP.
  dns_split_dns = {
    # Access VLAN zone: same resolver device; CoreDNS forwards the zone to
    # that VLAN's own resolver (10.100.0.1; hosts live under
    # <name>.access.apocrathia.com).
    "access.apocrathia.com" = ["100.76.213.107"]
    # Services zone: same resolver device; CoreDNS forwards LAN-only names
    # to the services VLAN resolver (10.100.1.1) - the etcd app zone answers
    # app names, and game.services.apocrathia.com is a static tailnet record
    # (flux/manifests/03-services/tailnet-dns/coredns.yaml).
    "services.apocrathia.com" = ["100.76.213.107"]
    # Game host zone: same resolver device; CoreDNS serves a static A record
    # for game.apocrathia.com pointing at the host's tailnet address.
    "game.apocrathia.com" = ["100.76.213.107"]
  }

  acls_externally_managed_on = true
  acls_external_link         = "https://gitlab.com/Apocrathia/homelab/-/blob/main/terraform/deployments/tailscale/tailnet/policy.hujson"
}
