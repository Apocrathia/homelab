# -----------------------------------------------------------------------------
# Okta sign-on policy
# -----------------------------------------------------------------------------
# One custom sign-on policy (higher priority than the system default) with a
# rule per entry of var.rules, evaluated by rule priority. Wire network zone
# ids in from the okta-network-zone unit via a terragrunt dependency.

# Everyone stays in the policy's people condition: Okta defaults custom sign-on
# policies to Everyone, and leaving it undeclared plans a removal every run.
data "okta_group" "everyone" {
  name = "Everyone"
  type = "BUILT_IN"
}

resource "okta_policy_signon" "this" {
  name        = var.policy_name
  description = var.policy_description
  status      = var.policy_status
  priority    = var.policy_priority

  groups_included = [data.okta_group.everyone.id]
}

resource "okta_policy_rule_signon" "this" {
  for_each = var.rules

  policy_id = okta_policy_signon.this.id

  name     = each.value.name
  status   = each.value.status
  priority = each.value.priority
  access   = each.value.access

  network_connection = each.value.network_connection
  network_includes   = each.value.network_connection == "ZONE" ? each.value.network_includes : null

  mfa_required        = each.value.mfa_required
  mfa_prompt          = each.value.mfa_prompt
  mfa_lifetime        = each.value.mfa_lifetime
  mfa_remember_device = each.value.mfa_remember_device

  primary_factor     = each.value.primary_factor
  session_idle       = each.value.session_idle
  session_lifetime   = each.value.session_lifetime
  session_persistent = each.value.session_persistent
}
