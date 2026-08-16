# -----------------------------------------------------------------------------
# Tailscale policy
# -----------------------------------------------------------------------------
# Import the existing tailnet policy before the first apply. The provider
# credentials come from the generated provider.tf.

resource "tailscale_acl" "this" {
  acl = var.policy

  overwrite_existing_content = false
  reset_acl_on_destroy       = false
}
