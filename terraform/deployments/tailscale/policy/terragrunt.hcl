# -----------------------------------------------------------------------------
# Tailscale tailnet policy
# -----------------------------------------------------------------------------
# Required env:
#   OP_CONNECT_HOST  — http://onepassword-connect.onepassword-system.svc:8080
#   OP_CONNECT_TOKEN — Connect API token with read on the vault
#   TF_HTTP_*        — state backend
#
# Do NOT export TAILSCALE_OAUTH_CLIENT_ID / TAILSCALE_OAUTH_CLIENT_SECRET.
# Do NOT commit vault UUIDs.
#
# Before planning, replace the review placeholder with the intended tailnet ID
# or name. Before the first apply:
#   1. terragrunt import tailscale_acl.this acl
#   2. Replace policy.hujson with the live HuJSON, then edit
#   3. terragrunt plan — expect only intentional deltas

include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "provider" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/providers/tailscale.hcl"
}

terraform {
  source = "../../../modules/tailscale-policy"
}

inputs = {
  onepassword_vault_name                 = "Secrets"
  onepassword_tailscale_oauth_item_title = "tailscale-terraform-secrets"

  tailscale_tailnet = "REVIEW_REQUIRED_SET_TAILNET_ID_OR_NAME"
  policy            = file("${get_terragrunt_dir()}/policy.hujson")
}
