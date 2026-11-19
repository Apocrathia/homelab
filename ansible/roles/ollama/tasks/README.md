# tasks — ollama role logic

`main.yml` installs the installer prereqs (zstd, pciutils — never curl on
Fedora), probes the installed version, and re-runs the official install.sh only
when the version drifted. The systemd unit and the model store stay untouched.

> **Navigation**: [← Back to ollama README](../README.md)
