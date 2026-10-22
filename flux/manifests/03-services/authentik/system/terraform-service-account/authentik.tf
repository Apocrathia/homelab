# The tofu workspaces' own service account — HCL half of the canonical
# file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (ProviderConfig + Workspace); authentik.tf is the single source of truth
# for the HCL. kustomization.yaml stitches them at build time —
# configMapGenerator packages this file and the replacements rule copies
# its bytes into spec.forProvider.module (source: Inline, module: ""
# placeholder), so the rendered module stays byte-identical to this file.
# Never render this directory outside kustomize.
#
# UNIT (retired blueprints/terraform-service-account.yaml): the
# terraform-workspace-manager role, the ak-terraform service account, and
# the API token every tofu workspace — this one included — authenticates
# with. THE CIRCULARITY: the SA's own token authenticates the workspace
# that manages it (the state Secret this module writes is written under a
# token this module adopts). ADOPT-ONLY: never create, never rotate, never
# delete the token — a rotation breaks every workspace until the vault
# field is re-copied (the !4927 blink lesson; the key lives only in the
# 1Password item crossplane-terraform-secrets, field
# authentik-terraform-token, rendered as the ns-authentik
# authentik-terraform-token Secret by tiles/authentik-terraform-token.yaml).
#
# PERMISSIONS STAY UNMANAGED (the provider ID-space trap): the live role
# carries 60 permission rows (guardian_rolemodelpermission, witnessed
# 2026-10-24; the blueprint declares 30 — the rest were granted live after
# the blueprint's last one-shot apply on 2026-09-26: token/user/
# propertymapping/role CRUD, stage + flow reads, guardian view).
# authentik_rbac_permission_role is UNUSABLE on provider 2026.8.0 — its
# Create stores an assigned-row id that its Read never matches back (the
# ID-space bug; upstream fix !5530 merged, unreleased) — so NO
# permission_role resources live here, and the role models NAME-ONLY: the
# role resource's Read pulls no permissions and the RoleRequest carries
# name only, so the 60 rows stay live-unmanaged and every plan reads No
# changes. Modeling the rows (60 gated imports) is the revisit once the
# provider fix ships. Do NOT "fix" the 30-vs-60 drift by re-importing the
# blueprint — the hash gate re-truncates the role to 30 and the tier's
# workspaces start 403ing.
#
# TF MODELS FULL ATTRIBUTES: blueprint updates were PARTIAL (unlisted
# attributes kept live values); tofu is not. Every field the provider's
# Read writes into state is either declared live-verbatim below or
# provably equal to the TF default (omitted, commented inline). The plan
# staying at No changes is the correctness contract: any diff on the user
# triggers the provider's UPDATE call, which re-sends the full
# UserRequest (groups=[] included — the live user carries no groups, and
# the contract is what keeps that true).
#
# GATE (recipe §8): the merge-gate varmap carries adoption:true + the
# role uuid + the user pk ONCE (born-with-varmap). The token imports
# UNGATED by identifier (see the import block). Witness ids are GATE-TIME
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

  # Token file written by the ProviderConfig credentials array — the very
  # token the token resource below adopts (header circularity note).
  token = file("authentik-token")
}

# The workspace-manager role. Name-only by design: authentik_rbac_role
# cannot inline permissions, and the 60 live permission rows stay
# unmanaged (header note — the provider ID-space bug). A rename here is a
# safe PUT (the API's role update never touches permission rows).
resource "authentik_rbac_role" "workspace_manager" {
  name = "terraform-workspace-manager"
}

# The service account every tofu workspace authenticates as. Live-verbatim
# (witnessed gate-time): pk rides the varmap, type service_account, active, email "",
# path "users", attributes {}, NO groups. Omitted == TF defaults:
# is_active (true), path ("users"), attributes ("{}", JSON-diff
# suppressed), email ("") — password is never declared (sensitive; the
# service account carries no usable password and the provider never reads
# it). groups omitted: the live user carries none and the provider's
# ListConsistentMerge keeps [] == [] — a diff on any field would re-send
# groups=[], a no-op on a groupless user today; keep it that way.
resource "authentik_user" "workspace_manager" {
  username  = "ak-terraform"
  name      = "Terraform workspaces"
  type      = "service_account"
  is_active = true

  # The role attach — the one relationship the blueprint declared too.
  roles = [authentik_rbac_role.workspace_manager.id]
}

