# The kube-apiserver's OIDC issuer — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (ProviderConfig + Workspace); authentik.tf is the single source of truth
# for the HCL. kustomization.yaml stitches them at build time —
# configMapGenerator packages this file and the replacements rule copies
# its bytes into spec.forProvider.module (source: Inline, module: ""
# placeholder), so the rendered module stays byte-identical to this file.
# Never render this directory outside kustomize.
#
# UNIT (retired kube-auth/authentik-blueprint.yaml): provider (pk in the gate varmap) — the
# public OIDC client "kubernetes" whose per-provider issuer
# (https://auth.gateway.services.apocrathia.com/application/o/kubernetes/)
# the Talos kube-apiserver trusts (audience kubernetes, username claim
# email, groups claim groups, both oidc:-prefixed), plus its three tier
# groups, the two custom scope mappings, the hidden application, and the
# admins binding. kubectl oidc-login, headlamp, and every short-lived
# token ride it; the ClusterRoleBindings in kube-auth/rbac.yaml match the
# group names (never rename them). ADOPT-ONLY, NEVER CREATE, NEVER DELETE:
# fresh-create is a cluster-auth outage — a delete/recreate window breaks
# token validation until restored, and the issuer URL derives from the
# application SLUG, so any rename breaks cluster auth for every new token.
#
# MOST DANGEROUS FLIP IN THE TIER: the HCL below is byte-parity with the
# live provider row (psql, witnessed 2026-10-24) — every attr either
# declared live-verbatim or provably equal to the TF default (omitted,
# commented inline). The plan staying at No changes is the correctness
# contract: any diff triggers the provider's UPDATE, which re-sends the
# full OAuth2ProviderRequest.
#
# The k8s side stays in kube-auth/: rbac.yaml (the ClusterRoleBindings)
# and icon.svg (the application's meta_icon URL points at that repo path
# through the CDN) are not authentik state and do not move.
#
# GATE (recipe §8): the merge-gate varmap carries adoption:true + the
# three group uuids + the two scope-mapping uuids + the provider pk + the
# binding uuid ONCE (born-with-varmap). The application imports UNGATED
# by slug (see the import block). Witness ids are GATE-TIME ONLY — NEVER
# in git; if the state Secret is ever lost, re-run the gate with fresh
# ids from the live DB.

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
  # House convention for in-cluster Authentik consumers (kagent, the
  # tak LDAP outpost, the kube-apiserver OIDC issuer): the public
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

# Admins-group binding source, order-10 parity with the retired blueprint.
# include_users=false keeps the group's member list out of the state
# Secret.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

# Signing key lookup — the house self-signed certificate (the live signing
# key row, by NAME: the uuid rides the data source, never git).
data "authentik_certificate_key_pair" "signing" {
  name = "authentik Self-signed Certificate"
}

# The two MANAGED mappings the provider's property_mappings list must
# carry (upstream-shipped openid + profile). Looked up by MANAGED
# identifier — a stable upstream string, unambiguous (scope_name lookups
# are NOT: two live rows carry scope_name email). Their uuids ride the
# data sources, never git.
data "authentik_property_mapping_provider_scope" "openid" {
  managed = "goauthentik.io/providers/oauth2/scope-openid"
}

data "authentik_property_mapping_provider_scope" "profile" {
  managed = "goauthentik.io/providers/oauth2/scope-profile"
}

# The three tier groups the ClusterRoleBindings match by name. Name-only
# resources — the system/app-access contract: the provider's group Read
# never pulls members (IncludeUsers(false)) and an UPDATE re-sends the
# whole GroupRequest with users=[], so the plan MUST stay at No changes —
# membership (kubernetes-admins carries 1 member today) stays UI-managed
# and intact. Never edit another field on these resources without first
# deciding member handling.
resource "authentik_group" "kubernetes_admins" {
  name = "kubernetes-admins"
}

resource "authentik_group" "kubernetes_operators" {
  name = "kubernetes-operators"
}

resource "authentik_group" "kubernetes_viewers" {
  name = "kubernetes-viewers"
}

# Custom email scope mapping: email_verified is hard-True because the
# kube-apiserver rejects unverified emails and authentik never verifies
# email. Name + scope_name + description + expression live-verbatim
# (psql 2026-10-24); the upstream managed mappings stay untouched.
resource "authentik_property_mapping_provider_scope" "kubernetes_email" {
  name        = "Kubernetes Email"
  scope_name  = "email"
  description = "Email claim with verified status for Kubernetes OIDC"

  expression = <<EOT
return {
    "email": request.user.email,
    "email_verified": True,
}
EOT
}

