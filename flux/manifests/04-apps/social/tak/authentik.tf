# OpenTAKServer LDAP stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (ProviderConfig + Workspace, ns tak); authentik.tf is the single source
# of truth for the HCL. kustomization.yaml stitches them at build time —
# configMapGenerator packages this file and the replacements rule copies
# its bytes into spec.forProvider.module (source: Inline, module: ""
# placeholder), so the rendered module stays byte-identical to this file.
# Never render this directory outside kustomize.
#
# UNIT (retired authentik-blueprint.yaml, ConfigMap authentik-blueprint-tak-ldap):
# the LDAP auth path OTS's WebUI logins and ATAK enrollment bind against —
# the authentik objects the generic-app chart cannot render. The chart's
# own tofu workspace (tak-authentik, chart-rendered) owns the WebUI proxy
# stack; this pair owns the LDAP provider, the dedicated LDAP outpost
# pinned to ns tak (operator decision — the tak CNPs lock 3389/6636 to
# tak-namespace pods), the tak_admin group, and the group bindings that
# gate LDAP bind/search access (the LDAP provider has no search_group
# field in authentik 2026.8; the outpost checks application access
# against the tak-ldap slug, so the app's group bindings ARE the
# friends-tier restriction).
#
# ADOPTION (blueprint-created objects, live and NOT in tofu state): every
# object here is LIVE — this workspace ADOPTS the full set via gated
# imports, no cleanup companion (the retired authentik-blueprint-tak-ldap
# ConfigMap prunes away and the live objects survive for this workspace to
# take over). Adopt-only, never fresh-create: deleting/recreating the
# provider breaks OTS binds mid-flight, and recreating the outpost would
# try to re-render its k8s objects into the wrong namespace pattern.
#
# LIVE-VERBATIM CONTRACT: tofu models FULL attribute sets (blueprint
# updates were partial). Every field the provider's Read writes into state
# is either declared here live-verbatim (flow background/compatibility
# mode, stage case_insensitive_matching, binding evaluate_on_plan /
# re_evaluate_policies, outpost config) or provably equal to the provider
# default (omitted, commented inline). The bind flow must stay MFA-less:
# mfa_support=false + no MFA stage in the flow — the outpost's flow
# executor cannot answer interactive MFA, and would submit the bind
# secret as a TOTP code.
#
# GATE (recipe §8): the merge-gate varmap carries adoption:true + the
# generated ids ONCE. Witness ids are GATE-TIME ONLY — NEVER in git; if
# the state Secret is ever lost, re-run the gate with fresh ids from the
# live DB. Ungated imports are static literals only: the flow imports by
# slug, the application by slug.

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
  # House convention for in-cluster Authentik consumers (the tak LDAP
  # outpost included): the public gateway hostname. The provider appends
  # /api/v3 itself.
  url = "https://auth.gateway.services.apocrathia.com"

  # Token file written by the ProviderConfig credentials array.
  token = file("authentik-token")
}

# Blueprint !Find lookups become data sources. Authentik ships these
# stages with every install, so they pre-exist any apply: the stock
# password stage the bind identification stage reuses, and the stock
# login stage the order-100 binding reuses.
data "authentik_stage" "password" {
  name = "default-authentication-password"
}

data "authentik_stage" "login" {
  name = "default-authentication-login"
}

# Stock invalidation flow (upstream-shipped): the LDAP provider's
# unbind_flow. Authentik ships it with every install.
data "authentik_flow" "invalidation" {
  slug = "default-invalidation-flow"
}

# The in-cluster service connection the outpost deploys through (the same
# one every LDAP/proxy outpost uses).
data "authentik_service_connection_kubernetes" "local" {
  name = "Local Kubernetes Cluster"
}

# App-access-tier groups (adopted by the app-access system unit): the
# friends-tier bind/search restriction rides group bindings on the
# tak-ldap application. include_users=false keeps member lists out of the
# state Secret.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

data "authentik_group" "users" {
  name          = "users"
  include_users = false
}

# Bind flow: an authentication-designation flow WITHOUT an MFA stage —
# the outpost's flow executor cannot answer interactive MFA challenges,
# and with mfa_support disabled it would submit the bind secret as a
# TOTP code. Reuses the stock credential and login stages (data sources
# above). background="" and compatibility_mode=false are live-verbatim
# (live row values; the TF schema defaults are the stock background image
# URL and true — omitted they would plan a rewrite). authentication
# (none), denied_action (message_continue), layout (stacked) and
# policy_engine_mode (any) are omitted: live == TF defaults.
resource "authentik_flow" "bind" {
  name        = "TAK LDAP bind flow"
  title       = "TAK LDAP bind"
  slug        = "tak-ldap-bind"
  designation = "authentication"

  background         = ""
  compatibility_mode = false
}

