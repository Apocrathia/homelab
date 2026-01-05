# Prompts

This directory contains prompts and templates for common development processes in the homelab project.

> **Navigation**: [← Home](../README.md)

## Available Prompts

### [Helm Deployment](./helm-deployment.md)

Comprehensive guide for deploying Helm charts in the homelab environment. Covers:

- Chart review and analysis
- HelmRelease configuration
- Authentik integration (proxy vs OIDC providers)
- Database and storage patterns
- Networking and Gateway API configuration
- Documentation standards
- Post-deployment validation

### [MCP Server Deployment](./mcp-deployment.md)

Guide for deploying MCP (Model Context Protocol) servers using ToolHive and integrating with LiteLLM. Covers:

- ToolHive MCPServer custom resource configuration
- Transport types (streamable-http vs sse)
- LiteLLM integration and authentication
- Header forwarding for per-request credentials
- Gateway API HTTPRoute configuration
- Troubleshooting connectivity issues
- Cursor MCP client configuration

### [Security Analyst](./security-analyst.md)

Comprehensive security review prompt for analyzing the homelab Kubernetes project. Covers:

- Automated scanning with Snyk and Semgrep
- STRIPED threat modeling (Spoofing, Tampering, Repudiation, Information Disclosure, Privacy, Elevation of Privilege, Denial of Service)
- Attack path analysis and deep dive investigation
- Kubernetes manifest security review
- Supply chain and CI/CD pipeline security
- Structured finding format with severity classification
- Remediation roadmaps and positive observations

### [Document Review](./document-review.md)

Systematic documentation quality review prompt for maintaining consistency across the repository. Covers:

- Template compliance auditing (structure, navigation, sections)
- Content quality checks (tunable values, external links, code blocks)
- Document type categorization (app READMEs, infrastructure docs, reference docs)
- Structured finding reports with priority classification
- Fix patterns for common issues
- Continuous improvement suggestions

## Usage

These prompts are designed to be used with AI assistants to maintain consistency and best practices when working with the homelab infrastructure. They encode project-specific patterns, conventions, and decision trees to guide development workflows.
