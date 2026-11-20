# Element Web's Authentik stack: HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time: configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# FRESH CREATE: element has NO live tfstate Secret. The resources below
# are UNGATED: no count-conditional module gating; this file IS element's
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

data "authentik_group" "users" {
  name          = "users"
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

# OIDC provider for Element Web. client_id is omitted so authentik
# generates it server-side; the operator copies both client_id and
# client_secret from the Authentik UI into the 1Password item after
# the first sync. issuer_mode = per_provider: the issuer is
# .../application/o/element/, and MAS's upstream_oauth2 entry points
# the matching ULID (see mas-config.yaml).
resource "authentik_provider_oauth2" "app" {
  name = "element-oidc-provider"

  # client_id is required by the TF resource (the blueprint
  # auto-generated it when unset); fresh create uses the deterministic
  # house convention (the app name). client_secret is never set here
  # (Sensitive): authentik generates it server-side; the operator pulls
  # it from the Authentik API/UI into the matrix-secrets 1Password item
  # (element-oidc-client-secret) after the first sync.
  client_id = "element"

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
      url           = "https://matrix.gateway.services.apocrathia.com/upstream/callback/01M4M3KRKC5A5BWMTGAXXRGYEP"
      matching_mode = "strict"
    }
  ]

  access_code_validity   = "minutes=1"
  access_token_validity  = "minutes=5"
  refresh_token_validity = "days=30"
}

# Element tile on the Authentik dashboard.
resource "authentik_application" "app" {
  name            = "Element"
  slug            = "element"
  group           = "Social"
  meta_launch_url = "https://element.gateway.services.apocrathia.com/"
  open_in_new_tab = true

  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/04-apps/social/matrix/element/icon.svg"
  meta_description = "Element Web — Matrix client (OIDC via MAS)"
  meta_publisher   = "Element"

  protocol_provider = authentik_provider_oauth2.app.id
}

resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}

# Users-group binding (order-20 house pattern): friends on the tailnet
# log in through these tiles: the whole point of the homeserver. MAS
# JIT-provisions @<username>:matrix.apocrathia.com on first login.
resource "authentik_policy_binding" "users" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.users.id
  order  = 20
}
