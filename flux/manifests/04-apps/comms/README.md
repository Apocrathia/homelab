# Comms

Communications and field-coordination services for the homelab.

> **Navigation**: [← Back to Apps README](../README.md)

## Applications

### [OpenTAKServer](./ots/README.md)

Open-source TAK server for ATAK: CoT streaming, mission and datapackage sync, and client certificate enrollment, with Authentik LDAP as the only login path. WebUI behind Authentik proxy; ATAK traffic on TCP 8088/8089/8443/8446 via Gateway API TCPRoutes (LAN + tailnet).

## Overview

The comms group covers team coordination tooling. Current stack pairs OpenTAKServer for map/tactical data with [Mumble](../social/mumble/README.md) (social group) for voice; Revolt for text chat is still under evaluation.

## References

- **[OpenTAKServer](https://github.com/brian7704/OpenTAKServer)** - TAK server
- **[TAK Product Center](https://tak.gov)** - official (gated) TAK ecosystem
