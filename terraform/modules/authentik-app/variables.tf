# authentik-app module inputs. The generic-app chart composes the standard
# surface from its authentik values (see helm/generic-app/templates/
# authentik-tofu-workspace.yaml); the per-app varmap (adoption ids,
# overrides) merges on top. This file is the variable contract.

# --- app identity: no defaults (the chart always composes these) -----------

variable "app_name" {
  type        = string
  description = "Application slug: authentik application slug, provider/outpost name prefix."
}

variable "display_name" {
  type        = string
  description = "Human-visible application name (authentik application name)."
}

variable "external_host" {
  type        = string
  description = "Public URL of the app (proxy external_host; meta_launch_url fallback)."
}

variable "mode" {
  type        = string
  description = "Provider mode: proxy (provider + outpost) or oidc (oauth2 provider). Bookmarks stay chart-blueprint managed."
  default     = "proxy"
  validation {
    condition     = contains(["proxy", "oidc"], var.mode)
    error_message = "mode must be \"proxy\" or \"oidc\" — bookmarks are not covered by this module."
  }
}

# --- shared tier ------------------------------------------------------------

variable "shared" {
  type        = bool
  description = "Add the users group binding (order 20) — the shared tag. Requires the tailnet door at the route level."
  default     = false
}

variable "tailnet" {
  type        = bool
  description = "Add the tailnet-gateway parentRef to the outpost HTTPRoute (the friends door)."
  default     = false
}

# --- adoption (adopt the live objects in place; blip = fresh create) -------

variable "adoption" {
  type        = bool
  description = "Adopt the live authentik objects in place via import blocks instead of creating fresh ones. Requires every live import id for this app's shape; empty id = tofu silently skips the import and plans a duplicate create."
  default     = false
  validation {
    condition = !var.adoption || (
      var.import_provider_pk != "" &&
      var.import_application_id != "" &&
      (var.mode != "proxy" || var.import_outpost_uuid != "") &&
      (!var.shared || var.import_binding_users_pk != "") &&
      var.import_binding_admins_pk != ""
    )
    error_message = "adoption=true requires every live import id for the resources this app's shape creates. Empty id = tofu silently skips the import and plans a duplicate create."
  }
  validation {
    condition = var.adoption || (
      var.import_provider_pk == "" &&
      var.import_application_id == "" &&
      var.import_outpost_uuid == "" &&
      var.import_binding_admins_pk == "" &&
      var.import_binding_users_pk == ""
    )
    error_message = "import ids set but adoption=false - either set adoption:true (adopt) or clear the ids (blip)."
  }
}

variable "import_provider_pk" {
  type        = string
  description = "Live pk of the provider (proxy or oidc, per mode) to adopt."
  default     = ""
}

variable "import_application_id" {
  type        = string
  description = "Slug of the application to adopt — applications import by slug, not uuid."
  default     = ""
}

variable "import_binding_admins_pk" {
  type        = string
  description = "Live pk of the admins policy binding to adopt."
  default     = ""
}

variable "import_binding_users_pk" {
  type        = string
  description = "Live pk of the users policy binding to adopt (shared tier)."
  default     = ""
}

variable "import_outpost_uuid" {
  type        = string
  description = "Live uuid of the outpost to adopt (proxy mode)."
  default     = ""
}

# --- provider inputs (house defaults = chart values defaults) -------------

variable "internal_host" {
  type        = string
  description = "In-cluster service URL the proxy forwards to. The chart composes http://<app>.<ns>.svc.cluster.local:<port>."
  default     = ""
  validation {
    condition     = var.mode != "proxy" || var.internal_host != ""
    error_message = "internal_host is required in proxy mode (the chart composes http://<app>.<ns>.svc.cluster.local:<port>)."
  }
}

variable "sso_launch_url" {
  type        = string
  description = "Direct SSO entrypoint for the library tile; empty = external_host."
  default     = ""
}

variable "icon" {
  type        = string
  description = "Dashboard icon URL; empty = attribute omitted (live NULL preserved)."
  default     = ""
}

variable "open_in_new_tab" {
  type        = bool
  description = "Open the app in a new tab from the dashboard."
  default     = true
}

variable "category" {
  type        = string
  description = "Dashboard category (authentik application group)."
  default     = "Applications"
}

variable "meta_description" {
  type        = string
  description = "Dashboard description; empty = attribute omitted (live NULL preserved)."
  default     = ""
}

variable "meta_publisher" {
  type        = string
  description = "Dashboard publisher; empty = attribute omitted (live NULL preserved)."
  default     = ""
}

