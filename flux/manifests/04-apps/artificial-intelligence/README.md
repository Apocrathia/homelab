# Artificial Intelligence Applications

This directory contains AI and machine learning applications for the homelab infrastructure.

> **Navigation**: [← Back to Apps README](../README.md)

## Applications

### [OpenWebUI](./openwebui/README.md)

User-friendly web interface for interacting with Large Language Models (LLMs) through chat interfaces.

### [Flowise](./flowise/README.md)

Open-source platform for building and deploying AI agents, providing a user-friendly web interface for interacting with Large Language Models (LLMs) through chat interfaces.

### [MLflow](./mlflow/README.md)

Open-source platform for the machine learning lifecycle with experiment tracking, model registry, and deployment capabilities.

### [LiteLLM](./litellm/README.md)

Unified interface for 100+ LLMs with OpenAI proxy compatibility, providing seamless integration with various AI model providers.

### [llm-d](./llm-d/README.md)

Kubernetes-native distributed inference serving stack for large language models, providing optimized deployment patterns with vLLM and Inference Gateway.

### [Guardrails AI](./guardrails-ai/README.md)

API server providing guardrails validation for LLM outputs using community validators from the Guardrails Hub, designed for LiteLLM integration.

### [MCP Servers](./mcp-servers/README.md)

Model Context Protocol servers providing specialized functionality for AI client integration.

## Overview

Artificial intelligence applications provide tools for:

- **LLM Interaction**: Web-based chat interfaces for language models
- **LLM Proxy Services**: Unified API access to multiple LLM providers
- **LLM Validation**: Guardrails for output validation and safety checks
- **ML Lifecycle Management**: Experiment tracking, model registry, and deployment
- **MCP Integration**: Specialized servers for AI client functionality
- **Vulnerability Scanning**: Security analysis through OSV database integration
- **Web Content Processing**: URL content retrieval and processing
- **Kubernetes Management**: Direct cluster access for AI-assisted operations

All applications are deployed via Flux GitOps and integrate with the homelab's authentication, monitoring, and gateway infrastructure.
