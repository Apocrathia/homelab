# YARA detections scaffold

Scaffolding for future byte-stream detection. No pipeline consumes this
content today: the tenzir `yara` operator (YARA-X) needs a finite byte
source — a file ingest, an image-layer scanner, a captured-payload feed —
and none of those pipelines exist yet.

- [`signature-base/`](./signature-base/) holds a small, byte-identical
  vendored subset of the [`third-party/signature-base`](../../../../../third-party/signature-base/)
  submodule (Neo23x0 signature-base, pinned gitlink, Renovate bump
  channel — same mechanics as the SigmaHQ setup). Re-copy the subset on
  submodule bumps; never reformat. The `.prettierignore` and `.yamllint`
  exemptions cover it.
- Rule subsets picked for the homelab surface: npm/node supply-chain
  implants, hacktool and C2 patterns, webshell signatures. Files with
  YARA-X module imports outside the tenzir whitelist (`vt`, `magic`,
  `cuckoo` are banned) are skipped by selection, not fixed in place.
- When a byte-source pipeline lands, the kustomization renders these
  files as ConfigMaps and the node mounts them at
  `/etc/tenzir/yara/signature-base/<subset>` for a
  `yara path=...` pipeline — the same pattern the sigma directories use.
  That plumbing rides the consumer MR, not this scaffold.
