# ---------------------------------------------------------------------------
# Adoption imports — adopt the live blueprint-era objects IN PLACE: no
# companion deletes, no deletion window, uuids intact, no re-login. After
# the first apply the import blocks go INERT (tofu then treats the objects
# as plain managed state) and are safe to keep forever.
#
# Gating recipe (proven on tofu 1.10.8, module-as-root):
#   - count on an import block is REJECTED ("Unsupported argument").
#   - an ungated import targeting a count=0 resource FAILS plan
#     ("Configuration for import target does not exist") even with an
#     empty id — so count-gated resources below use for_each as a pure
#     on/off gate with a STATIC to (a keyed each.key against a count
#     resource is an address mismatch: ["g"] vs [0]).
#   - an ungated import with an EMPTY id against an always-present target
#     is silently skipped by tofu and a fresh create is planned — that IS
#     the blip tier behavior. (adoption=true + empty ids is a loud
#     variable-validation failure instead; see variables.tf.)
# ---------------------------------------------------------------------------

# Always-present targets (the application and the admins binding exist in
# every shape): ungated, id = var.
import {
  to = authentik_application.app
  id = var.import_application_id
}

import {
  to = authentik_policy_binding.admins
  id = var.import_binding_admins_pk
}

# Count-gated targets: for_each keyed to the resource's own condition,
# static to, id = var.
import {
  for_each = var.mode == "proxy" ? toset(["g"]) : toset([])
  to       = authentik_provider_proxy.app[0]
  id       = var.import_provider_pk
}

import {
  for_each = var.mode == "oidc" ? toset(["g"]) : toset([])
  to       = authentik_provider_oauth2.app[0]
  id       = var.import_provider_pk
}

import {
  for_each = var.mode == "proxy" ? toset(["g"]) : toset([])
  to       = authentik_outpost.app[0]
  id       = var.import_outpost_uuid
}

import {
  for_each = var.shared ? toset(["g"]) : toset([])
  to       = authentik_policy_binding.users[0]
  id       = var.import_binding_users_pk
}
