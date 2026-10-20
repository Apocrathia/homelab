# WebAuthn MFA for the default authentication flow — HCL half of the
# canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (ProviderConfig + Workspace); authentik.tf is the single source of truth
# for the HCL. kustomization.yaml stitches them at build time —
# configMapGenerator packages this file and the replacements rule copies
# its bytes into spec.forProvider.module (source: Inline, module: ""
# placeholder), so the rendered module stays byte-identical to this file.
# Never render this directory outside kustomize.
#
# UNIT (retired blueprints/webauthn-mfa.yaml): partial updates of the three
# UPSTREAM-SHIPPED default stages that gate every login — the WebAuthn
# setup stage (roaming + platform + passkey-manager authenticators), the
# MFA validation stage (WebAuthn primary, static recovery codes fallback),
# and the login identification stage (passkey autofill from the username
# field). All three are LIVE upstream stages, never tofu-created: this
# workspace ADOPTS them via gated imports, no cleanup companion (the
# retired blueprint ConfigMap prunes away and the live stages survive for
# this workspace to take over). Never fresh-create — a create would fork
# the default login flow's stage set and break every login.
#
# TF MODELS FULL ATTRIBUTES: blueprint updates were PARTIAL (unlisted
# attributes kept their live values); tofu is not. Every field the
# provider's Read writes into state is either declared here
# live-verbatim (friendly_name, configure_flow, case_insensitive_matching)
# or provably equal to the provider default (omitted, commented inline).
# Any field where live != TF default MUST stay declared — an omitted
# non-default value plans a wipe on the first diff, and a bad apply here
# locks every user out of the login flow.
#
# THE DENY-SWITCH IS UNSAFE (witnessed 2026-10-20, live DB): active users
# with NO authenticator — cylentknight, insouciance, ninefoot3 — would be
# locked out the moment not_configured_action flips to "deny". Enrolled:
# ianyoung (2), jackalopette (1), fallingkin (1). not_configured_action
# stays "configure" (live-verbatim) until every active human is enrolled.
#
# GATE (recipe §8): the merge-gate varmap carries adoption:true + the three
# stage uuids ONCE. Witness ids are GATE-TIME ONLY — NEVER in git; if the
# state Secret is ever lost, re-run the gate with fresh ids from the live
# DB. Stages import by stage_uuid (authentik_flows_stage pk — the uuid
# column IS the primary key; tofu provider 2026.8.0 SetId(res.Pk)).

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

# The WebAuthn setup stage's configure flow (upstream-shipped,
# live-verbatim): the flow the setup stage runs from user settings and
# first-login enrollment. Authentik ships it with every install.
data "authentik_flow" "webauthn-setup-configure-flow" {
  slug = "default-authenticator-webauthn-setup"
}

# Static recovery-code setup stage (upstream-shipped): the validate stage's
# fallback configuration target. Looked up by name — never created here.
data "authentik_stage" "static_setup" {
  name = "default-authenticator-static-setup"
}

# Upstream WebAuthn setup stage, tuned for discoverable credentials
# (passkeys storable in 1Password, autofill-primary) and both roaming and
# platform authenticators. friendly_name + configure_flow are
# live-verbatim (live row values that differ from the TF schema defaults —
# omitted they would plan a wipe). max_attempts (live 0),
# authenticator_attachment (live NULL) and device_type_restrictions (live
# []) are omitted: state matches the config zero values, live == omitted.
resource "authentik_stage_authenticator_webauthn" "setup" {
  name = "default-authenticator-webauthn-setup"

  # Live-verbatim: the live row carries the upstream default display name,
  # the TF schema default is "" — omitting plans a wipe.
  friendly_name = "WebAuthn device"

  # Live-verbatim: the live row points at the upstream setup flow; the TF
  # field has no default and must ride explicitly or the first diff would
  # clear it (enrollment from user settings would break).
  configure_flow = data.authentik_flow.webauthn-setup-configure-flow.id

  user_verification        = "preferred"
  resident_key_requirement = "preferred"

  hints = [
    "security-key",
    "client-device",
    "hybrid",
  ]
}