# Bind identification stage: username-only, case-insensitive, with the
# stock password stage. case_insensitive_matching is live-verbatim (live
# true; the TF field has NO default — omitting plans a wipe to false).
# Omitted fields match live == TF defaults: show_matched_user (t),
# pretend_user_exists (t), show_source_labels (f), enable_remember_me
# (f); webauthn_stage, captcha_stage, sources, enrollment/recovery/
# passwordless flows are all empty on the live row.
resource "authentik_stage_identification" "bind_id" {
  name = "tak-ldap-bind-identification"

  user_fields = [
    "username",
  ]

  case_insensitive_matching = true

  password_stage = data.authentik_stage.password.id
}

# Flow wiring: identification first, stock login last. Both bindings are
# live-verbatim where the TF defaults DIFFER from the live rows:
# evaluate_on_plan=false (TF default true) and re_evaluate_policies=true
# (TF default false) — omitted they would plan a rewrite on the first
# diff. invalid_response_action (retry) and policy_engine_mode (any) are
# omitted: live == TF defaults.
resource "authentik_flow_stage_binding" "identification" {
  target = authentik_flow.bind.uuid
  stage  = authentik_stage_identification.bind_id.id
  order  = 10

  evaluate_on_plan     = false
  re_evaluate_policies = true
}

resource "authentik_flow_stage_binding" "login" {
  target = authentik_flow.bind.uuid
  stage  = data.authentik_stage.login.id
  order  = 100

  evaluate_on_plan     = false
  re_evaluate_policies = true
}

# LDAP provider for OpenTAKServer. Cached modes: each bind/search
# otherwise re-executes the full authentik flow (the outpost flow executor
# measures ~600ms per round trip on this install, so a direct-mode login
# costs 2-4s). mfa_support=false — friends may not have TOTP devices, and
# the outpost would misparse semicolons in credentials as TOTP codes.
# Omitted fields match live == TF defaults: certificate/tls_server_name
# (live NULL), uid_start_number (2000), gid_start_number (4000).
resource "authentik_provider_ldap" "provider" {
  name    = "tak-ldap-provider"
  base_dn = "OU=tak,DC=ldap,DC=apocrathia,DC=com"

  bind_flow   = authentik_flow.bind.uuid
  unbind_flow = data.authentik_flow.invalidation.id

  bind_mode   = "cached"
  search_mode = "cached"
  mfa_support = false
}

# Hidden application: LDAP bind/search access is checked against this
# slug (internal/outpost/ldap/bind/direct/bind.go, verified against
# 2026.8.2 source), so it must exist and carry the group bindings below.
# Omitted fields match live == TF defaults: open_in_new_tab (f),
# meta_launch_url/meta_icon (live NULL), policy_engine_mode (any).
resource "authentik_application" "app" {
  name      = "OpenTAKServer LDAP"
  slug      = "tak-ldap"
  group     = "Social"
  meta_hide = true

  meta_publisher   = "OpenTAKServer"
  meta_description = "LDAP bind/search access for OpenTAKServer (access control only)"

  protocol_provider = authentik_provider_ldap.provider.id
}

# Dedicated LDAP outpost, pinned to the tak namespace (operator decision:
# the tak CiliumNetworkPolicies lock 3389/6636 to tak-namespace pods —
# never re-render this into the authentik-ns outpost pattern). config is
# live-verbatim: the JSON matches the live _config column key-for-key
# (jsonencode + the provider's JSON diff-suppressor compare parsed
# values, so key order does not matter — keys and values do).
resource "authentik_outpost" "outpost" {
  name = "tak-ldap-outpost"
  type = "ldap"

  service_connection = data.authentik_service_connection_kubernetes.local.id
  protocol_providers = [authentik_provider_ldap.provider.id]

  config = jsonencode({
    authentik_host          = "https://auth.gateway.services.apocrathia.com"
    authentik_host_insecure = true
    authentik_host_browser  = ""
    log_level               = "info"
    object_naming_template  = "ak-outpost-%(name)s"
    kubernetes_replicas     = 1
    kubernetes_namespace    = "tak"
    kubernetes_json_patches = {
      deployment = [
        {
          op    = "add"
          path  = "/spec/template/spec/automountServiceAccountToken"
          value = false
        }
      ]
    }
  })
}

