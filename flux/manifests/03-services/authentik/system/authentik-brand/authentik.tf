# Authentik's own brand — the logo/icon update.
#
# Pair contract: crossplane.yaml + this file, stitched by kustomization.yaml.
# ADOPTS the live default brand in place (adopt-only: a brand recreate would
# reset the entire UI identity + flow assignments). The logo + favicon
# point at the repo-served CDN URL for the icon committed alongside.

terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.0"
    }
  }

  # PARTIAL backend: the per-app args come from the ProviderConfig backendFile.
  backend "kubernetes" {}
}

provider "authentik" {
  url   = "https://auth.gateway.services.apocrathia.com"
  token = file("authentik-token")
}

# The default brand — live-verbatim title, flows left at their live values
# (referenced by uuid from the data sources below).
data "authentik_flow" "authentication" {
  slug = "default-authentication-flow"
}

data "authentik_flow" "invalidation" {
  slug = "default-invalidation-flow"
}

data "authentik_flow" "recovery" {
  slug = "default-recovery-flow"
}

data "authentik_flow" "unenrollment" {
  slug = "default-enrollment-flow"
}

data "authentik_flow" "user_settings" {
  slug = "default-user-settings-flow"
}

# Admins group source for reference.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

variable "adoption" {
  description = "Merge-gate switch: adopt the live default brand in place (recipe §8; default off)."
  type        = bool
  default     = false

  validation {
    condition     = !var.adoption || var.import_brand_uuid != ""
    error_message = "ADOPTION GATE: adoption=true requires import_brand_uuid."
  }

  validation {
    condition     = var.adoption || var.import_brand_uuid == ""
    error_message = "ADOPTION GATE: import ids set with adoption=false is a miswire."
  }
}

variable "import_brand_uuid" {
  description = "Live brand uuid for the gated import. Gate-time only — never in git."
  type        = string
  default     = ""
}

resource "authentik_brand" "default" {
  domain             = "auth.gateway.services.apocrathia.com"
  default            = true
  branding_title     = "authentik"
  branding_logo      = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/03-services/authentik/icon.svg"
  branding_favicon   = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/03-services/authentik/icon.svg"
  branding_custom_css = ""
  flow_authentication = data.authentik_flow.authentication.id
  flow_invalidation    = data.authentik_flow.invalidation.id
  flow_recovery       = data.authentik_flow.recovery.id
  flow_unenrollment   = data.authentik_flow.unenrollment.id
  flow_user_settings  = data.authentik_flow.user_settings.id
  attributes          = jsonencode({})
}

import {
  to = authentik_brand.default
  id = var.import_brand_uuid
}
