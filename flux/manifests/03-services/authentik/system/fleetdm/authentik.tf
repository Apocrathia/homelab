# Fleet DM's SAML + SCIM stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (ProviderConfig + Workspace); authentik.tf is the single source of truth
# for the HCL. kustomization.yaml stitches them at build time —
# configMapGenerator packages this file and the replacements rule copies
# its bytes into spec.forProvider.module (source: Inline, module: ""
# placeholder), so the rendered module stays byte-identical to this file.
# Never render this directory outside kustomize.
#
# UNIT (retired fleet/authentik-blueprint.yaml, CM authentik-blueprint-
# fleetdm): Fleet's console SSO + device-user MDM auth + the SCIM
# backchannel — the staff SAML provider (Fleet's login path; JIT role sync
# via the Console Role mapping, Fleet Premium — ACS/audience/issuer must
# match Fleet's sso_settings), the MDM end-user provider (macOS Setup
# Assistant via ADE, Windows MDM, Linux Orbit enrollment; audience must
# equal fleet/default.yml org_settings.mdm.end_user_authentication
# .entity_id or device-setup auth breaks), the SCIM provider
# (backchannel on the fleetdm app; IdP vitals on hosts), the custom SCIM
# user mapping (Fleet's SCIM schema 400s on authentik's default mapping),
# both applications (slugs ARE the SAML metadata URLs — never rename), and
# the admins bindings. ADOPT-ONLY, NEVER CREATE, NEVER DELETE: a
# delete/recreate window kills staff SSO, device enrollment, and the
# SCIM mapping mid-flight. The Fleet-side config (fleet/default.yml
# sso_settings + entity_id, icon.svg through the CDN) is not authentik
# state and does not move.
#
# BYTE-PARITY WITH THE LIVE ROWS (psql, witnessed 2026-10-25): every attr
# either declared live-verbatim or provably equal to the TF default
# (omitted, commented inline). The plan staying at No changes is the
# correctness contract: any diff triggers the provider's UPDATE, which
# re-sends the full SAML/SCIMProviderRequest.
#
# THREE LIVE-HELD COLUMNS (TF 2026.8.0 gap, source-verified against
# .scratch/import-verify): the SAML providers' default_name_id_policy
# (live urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified — authentik's
# own default) and the SCIM provider's discovery_enabled (live true) +
# verify_certificates (live true) are API-exposed in authentik 2026.8.4
# but absent from the provider 2026.8.0 schema. Tofu UPDATEs send only
# schema fields and DRF sets only provided fields, so all three persist
# untouched on every apply; model them when a provider release grows the
# schema. The scout sheet folded these into "the SAML providers carry
# discovery_enabled" — wrong table: discovery_enabled is a SCIM-provider
# column, default_name_id_policy the SAML one.
#
# SCIM TOKEN — UI-HELD, OMITTED BY DESIGN: authentik's SCIM serializer
# keeps token write_only (extra_kwargs, authentik/providers/scim/api/
# providers.py, 2026.8.4): the API never returns it, so it can never
# enter the tofu state Secret, and an omitted token is never sent on
# UPDATE, so the Fleet API-only-user token pasted in the UI
# (fleet/README.md SCIM steps 1-2) survives every apply.
#
# HEALTH FLAG (flagged, NOT fixed — this lap is config migration): the
# Fleet SCIM sync threw scim_sync_objects ResultTimeout 5x on 2026-10-19
# (14:30-18:14, provider (pk in the gate varmap)); no error rows since — the 2026-10-25
# full syncs (01:14/05:14/09:14/13:14 UTC) run info-clean, 1 synced user
# (scimprovideruser scim_id 3). The sync path is untouched by this
# adoption; if ResultTimeouts return, debug the Fleet SCIM endpoint, not
# this file.
#
# GATE (recipe §8): the merge-gate varmap carries adoption:true + the
# seven generated ids ONCE (born-with-varmap). The two applications import
# UNGATED by slug (see the import blocks). Witness ids are GATE-TIME
# ONLY — NEVER in git; if the state Secret is ever lost, re-run the gate
# with fresh ids from the live DB.

terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.0"
    }
  }

  # PARTIAL backend (the module's versions.tf shape): the per-app args
  # (secret_suffix/namespace/in_cluster_config) come from the ProviderConfig
  # spec.backendFile — the provider writes them to crossplane.remote.tfbackend
  # and passes them via -backend-config at tofu init. The empty block MUST
  # stay: -backend-config without a backend block falls back to the LOCAL
  # backend (warning only), which reads an EMPTY state and plans a full
  # duplicate create set — the adopt-only bar dies right there.
  backend "kubernetes" {}
}

provider "authentik" {
  # House convention for in-cluster Authentik consumers: the public
  # gateway hostname. The provider appends /api/v3 itself.
  url = "https://auth.gateway.services.apocrathia.com"

  # Token file written by the ProviderConfig credentials array.
  token = file("authentik-token")
}

# Blueprint !Find lookups become data sources. authentik ships these
# flows with every install, so they pre-exist any apply.
data "authentik_flow" "provider-authorization" {
  slug = "default-provider-authorization-implicit-consent"
}

data "authentik_flow" "invalidation" {
  slug = "default-invalidation-flow"
}

# Admins-group binding source (both apps carry an admins@10 binding).
# include_users=false keeps the group's member list out of the state
# Secret (membership stays UI-managed, system/app-access contract).
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

# Signing key lookup — the house self-signed certificate (the live
# signing_kp on both SAML providers, by NAME: the uuid rides the data
# source, never git).
data "authentik_certificate_key_pair" "signing" {
  name = "authentik Self-signed Certificate"
}

# The three MANAGED SAML mappings both providers' property_mappings lists
# carry (upstream-shipped email/username/name). Looked up by MANAGED
# identifier — a stable upstream string, unambiguous (name lookups would
# also match the friendly names upstream ships). Their uuids ride the
# data sources, never git.
data "authentik_property_mapping_provider_saml" "email" {
  managed = "goauthentik.io/providers/saml/email"
}

data "authentik_property_mapping_provider_saml" "username" {
  managed = "goauthentik.io/providers/saml/username"
}

data "authentik_property_mapping_provider_saml" "name" {
  managed = "goauthentik.io/providers/saml/name"
}

# The MANAGED SCIM group mapping the SCIM provider syncs groups through
# (the user side is the custom mapping below). Managed identifier, same
# contract as the SAML pair above.
data "authentik_property_mapping_provider_scim" "group" {
  managed = "goauthentik.io/providers/scim/group"
}

# Custom SCIM user mapping — Fleet's SCIM schema rejects authentik's
# default mapping (displayName/photos/locale/name.formatted 400s);
# userName=email matches the SAML NameID so MDM enrollment maps to the
# SCIM user; familyName non-empty is a Fleet hard requirement. Expression
# live-verbatim (psql 2026-10-25).
resource "authentik_property_mapping_provider_scim" "fleetdm_user" {
  name = "Fleet DM SCIM User"

  expression = <<EOT
# Fleet requires non-empty givenName and familyName.
givenName = request.user.name or request.user.username
familyName = " "
if " " in (request.user.name or ""):
    givenName, _, familyName = request.user.name.partition(" ")

emails = []
if request.user.email:
    emails = [{
        "value": request.user.email,
        "type": "other",
        "primary": True,
    }]

return {
    "userName": request.user.email or request.user.username,
    "name": {
        "givenName": givenName,
        "familyName": familyName,
    },
    "active": request.user.is_active,
    "emails": emails,
}
EOT
}

# SCIM backchannel provider. Live-verbatim (psql 2026-10-25): url, the
# custom user mapping, the managed group mapping, and
# exclude_users_service_account — the last DECLARED because the TF schema
# has no default for it (omit = the provider sends false on UPDATE and
# wipes the live true; the token resource's expiring precedent, inverted).
# Omitted == TF defaults: auth_mode token, compatibility_mode default,
# dry_run false, sync_page_size 100, sync_page_timeout minutes=30,
# service_provider_config_cache_timeout hours=1, auth_oauth_params {},
# group_filters [] (live empty); live NULL: auth_oauth.
# Token: OMITTED (header note — write_only serializer, UI-held, never
# state, never wiped). discovery_enabled + verify_certificates: live-held
# API-only columns (header note).
resource "authentik_provider_scim" "fleetdm" {
  name = "fleetdm-scim-provider"
  url  = "https://fleet.gateway.services.apocrathia.com/api/v1/fleet/scim"

  exclude_users_service_account = true

  property_mappings = [
    authentik_property_mapping_provider_scim.fleetdm_user.id,
  ]

  property_mappings_group = [
    data.authentik_property_mapping_provider_scim.group.id,
  ]
}