# Groups claim scope mapping: the oidc:-prefixed group names the
# ClusterRoleBindings match (rbac.yaml). Live-verbatim.
resource "authentik_property_mapping_provider_scope" "kubernetes_groups" {
  name        = "Kubernetes Groups"
  scope_name  = "groups"
  description = "Include user groups in the token for Kubernetes RBAC"

  expression = <<EOT
return {
    "groups": [group.name for group in user.ak_groups.all()],
}
EOT
}

# Provider (pk in the gate varmap) — THE cluster OIDC issuer. Byte-parity with the live row
# (witnessed 2026-10-24). Declared: client_type public (TF default
# confidential), sub_mode user_email (default hashed_user_id),
# access_token_validity hours=1 (default minutes=10), signing_key (live
# set; blank would wipe it), the four redirect URIs, property_mappings
# and grant_types (live order/sets). Omitted == TF defaults:
# authentication_flow (live NULL — authentik falls back to the default
# authentication flow), include_claims_in_id_token (true), issuer_mode
# (per_provider), access_code_validity (minutes=1),
# refresh_token_validity (days=30), refresh_token_threshold (seconds=0),
# logout_method (backchannel), client_secret (public client: generated
# server-side, never used, Computed), encryption_key + logout_uri +
# jwt_federation_* (live NULL/empty).
resource "authentik_provider_oauth2" "kubernetes" {
  name = "kubernetes-oidc-provider"

  authorization_flow = data.authentik_flow.provider-authorization.id
  invalidation_flow  = data.authentik_flow.invalidation.id

  client_type = "public"
  client_id   = "kubernetes"

  sub_mode              = "user_email"
  access_token_validity = "hours=1"
  signing_key           = data.authentik_certificate_key_pair.signing.id

  # Live order (through-table witness): managed openid, Kubernetes
  # Groups, managed profile, Kubernetes Email — declare in this exact
  # order so no future UPDATE reshuffles the live rows.
  property_mappings = [
    data.authentik_property_mapping_provider_scope.openid.id,
    authentik_property_mapping_provider_scope.kubernetes_groups.id,
    data.authentik_property_mapping_provider_scope.profile.id,
    authentik_property_mapping_provider_scope.kubernetes_email.id,
  ]

  # kubectl oidc-login loopbacks + the headlamp cluster-UI callback.
  allowed_redirect_uris = [
    {
      url           = "http://localhost:8000"
      matching_mode = "strict"
    },
    {
      url           = "http://localhost:18000"
      matching_mode = "strict"
    },
    {
      url           = "http://127.0.0.1:8000"
      matching_mode = "strict"
    },
    {
      url           = "https://headlamp.gateway.services.apocrathia.com/oidc-callback"
      matching_mode = "strict"
    },
  ]

  # Pinned to the live default set (the blueprint never declared
  # grant_types; authentik kept its seven — device_code carries the full
  # URN in the API enum, exactly as the live row stores it). Declared so
  # no apply ever re-derives them; an empty list would break
  # authorization_code (the 2026.5+ trap) and the provider only sends
  # the field when explicitly set.
  grant_types = [
    "authorization_code",
    "hybrid",
    "implicit",
    "client_credentials",
    "password",
    "urn:ietf:params:oauth:grant-type:device_code",
    "refresh_token",
  ]
}

# The application — the slug IS the issuer path (per_provider issuer_mode:
# https://auth.gateway.services.apocrathia.com/application/o/kubernetes/);
# NEVER rename it or cluster auth breaks for every new token. Hidden from
# the library (meta_hide; headlamp is the user-facing entry), blank launch
# URL. Live-verbatim optionals; policy_engine_mode any and
# open_in_new_tab false == TF defaults (omitted). The icon URL points at
# kube-auth/icon.svg through the CDN — the file stays in kube-auth/.
resource "authentik_application" "kubernetes" {
  name            = "Kubernetes Cluster"
  slug            = "kubernetes"
  group           = "Platform"
  meta_launch_url = "blank://blank"

  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/03-services/authentik/kube-auth/icon.svg"
  meta_description = "Kubernetes cluster authentication via OIDC"
  meta_publisher   = "Kubernetes"

  meta_hide = true

  protocol_provider = authentik_provider_oauth2.kubernetes.id
}

