# SigmaHQ kubernetes/audit

Sixteen vendored rules from the SigmaHQ `kubernetes/audit` corpus. The
rules name raw audit fields (`verb`, `objectRef.*`), which have no OCSF
projection: under `mapping="auto"` each rule skips with one warning per
revision until upstream publishes a translation. The corpus stays
vendored for that translation and the homelab rules
([`../../homelab/`](../../homelab/README.md)) carry live detection
meanwhile.
