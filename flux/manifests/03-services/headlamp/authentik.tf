# headlamp's Authentik stack — HCL half of the canonical file pair.
#
# Pair contract: crossplane.yaml carries the Crossplane objects
# (OnePasswordItem + ProviderConfig + Workspace); authentik.tf is the
# single source of truth for the HCL. kustomization.yaml stitches them at
# build time — configMapGenerator packages this file and the replacements
# rule copies its bytes into spec.forProvider.module (source: Inline,
# module: "" placeholder), so the rendered module stays byte-identical to
# this file. Never render this directory outside kustomize.
#
# ADDRESS PARITY with the live tfstate Secret
# (tfstate-headlamp-authentik-headlamp): the resource and data-source
# names below mirror terraform/modules/authentik-app exactly (the
# module-era addresses), so the first plan after this layout swap reads
# No changes — no state-mv gate, no recreate, no import ids. There are NO
# import blocks here: tofu state holds the objects, and if the state Secret
# is ever lost, re-adopt via manual tofu import (ids from the live DB) —
# never a blip.

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
  # duplicate create set — the parity bar dies right there.
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
# three flows with every install, so they pre-exist any apply.
data "authentik_flow" "provider-authorization" {
  slug = "default-provider-authorization-implicit-consent"
}

data "authentik_flow" "invalidation" {
  slug = "default-invalidation-flow"
}

data "authentik_flow" "authentication" {
  slug = "default-authentication-flow"
}

# Admins-group binding source, order-10 parity with the chart blueprint.
# include_users=false keeps the group's member list out of the state
# Secret.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

# Users-group binding source — module-shape parity: the module declares
# this data source ungated, so the live state carries it even though
# headlamp is NOT shared (no users binding resource). Keeping it declared
# preserves the state address set; unreferenced data sources are fine —
# tofu still reads and stores them.
data "authentik_group" "users" {
  name          = "users"
  include_users = false
}

# Library mode: headlamp's Authentik footprint is the dashboard tile + the
# admins binding ONLY — no provider. Its OIDC login rides the
# blueprint-owned `kubernetes` OIDC provider (authentik/kube-auth/), NOT a
# headlamp-owned provider, so protocol_provider stays omitted (module
# parity: null = attribute omitted; the provider-less application stays
# provider-less).
resource "authentik_application" "app" {
  name            = "Headlamp"
  slug            = "headlamp"
  group           = "Platform"
  meta_launch_url = "https://headlamp.gateway.services.apocrathia.com"
  open_in_new_tab = true

  # Optional metadata: null = attribute omitted — live DB rows are NULL
  # for many apps; the config must not invent values.
  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/03-services/headlamp/icon.svg"
  meta_description = "Kubernetes web UI with OIDC authentication"
  meta_publisher   = "Kubernetes SIG UI"
}

# IMMEDIATELY after the application: an application without policies is
# open to ALL authenticated users until this binding lands. Order-10
# parity with the chart blueprint. No count: the binding always exists,
# so its state address carries no [0] index.
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}
