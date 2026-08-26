output "policy_id" {
  description = "Okta id of the sign-on policy"
  value       = okta_policy_signon.this.id
}

output "rule_ids" {
  description = "Map of rules keys to sign-on rule ids"
  value       = { for k, rule in okta_policy_rule_signon.this : k => rule.id }
}
