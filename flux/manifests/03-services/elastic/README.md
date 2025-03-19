# Elastic Stack Deployment

This directory contains the Kubernetes manifests for deploying the Elastic Stack (Elasticsearch, Kibana, and Fleet) using the Elastic Cloud on Kubernetes (ECK) operator.

## Components

### Elasticsearch

- Multi-node deployment with dedicated master and data nodes
- Persistent storage using Longhorn
- JVM heap sizes optimized for each node role

### Kibana

- Single instance deployment
- Fleet Integration enabled for:
  - System monitoring
  - Kubernetes monitoring
  - Prometheus metrics collection
  - Fleet Server management

## Access

The stack is deployed in the `elastic` namespace. External access will be configured via Gateway API.

## Security

- TLS is disabled for internal communication
- Authentication is managed via file realm
- Secrets are stored in Kubernetes secrets

## Monitoring

The deployment includes comprehensive monitoring through Fleet:

- System metrics
- Kubernetes metrics
- Prometheus metrics
- Log collection

## Dependencies

- Kubernetes cluster
- Longhorn storage class
- Flux for GitOps deployment
