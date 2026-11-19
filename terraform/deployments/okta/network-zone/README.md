# network-zone — Okta network zones deployment

Terragrunt unit for the network zones, including the plan-time home-egress probe
(the IP is never hardcoded). Zones stay inert until a sign-on policy references
them; that wiring lives in `../policy-signon`.

> **Navigation**: [← Back to okta — Okta deployment](../README.md)
