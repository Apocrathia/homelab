# defaults: hardening role variables

`main.yml` holds the opt-in host firewall: `hardening_firewall_manage` (off by
default), trusted sources limited to 10/8 and 192.168/16 (guest and tailnet
ranges deliberately absent), and allowed tcp ports 22 and 443.

> **Navigation**: [← Back to hardening: devsec hardening role](../README.md)
