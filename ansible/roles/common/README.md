# common — host baseline role

Baseline state for every managed host: packages, hostname and timezone, login
user, omz + p10k shell, ghostty terminfo. Branches on `ansible_os_family` —
Debian apt and unattended-upgrades versus RedHat dnf and dnf-automatic.

> **Navigation**: [← Back to roles README](../README.md)
