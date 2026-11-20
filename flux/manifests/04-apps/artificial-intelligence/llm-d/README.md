# llm-d

Kubernetes-native distributed inference serving stack for large language models (LLMs).

> **Navigation**: [← Back to AI Applications README](../README.md)

## Overview

llm-d runs distributed inference by combining:

- **vLLM**: Default model server and inference engine
- **Inference Gateway (IGW)**: Request scheduler and load balancer
- **Kubernetes**: Infrastructure orchestrator and workload control plane

## Architecture

llm-d provides several deployment patterns:

- **Intelligent Inference Scheduling**: Deploy vLLM behind the Inference Gateway with optimized load balancing
- **Prefill/Decode Disaggregation**: Split inference into prefill and decode phases for better performance
- **Wide Expert-Parallelism**: Scale large MoE models with Data Parallelism and Expert Parallelism

## Prerequisites

- CPU-only deployment: this cluster has no accelerators, `accelerator.type: cpu` in `helmrelease.yaml` keeps the chart from injecting GPU requests
- Hugging Face token for model downloads: `HF_TOKEN` field on the `llm-d-secrets` 1Password item (field name is case-sensitive)

## Deployment

The `llm-d-modelservice` Helm chart runs in the `llm-d` namespace as an
**inference-sim** simulator:

- `inference-sim` serves the API shape without running models, a development
  shape, not real inference, and it needs no GPU
- Model artifacts are pinned in `helmrelease.yaml`
  (`modelArtifacts.name: llm-d/inference-sim`)
- A routing proxy sidecar fronts the decode pods; an `InferencePool` groups
  them. Routing currently goes through LiteLLM, so the InferencePool is
  optional (see `inferencepool.yaml`)

## Access

Internal only, no Gateway route:

- **Service**: `http://llm-d-modelservice.llm-d.svc.cluster.local:8000`

## Configuration

Model artifacts, accelerator type, and routing settings live in
`helmrelease.yaml`; decode-pod grouping in `inferencepool.yaml`. See the
[ModelService guide](https://llm-d.ai/docs/architecture/Components/modelservice)
for the full custom-resource shape.

## Troubleshooting

```bash
# Pod status
kubectl get pods -n llm-d

# Check ModelService resources
kubectl get modelservices -n llm-d

# Decode pod logs
kubectl logs -n llm-d -l llm-d.ai/role=decode --tail=50
```

## References

- **[llm-d Documentation](https://llm-d.ai/docs/)** - Official documentation
- **[GitHub Repository](https://github.com/llm-d/llm-d)** - Source code and issues
- **[ModelService Guide](https://llm-d.ai/docs/architecture/Components/modelservice)** - Model deployment guide
