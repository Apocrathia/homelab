# tenzir's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# FRESH CREATE: the state Secret (tfstate-tenzir-authentik-tenzir) starts
# empty — the retired blueprint lane kept no tofu state, and nothing here
# is imported. The first apply creates the role, permission, user, and
# token below; the blueprint-imported duplicates stay inert in authentik
# until the operator prunes them. There are NO import blocks: tofu owns
# what it created, and if the state Secret is ever lost, re-adopt via
# manual tofu import (ids from the live DB).
#
# tenzir's lane: read-only events pull. Role + permission, service
# account, and the events API token — no OAuth app, no provider, no
# outpost, no flows.

terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.0"
    }
  }

  # PARTIAL backend: the per-app args (secret_suffix/namespace/
  # in_cluster_config) come from the ProviderConfig spec.backendFile — the
  # provider writes them to crossplane.remote.tfbackend and passes them via
  # -backend-config at tofu init. The empty block MUST stay: without it
  # tofu falls back to the LOCAL backend (warning only), reads an EMPTY
  # state, and plans a full duplicate create set.
  backend "kubernetes" {}
}

provider "authentik" {
  # House convention for in-cluster Authentik consumers: the public
  # gateway hostname. The provider appends /api/v3 itself.
  url = "https://auth.gateway.services.apocrathia.com"

  # Token file written by the ProviderConfig credentials array.
  token = file("authentik-token")
}

# Role "tenzir-events-reader": least privilege, read-only events.
resource "authentik_rbac_role" "tenzir_events_reader" {
  name = "tenzir-events-reader"
}

# Global-form permission grant: role + app_label.codename — the codename
# the events API ViewSet checks.
resource "authentik_rbac_permission_role" "events_view" {
  role       = authentik_rbac_role.tenzir_events_reader.id
  permission = "authentik_events.view_event"
}

# Service account the token hangs off.
resource "authentik_user" "tenzir" {
  username  = "ak-tenzir"
  name      = "Tenzir SIEM events pull"
  type      = "service_account"
  is_active = true
  roles     = [authentik_rbac_role.tenzir_events_reader.id]
}

# Events API token. Authentik generates the key; it never appears in git
# or state (retrieve_key stays default false). The operator copies the key
# once from the authentik UI (Directory -> Users -> ak-tenzir -> Tokens)
# into the 1Password item tenzir-secrets (field authentik-events-token)
# after the first apply.
resource "authentik_token" "events_reader" {
  identifier  = "tenzir-events-reader"
  user        = authentik_user.tenzir.id
  intent      = "api"
  expiring    = false
  description = "Tenzir from_http events-API pull token (read-only events)"
}
