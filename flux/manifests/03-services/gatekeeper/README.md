# Gatekeeper

OPA Gatekeeper provides policy-based control for cloud native environments.

## Overview

Gatekeeper is a validating (and mutating) admission webhook that enforces CRD-based policies executed by Open Policy Agent (OPA). It provides:

- **Policy Enforcement**: Enforce policies using OPA Constraint Framework
- **Audit Functionality**: Monitor and report policy violations
- **Mutation Support**: Modify resources before admission
- **High Availability**: Multiple replicas for reliability

## Configuration

- **Namespace**: `gatekeeper-system`
- **Replicas**: 2 (for high availability)
- **Resources**: 100m CPU, 256Mi memory (requests), 1000m CPU, 512Mi memory (limits)
- **Features**: Audit and mutation enabled
- **K8s Native Validation**: Enabled for enhanced validation
- **Logging**: INFO level with denies and mutations logged
- **Webhooks**: 3s validation timeout, 1s mutation timeout, Ignore failure policy
- **Security**: Runtime seccomp profile, TLS 1.3, system-critical priority
- **Performance**: 20 violation limit, 500 audit chunk size, 100 pod limit

## Usage

Gatekeeper policies are defined using ConstraintTemplates and Constraints. See the [official documentation](https://open-policy-agent.github.io/gatekeeper/) for policy creation and management.

## Monitoring

Gatekeeper provides metrics and audit logs for policy enforcement monitoring:

- **Metrics**: Prometheus metrics available on port 8888
- **Grafana Dashboard**: Pre-configured dashboard in the Security folder
- **Logs**: Check the `gatekeeper-system` namespace for pod logs

## Resources

- **Gatekeeper Documentation**: [Gatekeeper Documentation](https://open-policy-agent.github.io/gatekeeper/website/docs)
- **Source**: [GitHub Repository](https://github.com/open-policy-agent/gatekeeper/tree/master/charts/gatekeeper)
