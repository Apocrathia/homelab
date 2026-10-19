# 1Password's Authentik tile — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (ProviderConfig + Workspace); authentik.tf is the single source of
# truth for the HCL. kustomization.yaml stitches them at build time —
# configMapGenerator packages this file and the replacements rule
# copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical
# to this file. Never render this directory outside kustomize.
#
# Tile mode (the jetkvm shape): the Authentik footprint is the dashboard
# launchpad tile + the admins binding ONLY — no provider, no outpost, no
# flows or scope lookups.
#
# ADOPTION (blueprint-created objects, live and NOT in tofu state): the
# application + binding(s) are LIVE, minted by the retired
# authentik-blueprint-1password ConfigMap — never in tofu state. This
# workspace ADOPTS them: the application import is UNGATED (imports by
# slug, a static literal); every GENERATED binding uuid rides the GATED
# for_each import on the adoption variables below (default off — tofu
# skips import blocks for in-state resources, while an ungated import
# with an empty id is silently skipped and a duplicate create planned:
# the two-way validations turn either miswire into a loud failure).
# The gate varmap is merge-time only (recipe §8): inject adoption +
# witness ids once, confirm "N to import, 0 to add", clear. Witness ids
# NEVER appear in git; if the state Secret is ever lost, re-run the gate
# with fresh ids from the live DB.
#
# ICON URL: live-verbatim on purpose — the value matches the live
# authentik_core_application row byte-for-byte, which still points at
# the retired blueprints/icons/ path. The icon FILE now lives here as
# icon.svg; repointing the URL is a separate deliberate follow-up
# (tofu plan first, apply after).

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
  # duplicate create set.
  backend "kubernetes" {}
}

provider "authentik" {
  # House convention for in-cluster Authentik consumers: the public
  # gateway hostname. The provider appends /api/v3 itself.
  url = "https://auth.gateway.services.apocrathia.com"

  # Token file written by the ProviderConfig credentials array.
  token = file("authentik-token")
}

# Admins-group binding source, order-10 parity with the retired blueprint.
# include_users=false keeps the group's member list out of the state
# Secret.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

# ---------------------------------------------------------------------------
# ADOPTION VARIABLES — the generated-id import gate. Defaults (adoption
# false, ids empty) validate clean and leave the import blocks below
# inert. The ONLY setter is the merge-gate varmap (MR body, recipe §8):
# injected into the Workspace once, cleared after the adoption apply.
# The ids themselves NEVER appear in git.
# ---------------------------------------------------------------------------
variable "adoption" {
  description = "Merge-gate switch: adopt the live blueprint-created binding(s) into tofu state (MR recipe §8; default off)."
  type        = bool
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  validation {
    condition     = !var.adoption || (var.import_binding_admins_pk != "")
    error_message = "ADOPTION GATE: adoption=true requires var.import_binding_admins_pk (witness ids from the gate varmap — gate-time only, never in git)."
  }

  # Gate 2: witness ids set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition     = var.adoption || (var.import_binding_admins_pk == "")
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire — clear the ids or set adoption=true."
  }
}

variable "import_binding_admins_pk" {
  description = "Live authentik_policy_binding admins uuid for the gated import (bindings import by pk)."
  type        = string
  default     = ""
}

# Application — retired-blueprint parity; every attribute matches the
# live authentik_core_application row (field-by-field in the witness
# sheet).
resource "authentik_application" "app" {
  name            = "1Password"
  slug            = "1password"
  group           = "Platform"
  meta_launch_url = "https://apocrathia.1password.com"
  open_in_new_tab = true

  # Optional metadata: null = attribute omitted — the config must not
  # invent values (live rows verified field-by-field in the witness
  # sheet). meta_icon is live-verbatim (see the header note).
  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/03-services/authentik/blueprints/icons/1password.svg"
  meta_description = "1Password management interface"
  meta_publisher   = "AgileBits Inc."
}

# IMMEDIATELY after the application: an application without policies is
# open to ALL authenticated users until this binding lands. Order-10
# parity with the retired blueprint. No count: the binding always
# exists, so its state address carries no [0] index.
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# ---------------------------------------------------------------------------
# ADOPTION IMPORTS. The application import is UNGATED — the slug is a
# static literal (authentik_application imports by slug). Binding uuids
# are GENERATED, so they ride the adoption variables above: default
# off, inert while the resources are in state (tofu skips import blocks
# for in-state resources), armed once at the merge gate by the witness
# varmap and back off after. for_each is the on/off gate (toset(["1password"])
# on, toset([]) off); tofu rejects count on import blocks.
# ---------------------------------------------------------------------------
import {
  to = authentik_application.app
  id = "1password"
}
import {
  for_each = var.adoption ? toset(["1password"]) : toset([])
  to       = authentik_policy_binding.admins
  id       = var.import_binding_admins_pk
}