# Role granting full-directory search. Without it the outpost limits any
# non-superuser bind to the groups that user is a member of, so OTS's
# runtime group lookups would only ever see the bind user's own groups.
# This is the documented "Search full LDAP directory" permission; global
# (role-wide) assignment equals object scope here since this is the
# cluster's only LDAP provider. Visibility is confined to this outpost —
# the OTS webui only surfaces tak_* groups.
resource "authentik_rbac_role" "search" {
  name = "tak-ldap-search"
}

resource "authentik_rbac_permission_role" "search_full_directory" {
  role       = authentik_rbac_role.search.id
  permission = "authentik_providers_ldap.search_full_directory"
}

# Bind service user for OTS's runtime group lookups (flask-ldap3-login's
# get_user_groups() opens its own connection bound with these
# credentials — direct bind covers only login). Member of `users` so the
# outpost's app access check passes; carries the search role above. The
# password never rides tofu (operator sets it in the UI from the 1P
# ldap-bind value; the provider only sends a password on create).
# Omitted fields match live == TF defaults: path (users), attributes ({}),
# email (live "").
resource "authentik_user" "bind" {
  username = "tak-ldap-bind"
  name     = "TAK LDAP bind"
  type     = "service_account"

  is_active = true

  groups = [data.authentik_group.users.id]
  roles  = [authentik_rbac_role.search.id]
}

# OTS administrator group — membership grants the OTS administrator role
# via OTS_LDAP_ADMIN_GROUP in config.yml, which maps the group NAME via
# LDAP: never rename. Name-only resource (is_superuser/attributes stay at
# provider defaults, matching live); membership is UI-managed.
resource "authentik_group" "tak_admin" {
  name = "tak_admin"
}

# Group bindings on the application — the friends-tier LDAP bind/search
# restriction (the provider has no search_group field in 2026.8; the
# outpost checks application access). Omitted fields match live == TF
# defaults: enabled (t), negate (f), failure_result (f), timeout (30).
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

resource "authentik_policy_binding" "users" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.users.id
  order  = 20
}

# ---------------------------------------------------------------------------
# ADOPTION VARIABLES — the generated-id import gate. Defaults (adoption
# false, ids empty) validate clean and leave the import blocks below
# inert. The ONLY setter is the merge-gate varmap (MR body, recipe §8):
# injected into the Workspace once, cleared after the adoption apply.
# The ids themselves NEVER appear in git.
# ---------------------------------------------------------------------------
variable "adoption" {
  description = "Merge-gate switch: adopt the live blueprint-created LDAP stack into tofu state (MR recipe §8; default off)."
  type        = bool
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  # An empty id means tofu silently skips that import and plans a
  # duplicate create — the jetkvm blink.
  validation {
    condition = !var.adoption || (
      var.import_stage_bind_id_uuid != "" &&
      var.import_binding_identification_uuid != "" &&
      var.import_binding_login_uuid != "" &&
      var.import_provider_pk != 0 &&
      var.import_outpost_uuid != "" &&
      var.import_role_uuid != "" &&
      var.import_permission_pk != 0 &&
      var.import_user_pk != 0 &&
      var.import_group_tak_admin_uuid != "" &&
      var.import_binding_admins_uuid != "" &&
      var.import_binding_users_uuid != ""
    )
    error_message = "ADOPTION GATE: adoption=true requires every generated import id (stages/bindings/outpost by uuid, provider/user/permission by pk — witness ids from the gate varmap, gate-time only, never in git). An empty id means tofu silently skips the import and plans a duplicate create."
  }

  # Gate 2: witness ids set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition = var.adoption || (
      var.import_stage_bind_id_uuid == "" &&
      var.import_binding_identification_uuid == "" &&
      var.import_binding_login_uuid == "" &&
      var.import_provider_pk == 0 &&
      var.import_outpost_uuid == "" &&
      var.import_role_uuid == "" &&
      var.import_permission_pk == 0 &&
      var.import_user_pk == 0 &&
      var.import_group_tak_admin_uuid == "" &&
      var.import_binding_admins_uuid == "" &&
      var.import_binding_users_uuid == ""
    )
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire — clear the ids or set adoption=true."
  }
}

variable "import_stage_bind_id_uuid" {
  description = "Live stage_uuid of the tak-ldap-bind-identification stage (stages import by stage_uuid, the authentik_flows_stage pk)."
  type        = string
  default     = ""
}

