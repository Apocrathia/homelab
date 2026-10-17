---
title: "YARA integration"
description: "Scan files and byte streams with YARA-X rules directly in the pipeline."
canonical: https://tenzir.com/integrations/yara
source: https://tenzir.com/integrations/yara.md
section: "Integrations"
---

# YARA integration

> Scan files and byte streams with YARA-X rules directly in the pipeline.

[YARA](https://virustotal.github.io/yara-x/) is the standard language for describing byte-level patterns in files and payloads, from malware family signatures to generic packer heuristics.

Tenzir executes YARA rules with the [`yara`](https://tenzir.com/docs/reference/operators/yara.md) operator, built on the modern [YARA-X](https://virustotal.github.io/yara-x/) engine. Any pipeline that produces bytes can feed it: files from disk or object storage, extracted payloads, or artifacts fetched over HTTP. Every matching rule produces an OCSF Detection Finding with the Security Control profile, so YARA verdicts flow through the same finding-centric machinery as the rest of your detections.

## Scan artifacts in the pipeline

```tql
from_file "s3://quarantine/uploads/sample.exe", mmap=true {
  yara path="/opt/rules/malware"
}
publish "findings"
```

Rules compile when the pipeline starts, and the operator scans the complete input once it ends, so matches can span chunk boundaries. Compilation uses a fixed, vetted YARA-X module set; the [`yara`](https://tenzir.com/docs/reference/operators/yara.md) reference lists the enabled modules and scan limits.

## Learn more

* [`yara`](https://tenzir.com/docs/reference/operators/yara.md) documents the operator, its arguments, and the OCSF output.
* [Scan bytes with YARA](../guides/detect/scan-bytes-with-yara.md) walks through scanning files and payloads.
* [Detections](../explanations/detections.md) explains Tenzir’s detection model.
