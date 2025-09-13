# Weights & Biases Operator

Deploys the Weights & Biases Kubernetes operator for managing W&B server instances.

## Overview

The W&B operator provides custom resource definitions (CRDs) for deploying and managing Weights & Biases server instances in Kubernetes. This operator handles the lifecycle of W&B server deployments, including database setup, configuration, and scaling.

## Components

- **Operator**: The main controller that watches for `WeightsAndBiases` custom resources
- **RBAC**: Service account and cluster role with necessary permissions
- **CRDs**: Custom resource definitions for `WeightsAndBiases` resources

## Usage

After deployment, create a `WeightsAndBiases` custom resource to deploy a W&B server instance:

```yaml
apiVersion: apps.wandb.com/v1
kind: WeightsAndBiases
metadata:
  name: wandb-instance
  namespace: wandb
spec:
  # Your W&B server configuration
```

## Configuration

The operator is configured with:

- Resource limits: 1000m CPU, 2Gi memory
- Resource requests: 400m CPU, 512Mi memory
- Debug mode enabled
- Namespace isolation enabled

## Resources

- **Helm Chart**: [wandb/helm-charts](https://github.com/wandb/helm-charts/tree/main/charts/operator)
- **Container Image**: [wandb/controller](https://hub.docker.com/r/wandb/controller)
- **Source Code**: [wandb/operator](https://github.com/wandb/operator)
- **Documentation**: [W&B Operator Docs](https://docs.wandb.ai/guides/self-hosted/kubernetes-operator)
