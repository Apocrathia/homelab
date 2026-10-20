# Application access groups — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (ProviderConfig + Workspace); authentik.tf is the single source of truth
# for the HCL. kustomization.yaml stitches them at build time —
# configMapGenerator packages this file and the replacements rule copies
# its bytes into spec.forProvider.module (source: Inline, module: ""
# placeholder), so the rendered module stays byte-identical to this file.
# Never render this directory outside kustomize.
#
# UNIT (retired blueprints/app-access.yaml): the two IdP-level groups every
# application binds against — admins (operators, bound to every app) and
# users (friends, bound only to explicitly shared apps). Application
# blueprints and tofu modules NEVER create or delete these groups; they
# reference them as data.authentik_group(name) by NAME, so names are the
# API contract. Membership is UI-managed (operator decision, group-level
# grants only; user one-offs are UI-only).
#
# ADOPT-ONLY, NEVER CREATE, NEVER DELETE: both groups are LIVE
# (blueprint-created, referenced fleet-wide by uuid in every tofu pair's
# data sources), so this workspace ADOPTS them via gated imports — no
# cleanup companion (the retired blueprint ConfigMap prunes away and the
# live groups survive for this workspace to take over). A tofu-managed
# destroy here would sever every app binding in the fleet.
#
# MEMBERSHIP LANDMINE: the provider's group READ never pulls members
# (include_users=false on the API read — members never enter tofu state)
# and the config declares none, so steady state plans No changes and
# members are never touched. But ANY diff on these resources triggers the
# provider's UPDATE call, which re-sends the whole GroupRequest — with
# users omitted that PUT carries users=[] and CLEARS MEMBERSHIP. Never
# edit another field on these resources without first deciding member
# handling; the plan staying at No changes is a correctness contract
# here, not a nice-to-have.
#
# GATE (recipe §8): the merge-gate varmap carries adoption:true + the two
# group uuids ONCE (this pair gates FIRST or same-pass with the other
# system-tier units — they data-source these groups by name, which works
# either way; adopt-first keeps the ordering honest). Witness ids are
# GATE-TIME ONLY — NEVER in git; if the state Secret is ever lost, re-run
# the gate with fresh ids from the live DB.

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

# Friends group — bound only to explicitly shared applications. Name-only
# resource: is_superuser/attributes stay at the provider defaults (false /
# {}), which match the live rows field-for-field (witness sheet); the
# member list deliberately stays OUT of config and state (header note).
resource "authentik_group" "users" {
  name = "users"
}

# Operators group — bound to every application. Same name-only contract.
resource "authentik_group" "admins" {
  name = "admins"
}

# ---------------------------------------------------------------------------
# ADOPTION VARIABLES — the generated-id import gate. Defaults (adoption
# false, ids empty) validate clean and leave the import blocks below
# inert. The ONLY setter is the merge-gate varmap (MR body, recipe §8):
# injected into the Workspace once, cleared after the adoption apply.
# The ids themselves NEVER appear in git.
# ---------------------------------------------------------------------------
variable "adoption" {
  description = "Merge-gate switch: adopt the live blueprint-created groups into tofu state (MR recipe §8; default off)."
  type        = bool
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  # An empty id means tofu silently skips that import and plans a
  # duplicate create — the jetkvm blink.
  validation {
    condition     = !var.adoption || (var.import_group_users_uuid != "" && var.import_group_admins_uuid != "")
    error_message = "ADOPTION GATE: adoption=true requires import_group_users_uuid and import_group_admins_uuid (witness ids from the gate varmap — gate-time only, never in git). An empty id means tofu silently skips the import and plans a duplicate create."
  }

  # Gate 2: witness ids set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition     = var.adoption || (var.import_group_users_uuid == "" && var.import_group_admins_uuid == "")
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire — clear the ids or set adoption=true."
  }
}

variable "import_group_users_uuid" {
  description = "Live authentik_core_group uuid for the users group (group resources import by uuid)."
  type        = string
  default     = ""
}

variable "import_group_admins_uuid" {
  description = "Live authentik_core_group uuid for the admins group (group resources import by uuid)."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# ADOPTION IMPORTS. Both group uuids are GENERATED, so both ride the
# adoption variables above: for_each-gated (the jetkvm rule — plain
# variable-id imports blink: tofu silently skips an empty-id import and
# plans a duplicate create; count is rejected on import blocks). Default
# off (toset([])), armed once at the merge gate by the witness varmap and
# inert again while the resources are in state (tofu skips import blocks
# for in-state resources). Witness ids NEVER appear in git.
# ---------------------------------------------------------------------------
import {
  for_each = var.adoption ? toset(["users"]) : toset([])
  to       = authentik_group.users
  id       = var.import_group_users_uuid
}

import {
  for_each = var.adoption ? toset(["admins"]) : toset([])
  to       = authentik_group.admins
  id       = var.import_group_admins_uuid
}
