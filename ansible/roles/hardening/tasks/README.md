# tasks — hardening role logic

`main.yml` applies the devsec.hardening ssh and os roles, then `firewall.yml`
configures ufw when `hardening_firewall_manage` is true. Rules land before
enable so a half-configured firewall never cuts the SSH session.

> **Navigation**: [← Back to hardening — devsec hardening role](../README.md)
