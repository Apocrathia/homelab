# ocsf — record_integrity read-back and strip

`read.tql` and `strip.tql`, the OCSF leg of the record_integrity lane. `read` is
the bounded, round-trip-inverting read-back from the `ocsf` class tables;
`strip` inverts the ClickHouse write-side transforms so verify recomputes the
stamp-side hash input.

> **Navigation**: [← Back to record_integrity README](../README.md)
