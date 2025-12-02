# LeaderWorkerSet

Kubernetes controller for managing distributed workloads with leader-worker patterns.

## Overview

LeaderWorkerSet provides a Kubernetes-native way to deploy distributed workloads that require coordination between leader and worker pods. This is used by `llm-d` for multi-node data parallelism in LLM inference.

## Components

- **LeaderWorkerSet CRD**: Custom resource for defining leader-worker workloads
- **Controller**: Manages the lifecycle of LeaderWorkerSet resources
- **Webhooks**: Validating and mutating admission webhooks

## Usage

This service is automatically deployed and provides the `LeaderWorkerSet` CRD for use by other components like `llm-d` ModelService.

## Resources

- [LeaderWorkerSet Documentation](https://lws.sigs.k8s.io/)
- [GitHub Repository](https://github.com/kubernetes-sigs/lws)
