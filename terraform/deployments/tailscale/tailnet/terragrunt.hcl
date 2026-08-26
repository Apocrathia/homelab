# -----------------------------------------------------------------------------
# Tailscale tailnet
# -----------------------------------------------------------------------------
# Policy file, DNS, and tailnet settings for taila8ef8c.ts.net
# (custom domain tailnet.apocrathia.com).
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
  dns_search_paths       = ["tailnet.apocrathia.com"]
  dns_split_dns          = {}

  acls_externally_managed_on = true
  acls_external_link         = "https://gitlab.com/Apocrathia/homelab/-/blob/main/terraform/deployments/tailscale/tailnet/policy.hujson"
}
