terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.0"
    }
  }

  # Per-workspace state: the kubernetes backend stores it as a Secret
  # (tfstate-default-headlamp) in this namespace via the provider runtime SA.
  # Deliberately separate from the CI tofu stack (terraform/, GitLab
  # HTTP backend) — two stacks, two states.
  backend "kubernetes" {
    secret_suffix     = "headlamp"
    namespace         = "headlamp"
    in_cluster_config = true
  }
}

provider "authentik" {
  # House convention for in-cluster Authentik consumers (kagent, the
  # tak LDAP outpost, the kube-apiserver OIDC issuer): the public
  # gateway hostname. The provider appends /api/v3 itself.
  url = "https://auth.gateway.services.apocrathia.com"

  # Token file written by the ProviderConfig credentials array.
  token = file("authentik-token")
}

# Application library entry — 1:1 parity with the retired blueprint
resource "authentik_application" "headlamp" {
  name             = "Headlamp"
  slug             = "headlamp"
  group            = "Platform"
  meta_launch_url  = "https://headlamp.gateway.services.apocrathia.com"
  open_in_new_tab  = true
  meta_icon        = "https://gitlab.com/Apocrathia/homelab/-/raw/main/flux/manifests/03-services/headlamp/icon.svg"
  meta_description = "Kubernetes web UI with OIDC authentication"
  meta_publisher   = "Kubernetes SIG UI"
}

# Admins-group binding (app access), order 10 — parity with the
# blueprint. include_users=false keeps the group's member list out of
# the state Secret.
data "authentik_group" "admins" {
  name          = "admins"
  include_users = false
}

resource "authentik_policy_binding" "headlamp-admins" {
  target = authentik_application.headlamp.uuid
  group  = data.authentik_group.admins.id
  order  = 10
}
