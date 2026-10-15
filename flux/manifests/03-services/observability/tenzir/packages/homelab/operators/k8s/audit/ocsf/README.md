# k8s audit OCSF map

[`map.tql`](./map.tql): kube-apiserver audit event -> OCSF API Activity
(6003). The subject objectRef and the request body ride in `unmapped`;
the rule fields for the homelab sigma rules come from `api.operation`.