# The API token. ADOPT-ONLY (header circularity note): tofu never
# creates it, never rotates the key, never sets retrieve_key (the
# provider's Read only fetches key material when retrieve_key is true —
# it stays false so the key NEVER enters the state Secret). expiring
# false is load-bearing: the TF default is TRUE, so omitting it plans a
# flip and the UPDATE would send expiring=true — the token would start
# dying at its stored (inert) expires timestamp. expires omitted: the
# live row carries the creation-time default timestamp, expiring=false
# renders it inert, and the provider's Read never writes the field back.
# intent api == the TF default (declared anyway — the tenzir-lap token
# precedent; explicit on the tier's bootstrap credential). description is
# live-verbatim: omitting plans a wipe to "".
resource "authentik_token" "workspace_manager" {
  identifier  = "terraform-workspace-manager"
  user        = authentik_user.workspace_manager.id
  intent      = "api"
  expiring    = false
  description = "goauthentik TF provider token for provider-opentofu workspaces"
}

# ---------------------------------------------------------------------------
# ADOPTION VARIABLES — the generated-id import gate. Defaults (adoption
# false, ids empty) validate clean and leave the gated import blocks below
# inert. The ONLY setter is the merge-gate varmap (MR body, recipe §8):
# injected into the Workspace once, cleared after the adoption apply.
# The ids themselves NEVER appear in git.
# ---------------------------------------------------------------------------
variable "adoption" {
  description = "Merge-gate switch: adopt the live blueprint-created role, user and token into tofu state (MR recipe §8; default off)."
  type        = bool
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  # An empty id means tofu silently skips that import and plans a
  # duplicate create — the jetkvm blink (the name/username unique indexes
  # 400 loudly, but the loud failure is still a broken workspace).
  validation {
    condition     = !var.adoption || (var.import_role_uuid != "" && var.import_user_pk != 0)
    error_message = "ADOPTION GATE: adoption=true requires import_role_uuid and import_user_pk (witness ids from the gate varmap — gate-time only, never in git). An empty id means tofu silently skips the import and plans a duplicate create."
  }

  # Gate 2: witness ids set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition     = var.adoption || (var.import_role_uuid == "" && var.import_user_pk == 0)
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire — clear the ids or set adoption=true."
  }
}

variable "import_role_uuid" {
  description = "Live uuid of the terraform-workspace-manager role (rbac roles import by uuid)."
  type        = string
  default     = ""
}

variable "import_user_pk" {
  description = "Live pk of the ak-terraform user (users import by numeric pk)."
  type        = number
  default     = 0
}

# ---------------------------------------------------------------------------
# ADOPTION IMPORTS. The role uuid and user pk are GENERATED, so they ride
# for_each-gated blocks (the jetkvm rule — plain variable-id imports
# blink: tofu silently skips an empty-id import and plans a duplicate
# create; count is rejected on import blocks). Default off (toset([])),
# armed once at the merge gate by the witness varmap and inert again
# while the resources are in state (tofu skips import blocks for
# in-state resources). The TOKEN imports UNGATED: tokens import by
# IDENTIFIER — a static literal declared in the resource above, NOT a
# generated id (CoreTokensRetrieve is identifier-keyed, lookup_field
# "identifier"; the token_uuid never becomes the tofu id) — same design as
# the ungated application-by-slug imports (gatus, b1 tak-ldap): a lost
# state Secret re-adopts the token row on the next plan automatically.
# Witness ids NEVER appear in git.
# ---------------------------------------------------------------------------
import {
  to = authentik_token.workspace_manager
  id = "terraform-workspace-manager"
}

import {
  for_each = var.adoption ? toset(["role"]) : toset([])
  to       = authentik_rbac_role.workspace_manager
  id       = var.import_role_uuid
}

import {
  for_each = var.adoption ? toset(["user"]) : toset([])
  to       = authentik_user.workspace_manager
  id       = tostring(var.import_user_pk)
}