variable "import_binding_identification_uuid" {
  description = "Live fsb_uuid of the order-10 flow-stage binding (flow stage bindings import by their uuid)."
  type        = string
  default     = ""
}

variable "import_binding_login_uuid" {
  description = "Live fsb_uuid of the order-100 flow-stage binding (flow stage bindings import by their uuid)."
  type        = string
  default     = ""
}

variable "import_provider_pk" {
  description = "Live pk of the LDAP provider (ldap providers import by pk)."
  type        = number
  default     = 0
}

variable "import_outpost_uuid" {
  description = "Live uuid of the tak-ldap-outpost (outposts import by uuid)."
  type        = string
  default     = ""
}

variable "import_role_uuid" {
  description = "Live uuid of the tak-ldap-search rbac role (roles import by uuid)."
  type        = string
  default     = ""
}

variable "import_permission_pk" {
  description = "Live guardian row pk of the role's search_full_directory permission assignment (rbac_permission_role imports by the assigned-permission row pk)."
  type        = number
  default     = 0
}

variable "import_user_pk" {
  description = "Live pk of the tak-ldap-bind service user (users import by pk)."
  type        = number
  default     = 0
}

variable "import_group_tak_admin_uuid" {
  description = "Live authentik_core_group uuid of the tak_admin group (groups import by uuid)."
  type        = string
  default     = ""
}

variable "import_binding_admins_uuid" {
  description = "Live policy_binding uuid of the admins@10 binding on tak-ldap (policy bindings import by uuid)."
  type        = string
  default     = ""
}

variable "import_binding_users_uuid" {
  description = "Live policy_binding uuid of the users@20 binding on tak-ldap (policy bindings import by uuid)."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# ADOPTION IMPORTS. The flow imports UNGATED by slug and the application
# UNGATED by slug — both static literals (authentik_flow imports by slug,
# authentik_application imports by slug). Every GENERATED id rides the
# adoption variables above: for_each-gated (the jetkvm rule — plain
# variable-id imports blink: tofu silently skips an empty-id import and
# plans a duplicate create; count is rejected on import blocks). Default
# off (toset([])), armed once at the merge gate by the witness varmap and
# inert again while the resources are in state (tofu skips import blocks
# for in-state resources). Witness ids NEVER appear in git.
# ---------------------------------------------------------------------------
import {
  to = authentik_flow.bind
  id = "tak-ldap-bind"
}

import {
  to = authentik_application.app
  id = "tak-ldap"
}

import {
  for_each = var.adoption ? toset(["bind_id"]) : toset([])
  to       = authentik_stage_identification.bind_id
  id       = var.import_stage_bind_id_uuid
}

import {
  for_each = var.adoption ? toset(["identification"]) : toset([])
  to       = authentik_flow_stage_binding.identification
  id       = var.import_binding_identification_uuid
}

import {
  for_each = var.adoption ? toset(["login"]) : toset([])
  to       = authentik_flow_stage_binding.login
  id       = var.import_binding_login_uuid
}

import {
  for_each = var.adoption ? toset(["provider"]) : toset([])
  to       = authentik_provider_ldap.provider
  id       = tostring(var.import_provider_pk)
}

import {
  for_each = var.adoption ? toset(["outpost"]) : toset([])
  to       = authentik_outpost.outpost
  id       = var.import_outpost_uuid
}

import {
  for_each = var.adoption ? toset(["search"]) : toset([])
  to       = authentik_rbac_role.search
  id       = var.import_role_uuid
}

import {
  for_each = var.adoption ? toset(["search_full_directory"]) : toset([])
  to       = authentik_rbac_permission_role.search_full_directory
  id       = tostring(var.import_permission_pk)
}

import {
  for_each = var.adoption ? toset(["bind"]) : toset([])
  to       = authentik_user.bind
  id       = tostring(var.import_user_pk)
}

import {
  for_each = var.adoption ? toset(["tak_admin"]) : toset([])
  to       = authentik_group.tak_admin
  id       = var.import_group_tak_admin_uuid
}

import {
  for_each = var.adoption ? toset(["admins"]) : toset([])
  to       = authentik_policy_binding.admins
  id       = var.import_binding_admins_uuid
}

import {
  for_each = var.adoption ? toset(["users"]) : toset([])
  to       = authentik_policy_binding.users
  id       = var.import_binding_users_uuid
}
