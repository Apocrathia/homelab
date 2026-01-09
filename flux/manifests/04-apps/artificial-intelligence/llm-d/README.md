# llm-d

Kubernetes-native distributed inference serving stack for large language models (LLMs).

> **Navigation**: [← Back to AI Applications README](../README.md)

## Documentation

- **[llm-d Documentation](https://llm-d.ai/docs/)** - Official documentation
- **[GitHub Repository](https://github.com/llm-d/llm-d)** - Source code and issues
- **[ModelService Guide](https://llm-d.ai/docs/architecture/Components/modelservice)** - Model deployment guide

## Overview

llm-d accelerates distributed inference by integrating industry-standard open technologies:

- **vLLM**: Default model server and inference engine
- **Inference Gateway (IGW)**: Request scheduler and load balancer
- **Kubernetes**: Infrastructure orchestrator and workload control plane

## Architecture

llm-d provides several deployment patterns:

- **Intelligent Inference Scheduling**: Deploy vLLM behind the Inference Gateway with optimized load balancing
- **Prefill/Decode Disaggregation**: Split inference into prefill and decode phases for better performance
- **Wide Expert-Parallelism**: Scale large MoE models with Data Parallelism and Expert Parallelism

## Prerequisites

- Kubernetes 1.29+
- Accelerator support (NVIDIA GPUs, AMD GPUs, Google TPUs, or Intel XPUs)
- Gateway API provider (for Inference Gateway)
- Hugging Face token (for model downloads)

## Deployment

This deployment uses the ModelService Helm chart which provides:

- Declarative Kubernetes resource management for serving base models
- Disaggregated prefill and decode workloads
- Integration with Gateway API Inference Extension
- Auto-scaling via HPA or custom controllers
- Model loading from Hugging Face, PVCs, or OCI images

## Configuration

After deploying the Helm chart, create `ModelService` custom resources to deploy your models. Example:

```yaml
apiVersion: modelservice.llm-d.ai/v1alpha1
kind: ModelService
metadata:
  name: my-model
  namespace: llm-d
spec:
  # Model configuration
  model:
    source: huggingface
    name: meta-llama/Llama-3.1-8B-Instruct
  # Resource allocation
  resources:
    requests:
      nvidia.com/gpu: 1
```

## Troubleshooting

```bash
# Pod status
kubectl get pods -n llm-d

# Check ModelService resources
kubectl get modelservices -n llm-d

# Model server logs
kubectl logs -n llm-d deployment/llm-d -f

# Inference Gateway logs
kubectl logs -n llm-d deployment/igw -f
```