# Fleet JIT role sync (Fleet Premium): on every SSO login Fleet updates
# the user's global role from FLEET_JIT_USER_ROLE_GLOBAL (accepted:
# admin, maintainer, observer, observer_plus, technician). admins →
# admin; everyone else gets no attribute (expression returns None,
# authentik omits it — existing roles stay, new JIT accounts default to
# observer). Staff provider only. Expression live-verbatim; friendly_name
# live NULL (omitted; the blueprint's "" normalized to NULL live).
resource "authentik_property_mapping_provider_saml" "console_role" {
  name       = "Fleet DM Console Role"
  saml_name  = "FLEET_JIT_USER_ROLE_GLOBAL"
  expression = <<EOT
if ak_is_group_member(request.user, name="admins"):
    return "admin"
return None
EOT
}

# Staff SAML provider — Fleet's console login path (pk in the gate
# varmap). Byte-parity with the live row (witnessed 2026-10-25).
# Declared: acs_url/audience (Fleet's SSO config), issuer_override
# "authentik" (the Fleet Authentik-guide EntityID), sp_binding post (TF
# default redirect), sign_response true (TF default false), signing_kp
# (live set; blank would wipe it), name_id_mapping (the managed email
# mapping — NameID=email so SCIM userName matches), property_mappings
# (live through-table order: email, username, name, Console Role).
# Omitted == TF defaults: sign_assertion true, assertion_valid_not_before
# minutes=-5, assertion_valid_not_on_or_after minutes=5,
# session_valid_not_on_or_after minutes=86400, digest_algorithm
# http://www.w3.org/2001/04/xmlenc#sha256, signature_algorithm
# http://www.w3.org/2001/04/xmldsig-more#rsa-sha256, logout_method
# frontchannel_iframe, sls_binding redirect; live false == default:
# sign_logout_request, sign_logout_response. Live NULL: authentication_flow
# (authentik falls back to the default authentication flow),
# default_relay_state, verification_kp, encryption_kp,
# authn_context_class_ref_mapping, sls_url. default_name_id_policy
# (urn:...unspecified) is live-held — header note.
resource "authentik_provider_saml" "fleetdm_staff" {
  name = "fleetdm-saml-provider"

  authorization_flow = data.authentik_flow.provider-authorization.id
  invalidation_flow  = data.authentik_flow.invalidation.id

  acs_url         = "https://fleet.gateway.services.apocrathia.com/api/v1/fleet/sso/callback"
  audience        = "https://fleet.gateway.services.apocrathia.com"
  issuer_override = "authentik"

  sp_binding    = "post"
  sign_response = true
  signing_kp    = data.authentik_certificate_key_pair.signing.id

  name_id_mapping = data.authentik_property_mapping_provider_saml.email.id

  property_mappings = [
    data.authentik_property_mapping_provider_saml.email.id,
    data.authentik_property_mapping_provider_saml.username.id,
    data.authentik_property_mapping_provider_saml.name.id,
    authentik_property_mapping_provider_saml.console_role.id,
  ]
}

# MDM end-user SAML provider — device-user auth (pk in the gate
# varmap): macOS Setup Assistant (ADE), Windows MDM, Linux Orbit
# enrollment. Fleet treats staff SSO and end-user auth as two SAML
# connections (one ACS URL per provider, hence the second provider);
# audience must equal org_settings.mdm.end_user_authentication.entity_id
# in fleet/default.yml or device-setup auth breaks. NameID=email so
# setup maps to SCIM users; the name mapping feeds the local account's
# full name (AccountConfiguration). Same omit-set as the staff provider
# (see its header); no Console Role (device users are not console
# users). Property mappings live through-table order: email, username,
# name.
resource "authentik_provider_saml" "fleetdm_mdm" {
  name = "fleetdm-mdm-saml-provider"

  authorization_flow = data.authentik_flow.provider-authorization.id
  invalidation_flow  = data.authentik_flow.invalidation.id

  acs_url         = "https://fleet.gateway.services.apocrathia.com/api/v1/fleet/mdm/sso/callback"
  audience        = "https://fleet.gateway.services.apocrathia.com"
  issuer_override = "authentik"

  sp_binding    = "post"
  sign_response = true
  signing_kp    = data.authentik_certificate_key_pair.signing.id

  name_id_mapping = data.authentik_property_mapping_provider_saml.email.id

  property_mappings = [
    data.authentik_property_mapping_provider_saml.email.id,
    data.authentik_property_mapping_provider_saml.username.id,
    data.authentik_property_mapping_provider_saml.name.id,
  ]
}