# Upstream MFA validation stage, bound to default-authentication-flow at
# order 30. Gate login on WebAuthn, static recovery codes as fallback;
# users without any authenticator are prompted to enroll on first login
# (configure — the deny-switch stays unsafe, header note). Omitted fields
# all match the TF schema defaults field-for-field: last_auth_threshold
# (live seconds=0 == default), the four otp throttling factors (live 1 ==
# default 1), webauthn_hints (live []).
resource "authentik_stage_authenticator_validate" "mfa_validation" {
  name = "default-authentication-mfa-validation"

  not_configured_action = "configure"

  device_classes = [
    "webauthn",
    "static",
  ]

  configuration_stages = [
    authentik_stage_authenticator_webauthn.setup.id,
    data.authentik_stage.static_setup.id,
  ]

  webauthn_user_verification = "preferred"
}

# Upstream login identification stage: passkey autofill offered directly
# from the username field. user_fields restates the live value — the API
# rejects partial updates that omit it ("at least one source must be
# selected"), so the field is load-bearing in both worlds.
# case_insensitive_matching is live-verbatim (live true, TF field has NO
# default — omitting plans a wipe to false). Omitted fields match live ==
# TF defaults: show_matched_user (t), pretend_user_exists (t),
# show_source_labels (f), enable_remember_me (f); password_stage,
# captcha_stage, sources, enrollment/recovery/passwordless flows are all
# empty on the live row.
resource "authentik_stage_identification" "login" {
  name = "default-authentication-identification"

  user_fields = [
    "email",
    "username",
  ]

  webauthn_stage = authentik_stage_authenticator_validate.mfa_validation.id

  case_insensitive_matching = true
}

# ---------------------------------------------------------------------------
# ADOPTION VARIABLES — the generated-id import gate. Defaults (adoption
# false, ids empty) validate clean and leave the import blocks below
# inert. The ONLY setter is the merge-gate varmap (MR body, recipe §8):
# injected into the Workspace once, cleared after the adoption apply.
# The ids themselves NEVER appear in git.
# ---------------------------------------------------------------------------
variable "adoption" {
  description = "Merge-gate switch: adopt the live upstream default stages into tofu state (MR recipe §8; default off)."
  type        = bool
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  # An empty id means tofu silently skips that import and plans a
  # duplicate create — the jetkvm blink.
  validation {
    condition = !var.adoption || (
      var.import_stage_webauthn_setup_uuid != "" &&
      var.import_stage_mfa_validation_uuid != "" &&
      var.import_stage_identification_uuid != ""
    )
    error_message = "ADOPTION GATE: adoption=true requires import_stage_webauthn_setup_uuid, import_stage_mfa_validation_uuid and import_stage_identification_uuid (witness ids from the gate varmap — gate-time only, never in git). An empty id means tofu silently skips the import and plans a duplicate create."
  }

  # Gate 2: witness ids set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition = var.adoption || (
      var.import_stage_webauthn_setup_uuid == "" &&
      var.import_stage_mfa_validation_uuid == "" &&
      var.import_stage_identification_uuid == ""
    )
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire — clear the ids or set adoption=true."
  }
}

variable "import_stage_webauthn_setup_uuid" {
  description = "Live stage_uuid of default-authenticator-webauthn-setup (stages import by stage_uuid, the authentik_flows_stage pk)."
  type        = string
  default     = ""
}

variable "import_stage_mfa_validation_uuid" {
  description = "Live stage_uuid of default-authentication-mfa-validation (stages import by stage_uuid, the authentik_flows_stage pk)."
  type        = string
  default     = ""
}

variable "import_stage_identification_uuid" {
  description = "Live stage_uuid of default-authentication-identification (stages import by stage_uuid, the authentik_flows_stage pk)."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# ADOPTION IMPORTS. All three stage uuids are GENERATED, so they ride the
# adoption variables above: for_each-gated (the jetkvm rule — plain
# variable-id imports blink: tofu silently skips an empty-id import and
# plans a duplicate create; count is rejected on import blocks). Default
# off (toset([])), armed once at the merge gate by the witness varmap and
# inert again while the resources are in state (tofu skips import blocks
# for in-state resources). Witness ids NEVER appear in git.
# ---------------------------------------------------------------------------
import {
  for_each = var.adoption ? toset(["setup"]) : toset([])
  to       = authentik_stage_authenticator_webauthn.setup
  id       = var.import_stage_webauthn_setup_uuid
}

import {
  for_each = var.adoption ? toset(["mfa_validation"]) : toset([])
  to       = authentik_stage_authenticator_validate.mfa_validation
  id       = var.import_stage_mfa_validation_uuid
}

import {
  for_each = var.adoption ? toset(["login"]) : toset([])
  to       = authentik_stage_identification.login
  id       = var.import_stage_identification_uuid
}
