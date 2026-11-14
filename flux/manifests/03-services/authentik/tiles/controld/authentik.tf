# ControlD's Authentik tile — HCL half of the canonical file pair.
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
# CREATED, not adopted: ControlD is a net-new tile with no retired-blueprint
# predecessor, so this workspace CREATES the application + binding on first
# reconcile. There are no adoption variables or import blocks.

terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.2"
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

# Admins-group binding source, order-10 parity with every other tile.
# include_users=false keeps the group's member list out of the state
# Secret.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

resource "authentik_application" "app" {
  name            = "Control D"
  slug            = "controld"
  group           = "Infrastructure"
  meta_launch_url = "https://controld.com/dashboard"
  open_in_new_tab = true

  meta_icon        = "https://cdn.gateway.services.apocrathia.com/homelab/flux/manifests/03-services/authentik/tiles/controld/icon.svg"
  meta_description = "Control D DNS dashboard"
  meta_publisher   = "Control D"
}

# IMMEDIATELY after the application: an application without policies is
# open to ALL authenticated users until this binding lands. Order-10
# parity with every other tile. No count: the binding always exists, so
# its state address carries no [0] index.
resource "authentik_policy_binding" "admins" {
  target = authentik_application.app.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}
