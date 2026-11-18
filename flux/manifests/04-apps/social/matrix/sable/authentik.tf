# Sable's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# FRESH CREATE — sable has NO live tfstate Secret. The resources below
# are UNGATED — no count-conditional module gating; this file IS sable's
# stack, and the first sync creates everything.
#
# OIDC mode: oauth2 provider + application + admins binding. Per-client
# provider so each client gets its own Authentik tile and MAS can
# upstream each provider independently (one entry per upstream_oauth2 in
# mas-config.yaml).

terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.2"
    }
  }

  backend "kubernetes" {}
}

provider "authentik" {
  url   = "https://auth.gateway.services.apocrathia.com"
  token = file("authentik-token")
}

# Blueprint !Find lookups become data sources.
data "authentik_flow" "provider-authorization" {
  slug = "default-provider-authorization-implicit-consent"
}

data "authentik_flow" "invalidation" {
  slug = "default-invalidation-flow"
}

data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

data "authentik_certificate_key_pair" "signing" {
  name = "authentik Self-signed Certificate"
}

data "authentik_property_mapping_provider_scope" "openid" {
  scope_name = "openid"
}

data "authentik_property_mapping_provider_scope" "email" {
  scope_name = "email"
}

data "authentik_property_mapping_provider_scope" "profile" {
  scope_name = "profile"
}

# OIDC provider for Sable. client_id omitted — authentik generates it.
resource "authentik_provider_oauth2" "app" {
  name = "sable-oidc-provider"

  authorization_flow = data.authentik_flow.provider-authorization.id
  invalidation_flow  = data.authentik_flow.invalidation.id

  client_type                = "confidential"
  sub_mode                   = "user_username"
  include_claims_in_id_token = true
  issuer_mode                = "per_provider"
  signing_key                = data.authentik_certificate_key_pair.signing.id

  property_mappings = [
    data.authentik_property_mapping_provider_scope.openid.id,
    data.authentik_property_mapping_provider_scope.email.id,
    data.authentik_property_mapping_provider_scope.profile.id,
  ]

  allowed_redirect_uris = [
    {
      url           = "https://matrix.gateway.services.apocrathia.com/upstream/callback/01M4R9B3XS8NQ4WJ5PZ7XUFKGV"
      matching_mode = "strict"
    }
  ]

  access_code_validity   = "minutes=1"
  access_token_validity  = "minutes=5"
  refresh_token_validity = "days=30"
}

# Sable tile on the Authentik dashboard.
resource "authentik_application" "app" {
  name            = "Sable"
  slug            = "sable-matrix"
  group           = "Social"
  meta_launch_url = "https://sable.gateway.services.apocrathia.com/"
  open_in_new_tab = false

  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/04-apps/social/matrix/sable/icon.svg"
  meta_description = "Sable — Discord-like Matrix client (OIDC via MAS)"
  meta_publisher   = "Sable"

  protocol_provider = authentik_provider_oauth2.app.id
}

resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}
