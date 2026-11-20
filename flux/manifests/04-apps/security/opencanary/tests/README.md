# opencanary stix_push tests

Stdlib-only behavior test for
[`stix_push.py`](../stix_push.py): runs the script as a subprocess against a
fake Loki (canned `query_range` response) and a fake OpenTAXII (scripted
202-clean / 202-dirty-job / 504 / hang responses), asserting exit codes,
count-and-continue failure accounting, the POSTed STIX 2.1 envelopes, and the
Loki query shape. No framework, no fixtures, no cluster access.

```bash
python3 tests/test_stix_push.py
```

> **Navigation**: [← Back to OpenCanary README](../README.md)