variable "authorization_flow" {
  type        = string
  description = "Authorization flow slug (house default = authentik's implicit-consent flow)."
  default     = "default-provider-authorization-implicit-consent"
}

variable "invalidation_flow" {
  type        = string
  description = "Invalidation flow slug (house default = authentik's default)."
  default     = "default-invalidation-flow"
}

variable "authentication_flow" {
  type        = string
  description = "Authentication flow slug, proxy mode only (house default = authentik's default)."
  default     = "default-authentication-flow"
}

variable "intercept_header_auth" {
  type        = bool
  description = "Header-based auth for reverse proxy auth. Chart parity default FALSE — the TF resource default is TRUE; an omitted attribute would PATCH live rows to true on the first apply."
  default     = false
}

variable "skip_path_regex" {
  type        = list(string)
  description = "Unauthenticated path regexes (proxy mode); joined with newlines into the provider's single-string field. Empty list = attribute omitted (live empty preserved)."
  default     = []
}

variable "access_token_validity" {
  type        = string
  description = "Token validity as a relative duration. ALWAYS sent explicitly (the TF resource default minutes=10 would PATCH live rows on the first apply). Empty = per-mode default: proxy hours=1 (the authentik model default every chart-blueprint row lives at), oidc minutes=5 (the chart default)."
  default     = ""
}

# --- outpost (proxy mode) ----------------------------------------------------

variable "authentik_host" {
  type        = string
  description = "Authentik API URL the outpost talks to (house convention: the public gateway hostname)."
  default     = "https://auth.gateway.services.apocrathia.com"
}

variable "authentik_host_insecure" {
  type        = bool
  description = "Skip TLS verification for authentik_host from inside the cluster."
  default     = true
}

variable "service_connection" {
  type        = string
  description = "Kubernetes service connection the outpost runs through (authentik's built-in one)."
  default     = "Local Kubernetes Cluster"
}

variable "log_level" {
  type        = string
  description = "Outpost log level."
  default     = "info"
}

variable "kubernetes_replicas" {
  type        = number
  description = "Outpost deployment replica count."
  default     = 1
}

variable "kubernetes_namespace" {
  type        = string
  description = "Namespace the outpost deployment runs in."
  default     = "authentik"
}

# --- oidc mode ---------------------------------------------------------------

variable "redirect_uris" {
  type = list(object({
    url           = string
    matching_mode = optional(string, "strict")
  }))
  description = "Allowed redirect URIs. TF field name is allowed_redirect_uris (the blueprint's redirect_uris). Empty list = attribute omitted (live rows preserved)."
  default     = []
}

variable "scopes" {
  type        = list(string)
  description = "Standard scope names, looked up by scope_name. Custom scope mappings shadow same-scope_name lookups."
  default     = ["openid", "email", "profile"]
}

variable "custom_scope_mappings" {
  type = list(object({
    name        = string
    scope_name  = string
    description = optional(string)
    expression  = string
  }))
  description = "Custom scope mappings, created as resources and added to the provider's property_mappings (oidc mode)."
  default     = []
}

variable "oidc_client_id" {
  type        = string
  description = "REQUIRED by the TF oauth2 resource in oidc mode. Adopt: the LIVE client_id — the import preserves it, so a config value that differs plans an update. Blip: a deterministic id (convention: the app name). client_secret is never managed here (sensitive, generated; imports preserve live secrets)."
  default     = ""
  validation {
    condition     = var.mode != "oidc" || var.oidc_client_id != ""
    error_message = "oidc mode requires oidc_client_id (adopt: the live value; blip: a deterministic id, convention the app name) — the TF resource field is required."
  }
}

variable "client_type" {
  type        = string
  description = "OAuth2 client type: confidential or public."
  default     = "confidential"
}

variable "sub_mode" {
  type        = string
  description = "What to use as the sub claim."
  default     = "user_username"
}

variable "include_claims_in_id_token" {
  type        = bool
  description = "Include claims in the ID token (vs requiring the userinfo endpoint)."
  default     = true
}

variable "issuer_mode" {
  type        = string
  description = "Issuer URL construction: global or per_provider."
  default     = "per_provider"
}

variable "signing_key" {
  type        = string
  description = "JWT signing key (certificate key pair name)."
  default     = "authentik Self-signed Certificate"
}

variable "access_code_validity" {
  type        = string
  description = "Authorization-code validity as a relative duration (oidc)."
  default     = "minutes=1"
}

variable "refresh_token_validity" {
  type        = string
  description = "Refresh-token validity as a relative duration (oidc)."
  default     = "days=30"
}
