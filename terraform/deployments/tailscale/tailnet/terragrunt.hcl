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
  dns_override_local_dns = false
  # No search paths: the tailnet search domain only resolved via the retired
  # public wildcard record.
  dns_search_paths = []
  dns_split_dns    = {}

  # Split DNS for the homelab app zone (tailnet split DNS plan, slice 1).
  # Restricted nameserver for gateway.services.apocrathia.com -> the
  # tailnet-dns resolver device (flux/manifests/03-services/tailnet-dns).
  # The nameserver must be an IP, and the device IP only exists after the
  # resolver's first rollout, so this stays off until then:
  #   1. Deploy the tailnet-dns Flux Kustomization.
  #   2. Read the device IP: `kubectl -n tailnet-dns get svc tailnet-dns`
  #      (EXTERNAL-IP), or the tailnet-dns device in the admin console.
  #   3. Replace the empty dns_split_dns map above with the block below
  #      (uncommenting this block as-is creates a duplicate attribute and
  #      breaks the HCL parse), set the IP, then apply.
  # The device IP is stable across restarts (operator-persisted proxy
  # state), so this is one-time. Admin-console equivalent: DNS -> Add
  # nameserver -> Custom -> gateway.services.apocrathia.com + device IP.
  # dns_split_dns = {
  #   "gateway.services.apocrathia.com" = ["100.x.y.z"]
  # }

  acls_externally_managed_on = true
  acls_external_link         = "https://gitlab.com/Apocrathia/homelab/-/blob/main/terraform/deployments/tailscale/tailnet/policy.hujson"
}
