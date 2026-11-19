# policy-signon — Okta sign-on policy deployment

Terragrunt unit for the custom sign-on policy: allow from the trusted zones
(home egress + Tailscale) with MFA, allow everywhere else with MFA at every
attempt. Zone ids arrive from the network-zone unit as a terragrunt dependency.

> **Navigation**: [← Back to okta — Okta deployment](../README.md)
