# kubernetes (Authentik system unit)

The tofu-managed home for the kube-apiserver's OIDC issuer: the
`kubernetes-oidc-provider` (public client `kubernetes`), the
`kubernetes-admins`/`-operators`/`-viewers` groups the ClusterRoleBindings
match, the "Kubernetes Email" (hard `email_verified: True`) and
"Kubernetes Groups" scope mappings, the hidden `kubernetes` application
(slug = the issuer path — never rename), and the admins binding.
kubectl oidc-login and headlamp ride this stack. Adopt-only, byte-parity
with the live provider row: any drift here is a cluster-auth event, not
a config change (see the header notes in `authentik.tf`).

The k8s side stays in `kube-auth/`: `rbac.yaml` (ClusterRoleBindings)
and `icon.svg` (the application's `meta_icon` URL points at that repo
path through the CDN) are not authentik state and do not move.

Retired the `kube-auth/authentik-blueprint.yaml` ConfigMap — the
blueprint CM prunes and the live objects survive for this workspace to
adopt.

> **Navigation**: [← Back to Authentik system README](../README.md)
