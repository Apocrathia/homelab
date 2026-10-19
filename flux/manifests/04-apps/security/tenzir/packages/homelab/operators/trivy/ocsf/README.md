# trivy OCSF map

[`map.tql`](./map.tql): trivy report -> OCSF. VulnerabilityReport maps
to Vulnerability Finding (2002) with the CVE list; ExposedSecretReport
maps to Detection Finding (2004). Tenzir upstream documents no
vulnerability-finding class mapping; this map is the homelab convention
(documented in the [`detections/`](../../../../detections/README.md)
class taxonomy).
