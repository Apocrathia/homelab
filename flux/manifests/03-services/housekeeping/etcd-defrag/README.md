# etcd Defragmentation

A weekly CronJob (Sunday 04:00, America/Denver) that runs `talosctl etcd
defrag` against each control-plane node to keep the etcd database from
bloating. A Talos `ServiceAccount` CR with the `os:admin` role generates the
credentials the job mounts.

> **Navigation**: [← Back to Housekeeping README](../README.md)