# IMMEDIATELY after the application: an application without policies is
# open to ALL authenticated users until this binding lands. Order-10
# parity with the retired blueprint; the one binding on the app (witness:
# exactly one row). enabled/negate/failure_result/timeout == TF defaults
# (omitted).
resource "authentik_policy_binding" "admins" {
  target = authentik_application.kubernetes.uuid
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
  description = "Merge-gate switch: adopt the live blueprint-created OIDC stack into tofu state (MR recipe §8; default off)."
  type        = bool
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  # An empty id means tofu silently skips that import and plans a
  # duplicate create — the jetkvm blink.
  validation {
    condition = !var.adoption || (
      var.import_group_admins_uuid != "" &&
      var.import_group_operators_uuid != "" &&
      var.import_group_viewers_uuid != "" &&
      var.import_scope_email_uuid != "" &&
      var.import_scope_groups_uuid != "" &&
      var.import_provider_pk != 0 &&
      var.import_binding_admins_uuid != ""
    )
    error_message = "ADOPTION GATE: adoption=true requires all seven generated ids (import_group_admins_uuid, import_group_operators_uuid, import_group_viewers_uuid, import_scope_email_uuid, import_scope_groups_uuid, import_provider_pk, import_binding_admins_uuid — witness ids from the gate varmap, gate-time only, never in git). An empty id means tofu silently skips the import and plans a duplicate create."
  }

  # Gate 2: witness ids set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition = var.adoption || (
      var.import_group_admins_uuid == "" &&
      var.import_group_operators_uuid == "" &&
      var.import_group_viewers_uuid == "" &&
      var.import_scope_email_uuid == "" &&
      var.import_scope_groups_uuid == "" &&
      var.import_provider_pk == 0 &&
      var.import_binding_admins_uuid == ""
    )
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire — clear the ids or set adoption=true."
  }
}

variable "import_group_admins_uuid" {
  description = "Live uuid of the kubernetes-admins group (groups import by uuid)."
  type        = string
  default     = ""
}

variable "import_group_operators_uuid" {
  description = "Live uuid of the kubernetes-operators group (groups import by uuid)."
  type        = string
  default     = ""
}

variable "import_group_viewers_uuid" {
  description = "Live uuid of the kubernetes-viewers group (groups import by uuid)."
  type        = string
  default     = ""
}

variable "import_scope_email_uuid" {
  description = "Live pm_uuid of the Kubernetes Email scope mapping (scope mappings import by pm uuid)."
  type        = string
  default     = ""
}

variable "import_scope_groups_uuid" {
  description = "Live pm_uuid of the Kubernetes Groups scope mapping (scope mappings import by pm uuid)."
  type        = string
  default     = ""
}

variable "import_provider_pk" {
  description = "Live pk of the kubernetes-oidc-provider (oauth2 providers import by numeric pk)."
  type        = number
  default     = 0
}

variable "import_binding_admins_uuid" {
  description = "Live uuid of the admins policy binding on the kubernetes application (policy bindings import by binding uuid)."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# ADOPTION IMPORTS. The seven generated ids ride for_each-gated blocks
# (the jetkvm rule — plain variable-id imports blink: tofu silently
# skips an empty-id import and plans a duplicate create; count is rejected
# on import blocks). Default off (toset([])), armed once at the merge gate
# by the witness varmap and inert again while the resources are in state
# (tofu skips import blocks for in-state resources). The APPLICATION
# imports UNGATED by design — applications import BY SLUG and the slug
# is a static literal here, so no gate variable exists: at steady state
# the target is already in tofu state and the block is a no-op; if the
# state Secret is ever lost, this block re-adopts the application row
# automatically on the next plan. Witness ids NEVER appear in git.
# ---------------------------------------------------------------------------
import {
  to = authentik_application.kubernetes
  id = "kubernetes"
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_group.kubernetes_admins
  id       = var.import_group_admins_uuid
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_group.kubernetes_operators
  id       = var.import_group_operators_uuid
}

import {
  for_each = var.adoption ? toset(["g"]) : toset([])
  to       = authentik_group.kubernetes_viewers
  id       = var.import_group_viewers_uuid
}

import {
  for_each = var.adoption ? toset(["s"]) : toset([])
  to       = authentik_property_mapping_provider_scope.kubernetes_email
  id       = var.import_scope_email_uuid
}

import {
  for_each = var.adoption ? toset(["s"]) : toset([])
  to       = authentik_property_mapping_provider_scope.kubernetes_groups
  id       = var.import_scope_groups_uuid
}

import {
  for_each = var.adoption ? toset(["p"]) : toset([])
  to       = authentik_provider_oauth2.kubernetes
  id       = tostring(var.import_provider_pk)
}

import {
  for_each = var.adoption ? toset(["b"]) : toset([])
  to       = authentik_policy_binding.admins
  id       = var.import_binding_admins_uuid
}
