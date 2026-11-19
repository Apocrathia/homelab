# okta-app: Okta apps module

OIDC web apps from `var.oauth_apps` and OIN SAML apps from `var.saml_apps`, each
assigned to the built-in Everyone group. Client secrets use omit_secret=true;
read once from the Admin UI into 1Password, never in state.

> **Navigation**: [← Back to modules: shared OpenTofu modules](../README.md)