# The staff application — IdP-initiated SSO launch URL, admins-bound.
# Live-verbatim: name, slug, group, launch URL, icon (CDN-backed
# fleet/icon.svg — the file stays in fleet/), description, publisher,
# open_in_new_tab true (TF default false — DECLARED), protocol_provider
# (staff SAML), backchannel_providers (the SCIM provider — the ONE row).
# Omitted == TF defaults: meta_hide false, policy_engine_mode any,
# open_in_new_tab false default overridden above. The slug IS the
# metadata URL path (/application/saml/fleetdm/) — never rename it.
resource "authentik_application" "fleetdm" {
  name  = "Fleet DM"
  slug  = "fleetdm"
  group = "Home"

  meta_launch_url = "https://auth.gateway.services.apocrathia.com/application/saml/fleetdm/init/"
  open_in_new_tab = true

  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/04-apps/management/fleet/icon.svg"
  meta_description = "Device management (osquery) — inventory, queries, vulnerabilities"
  meta_publisher   = "Fleet"

  protocol_provider     = authentik_provider_saml.fleetdm_staff.id
  backchannel_providers = [authentik_provider_scim.fleetdm.id]
}

# The MDM end-user application — separate app so the device-setup
# connection has its own metadata URL (/application/saml/fleetdm-mdm/
# metadata/) and access surface; hidden from the library, SP-initiated
# only (no launch URL). Live-verbatim; meta_hide true DECLARED (TF
# default false), meta_launch_url live NULL (omitted),
# open_in_new_tab omitted (live false == TF default).
resource "authentik_application" "fleetdm_mdm" {
  name  = "Fleet DM Setup"
  slug  = "fleetdm-mdm"
  group = "Home"

  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/04-apps/management/fleet/icon.svg"
  meta_description = "Fleet MDM end-user authentication (device setup / ADE)"
  meta_publisher   = "Fleet"

  meta_hide = true

  protocol_provider = authentik_provider_saml.fleetdm_mdm.id
}

# Admins-group bindings on both apps (order-10 parity with the retired
# blueprint; exactly one binding on each app, witnessed). enabled/
# negate/failure_result/timeout == TF defaults (omitted).
resource "authentik_policy_binding" "admins_staff" {
  target = authentik_application.fleetdm.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

resource "authentik_policy_binding" "admins_mdm" {
  target = authentik_application.fleetdm_mdm.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# ---------------------------------------------------------------------------
# ADOPTION VARIABLES — the generated-id import gate. Defaults (adoption
# false, ids empty) validate clean and leave the gated import blocks below
# inert. The ONLY setter is the merge-gate varmap (MR body, recipe §8):
# injected into the Workspace once, cleared after the adoption apply.
# The ids themselves NEVER appear in git.
# ---------------------------------------------------------------------------
variable "adoption" {
  description = "Merge-gate switch: adopt the live blueprint-created Fleet DM SAML + SCIM stack into tofu state (MR recipe §8; default off)."
  type        = bool
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  # An empty id means tofu silently skips that import and plans a
  # duplicate create — the jetkvm blink.
  validation {
    condition = !var.adoption || (
      var.import_scim_mapping_uuid != "" &&
      var.import_scim_provider_pk != 0 &&
      var.import_saml_mapping_uuid != "" &&
      var.import_saml_provider_staff_pk != 0 &&
      var.import_saml_provider_mdm_pk != 0 &&
      var.import_binding_staff_uuid != "" &&
      var.import_binding_mdm_uuid != ""
    )
    error_message = "ADOPTION GATE: adoption=true requires all seven generated ids (import_scim_mapping_uuid, import_scim_provider_pk, import_saml_mapping_uuid, import_saml_provider_staff_pk, import_saml_provider_mdm_pk, import_binding_staff_uuid, import_binding_mdm_uuid — witness ids from the gate varmap, gate-time only, never in git). An empty id means tofu silently skips the import and plans a duplicate create."
  }

  # Gate 2: witness ids set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition = var.adoption || (
      var.import_scim_mapping_uuid == "" &&
      var.import_scim_provider_pk == 0 &&
      var.import_saml_mapping_uuid == "" &&
      var.import_saml_provider_staff_pk == 0 &&
      var.import_saml_provider_mdm_pk == 0 &&
      var.import_binding_staff_uuid == "" &&
      var.import_binding_mdm_uuid == ""
    )
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire — clear the ids or set adoption=true."
  }
}

