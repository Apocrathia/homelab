# signature-base vendored subset

Nine byte-identical YARA rules copied from the pinned
[`third-party/yara-signature-base`](../../../../../../../../third-party/yara-signature-base/)
submodule. The subsets pick the homelab-relevant surface; files with
YARA-X module imports outside the tenzir whitelist are skipped by
selection. Re-copy on submodule bumps, never reformat. See the
[`yara/`](../README.md) README for the scaffold status.
