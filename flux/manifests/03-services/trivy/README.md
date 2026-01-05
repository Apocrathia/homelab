# Trivy Operator

The Trivy Operator provides continuous security scanning for Kubernetes clusters, including:

> **Navigation**: [← Back to Services README](../README.md)

## Documentation

- **[Trivy Operator Documentation](https://aquasecurity.github.io/trivy-operator/latest/)** - Primary documentation source
- **[GitHub Repository](https://github.com/aquasecurity/trivy-operator)** - Source code and issues

## Overview

- **Vulnerability Scans**: Automated vulnerability scanning for Kubernetes workloads
- **Configuration Audits**: Automated configuration audits with predefined rules or custom OPA policies
- **Exposed Secret Scans**: Automated secret scans to find exposed secrets
- **RBAC Scans**: Role-based access control analysis
- **Infrastructure Assessment**: Core component configuration validation
- **Compliance Reports**: CIS benchmarks, NSA/CISA guidance, and Pod Security Standards
- **SBOM Generation**: Software Bill of Materials for workloads

## Installation

This component is installed via Flux using the Aqua Security Helm chart repository.

## Configuration

The operator is configured with:

- **Resource limits and requests** for stability
- **ServiceMonitor enabled** for Prometheus integration with proper labels
- **Metrics fully enabled** for comprehensive monitoring:
  - `metricsFindingsEnabled: true` - Vulnerability findings metrics
  - `metricsVulnIdEnabled: true` - Vulnerability ID metrics
  - `metricsExposedSecretInfo: true` - Exposed secret information
  - `metricsConfigAuditInfo: true` - Configuration audit details
  - `metricsRbacAssessmentInfo: true` - RBAC assessment information
  - `metricsInfraAssessmentInfo: true` - Infrastructure assessment data
  - `metricsImageInfo: true` - Container image information
  - `metricsClusterComplianceInfo: true` - Cluster compliance metrics
- **Service configuration** optimized for ServiceMonitor scraping:
  - `headless: false` - Standard ClusterIP service for cross-namespace access
  - `metricsPort: 80` - Metrics exposed on port 80
- **Latest stable versions** of both operator and Trivy scanner

## Monitoring

The operator exposes comprehensive metrics that are scraped by Prometheus via ServiceMonitor:

- **ServiceMonitor**: Configured with `release: kube-prometheus-stack` label
- **Metrics endpoint**: Accessible on port 80 with thousands of Trivy-specific metrics
- **Dashboard**: Grafana dashboard provisioned via ConfigMapGenerator for visualization

## Usage

Once deployed, Trivy Operator will automatically:

- Scan new workloads for vulnerabilities
- Generate security reports as Kubernetes CRDs
- Provide security insights through the Kubernetes API
- Expose metrics for monitoring and alerting

## Resources

- [Trivy Operator Documentation](https://aquasecurity.github.io/trivy-operator/latest/)
- [Helm Chart Repository](https://aquasecurity.github.io/helm-charts/)
