# Ruffle

[← Media Apps](../README.md)

## Links

- [GitHub](https://github.com/ruffle-rs/ruffle)
- [Website](https://ruffle.rs)

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
