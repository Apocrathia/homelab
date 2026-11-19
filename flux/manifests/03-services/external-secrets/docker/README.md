# Docker Hub Pull Secret

An ExternalSecret that syncs Docker Hub credentials from 1Password into a
`kubernetes.io/dockerconfigjson` pull secret (`docker-io-imagepullsecret`) in
`kube-system`. Kyverno's `clone-docker-io-imagepullsecret` GeneratingPolicy in
`../../kyverno/policies/` clones it into every namespace labeled
`images/dockerhub=true`.

> **Navigation**: [← Back to External Secrets README](../README.md)
