# findings operators

Post-processing for OCSF Detection Finding (2004) records.
[`stamp.tql`](./stamp.tql) adds the stable uid (rule id + subject
fingerprint) that the archive dedup and the triage lifecycle joins use;
sigma findings and trivy secret findings both run through it before
import.