variable "import_scim_mapping_uuid" {
  description = "Live pm_uuid of the Fleet DM SCIM User mapping (property mappings import by pm_uuid)."
  type        = string
  default     = ""
}

variable "import_scim_provider_pk" {
  description = "Live pk of the fleetdm-scim-provider (scim providers import by numeric pk)."
  type        = number
  default     = 0
}

variable "import_saml_mapping_uuid" {
  description = "Live pm_uuid of the Fleet DM Console Role mapping (property mappings import by pm_uuid)."
  type        = string
  default     = ""
}

variable "import_saml_provider_staff_pk" {
  description = "Live pk of the fleetdm-saml-provider (saml providers import by numeric pk)."
  type        = number
  default     = 0
}

variable "import_saml_provider_mdm_pk" {
  description = "Live pk of the fleetdm-mdm-saml-provider (saml providers import by numeric pk)."
  type        = number
  default     = 0
}

variable "import_binding_staff_uuid" {
  description = "Live uuid of the admins policy binding on the fleetdm application (policy bindings import by binding uuid)."
  type        = string
  default     = ""
}

variable "import_binding_mdm_uuid" {
  description = "Live uuid of the admins policy binding on the fleetdm-mdm application (policy bindings import by binding uuid)."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# ADOPTION IMPORTS. The seven generated ids ride for_each-gated blocks
# (the jetkvm rule — plain variable-id imports blink: tofu silently
# skips an empty-id import and plans a duplicate create; count is rejected
# on import blocks). Default off (toset([])), armed once at the merge gate
# by the witness varmap and inert again while the resources are in state
# (tofu skips import blocks for in-state resources). The APPLICATIONS
# import UNGATED by design — applications import BY SLUG and the slugs
# are static literals here, so no gate variables exist: at steady state
# the targets are already in tofu state and the blocks are no-ops; if the
# state Secret is ever lost, they re-adopt the application rows
# automatically on the next plan. Witness ids NEVER appear in git.
# ---------------------------------------------------------------------------
import {
  to = authentik_application.fleetdm
  id = "fleetdm"
}

import {
  to = authentik_application.fleetdm_mdm
  id = "fleetdm-mdm"
}

import {
  for_each = var.adoption ? toset(["m"]) : toset([])
  to       = authentik_property_mapping_provider_scim.fleetdm_user
  id       = var.import_scim_mapping_uuid
}

import {
  for_each = var.adoption ? toset(["p"]) : toset([])
  to       = authentik_provider_scim.fleetdm
  id       = tostring(var.import_scim_provider_pk)
}

import {
  for_each = var.adoption ? toset(["m"]) : toset([])
  to       = authentik_property_mapping_provider_saml.console_role
  id       = var.import_saml_mapping_uuid
}

import {
  for_each = var.adoption ? toset(["p"]) : toset([])
  to       = authentik_provider_saml.fleetdm_staff
  id       = tostring(var.import_saml_provider_staff_pk)
}

import {
  for_each = var.adoption ? toset(["p"]) : toset([])
  to       = authentik_provider_saml.fleetdm_mdm
  id       = tostring(var.import_saml_provider_mdm_pk)
}

import {
  for_each = var.adoption ? toset(["b"]) : toset([])
  to       = authentik_policy_binding.admins_staff
  id       = var.import_binding_staff_uuid
}

import {
  for_each = var.adoption ? toset(["b"]) : toset([])
  to       = authentik_policy_binding.admins_mdm
  id       = var.import_binding_mdm_uuid
}
