terraform {
  required_providers {
    authentik = {
      source  = "goauthentik/authentik"
      version = "2026.8.2"
    }
  }

  # PARTIAL backend: the per-app args (secret_suffix/namespace/
  # in_cluster_config) come from the chart-rendered ProviderConfig
  # spec.backendFile, which the provider writes to crossplane.remote.tfbackend
  # and passes it via -backend-config at tofu init. Without backendFile the
  # kubernetes backend init fails. (upstream: example
  # workspace-opentofu-backend-file.yaml; provider source
  # internal/controller/cluster/workspace/workspace.go)
  backend "kubernetes" {}
}
