# LeaderWorkerSet

Kubernetes controller for managing distributed workloads with leader-worker patterns.

> **Navigation**: [← Back to Services README](../README.md)

## Documentation

- **[LeaderWorkerSet Documentation](https://lws.sigs.k8s.io/)** - Primary documentation source
- **[GitHub Repository](https://github.com/kubernetes-sigs/lws)** - Source code and issues

## Overview

LeaderWorkerSet provides a Kubernetes-native way to deploy distributed workloads that require coordination between leader and worker pods. This is used by `llm-d` for multi-node data parallelism in LLM inference.

## Components

- **LeaderWorkerSet CRD**: Custom resource for defining leader-worker workloads
- **Controller**: Manages the lifecycle of LeaderWorkerSet resources
- **Webhooks**: Validating and mutating admission webhooks

## Usage

This service is automatically deployed and provides the `LeaderWorkerSet` CRD for use by other components like `llm-d` ModelService.
