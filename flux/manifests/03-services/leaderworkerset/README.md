# LeaderWorkerSet

Kubernetes controller for managing distributed workloads with leader-worker patterns.

> **Navigation**: [← Back to Services README](../README.md)

## Overview

Deploys distributed workloads that need coordination between leader and worker pods. `llm-d` uses it for multi-node data parallelism in LLM inference.

## Components

- `LeaderWorkerSet` CRD for defining leader-worker workloads
- Controller managing their lifecycle
- Validating and mutating admission webhooks

## Usage

This service is automatically deployed and provides the `LeaderWorkerSet` CRD for use by other components like `llm-d` ModelService.

## References

- **[LeaderWorkerSet Documentation](https://lws.sigs.k8s.io/)** - Primary documentation source
- **[GitHub Repository](https://github.com/kubernetes-sigs/lws)** - Source code and issues
