# Ruffle

> **Navigation**: [← Media Apps](../README.md)

## Overview

Flash Player emulator in Rust/WebAssembly. Run .swf files in the browser without any plugin.

**URL:** <https://ruffle.gateway.services.apocrathia.com>

## Authentication

Authentik proxy.

## Troubleshooting

```bash
kubectl get pods -n ruffle
kubectl logs -n ruffle -l app.kubernetes.io/name=ruffle -c fetch-ruffle
```

## References

- **[GitHub](https://github.com/ruffle-rs/ruffle)** - Source code and issues
- **[Website](https://ruffle.rs)** - Project website
