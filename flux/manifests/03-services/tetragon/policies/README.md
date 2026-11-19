# Tetragon Tracing Policies

The Tetragon TracingPolicies: `secret-file-access` (credential path reads and
writes), `container-escape` (setns into foreign mount namespaces), and
`egress` (TCP connects outside the cluster CIDRs). They are authored so
enforcement is a `policy-mode` flip; in monitor mode they only tag events.
Applied in a dedicated Flux Kustomization that waits for the operator's
TracingPolicy CRDs.

> **Navigation**: [← Back to Tetragon README](../README.md)
