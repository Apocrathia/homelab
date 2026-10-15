# JetKVM's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# ADOPTION (blueprint-created objects, live and NOT in tofu state): the
# application + admins binding are LIVE, minted by the retired
# authentik-blueprint-* ConfigMap — never in tofu state. This workspace
# ADOPTS them, no cleanup companion (every object adopts; the blueprint
# CM prunes away and the live objects survive for tofu to take over):
#   - the application import is UNGATED — authentik_application imports
#     by slug (a static literal, verified against provider 2026.8.0
#     source: CoreApplicationsRetrieve + d.SetId(res.Slug));
#   - every GENERATED id rides GATED import blocks on adoption variables,
#     default off: var.adoption (bool) + var.import_binding_admins_pk
#     (string).
# Two-way plan-time gate: adoption=true with any id empty FAILS loudly;
# ids set with adoption=false FAILS loudly; defaults validate clean.
# Steady state (varmap absent): imports inert (resources already in
# state — tofu skips import blocks for in-state resources), plan reads No
# changes forever. The merge gate (MR body, recipe §8) injects the
# witness varmap once at merge, confirms "2 to import, 0 to add", then
# clears it. Witness ids are GATE-TIME ONLY — NEVER in git; if the state
# Secret is ever lost, re-run the gate with fresh ids from the live DB.
#
# Library/tile mode (the headlamp shape): JetKVM authenticates via
# Google OAuth against its OWN backend — the Authentik footprint is the
# dashboard launchpad tile + the admins binding ONLY. NO provider
# (protocol_provider stays omitted; the provider-less application stays
# provider-less), NO outpost, NO flows or scope lookups (nothing
# references them).

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
  # House convention for in-cluster Authentik consumers (kagent, the
  # tak LDAP outpost, the kube-apiserver OIDC issuer): the public
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
  description = "Merge-gate switch: adopt the live blueprint-created binding into tofu state (MR recipe §8; default off)."
  type        = bool
  default     = false

  # Gate 1: adoption=true with any id empty is a miswire — abort loudly.
  validation {
    condition     = !var.adoption || var.import_binding_admins_pk != ""
    error_message = "ADOPTION GATE: adoption=true requires import_binding_admins_pk (witness id from the gate varmap — gate-time only, never in git)."
  }

  # Gate 2: witness id set without adoption=true is a miswire — abort
  # loudly (a stray varmap must never half-arm the imports).
  validation {
    condition     = var.adoption || var.import_binding_admins_pk == ""
    error_message = "ADOPTION GATE: import id set with adoption=false is a miswire — clear the id or set adoption=true."
  }
}

variable "import_binding_admins_pk" {
  description = "Live authentik_policy_binding admins uuid for the gated import (bindings import by pk)."
  type        = string
  default     = ""
}

# Application — retired-blueprint parity. NO protocol_provider: this is
# the dashboard launchpad tile only (JetKVM Cloud authenticates against
# Google OAuth); the provider-less application stays provider-less.
resource "authentik_application" "app" {
  name            = "JetKVM"
  slug            = "jetkvm"
  group           = "Infrastructure"
  meta_launch_url = "https://jetkvm.gateway.services.apocrathia.com"
  open_in_new_tab = true

  # Optional metadata: null = attribute omitted — the config must not
  # invent values (live rows verified field-by-field in the witness
  # sheet).
  meta_icon        = "https://gitlab.com/Apocrathia/homelab/-/raw/main/flux/manifests/04-apps/management/jetkvm/icon.png"
  meta_description = "JetKVM Cloud Dashboard - KVM-over-IP management"
  meta_publisher   = "JetKVM"
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
# static literal (authentik_application imports by slug). The binding id
# is GENERATED (uuid), so it rides the adoption variables above: default
# off, inert while the resource is in state (tofu skips import blocks
# for in-state resources), armed once at the merge gate by the witness
# varmap and back off after. The witness ids NEVER appear in git — the
# varmap payload lives in the MR recipe only.
# ---------------------------------------------------------------------------
import {
  to = authentik_application.app
  id = "jetkvm"
}

import {
  to = authentik_policy_binding.admins
  id = var.import_binding_admins_pk
}
