---
title: "Kunai integration"
description: "Monitors Linux hosts with eBPF and records process, file, and network activity."
canonical: https://tenzir.com/integrations/kunai
source: https://tenzir.com/integrations/kunai.md
section: "Integrations"
---

# Kunai integration

> Monitors Linux hosts with eBPF and records process, file, and network activity.

[Kunai](https://why.kunai.rocks) is an eBPF-based security monitor for Linux, comparable to [Sysmon](sysmon.md) on Windows. Key features include:

* **Process tracking**: Records process launches, exits, and ancestry.
* **File and network monitoring**: Logs file access and changes, network connections, and DNS queries.
* **Kernel activity**: Reports module loads, BPF programs, and executable memory mappings.
* **Detection engine**: Matches events against rules and IoCs, and annotates matches with severity and ATT\&CK techniques.

Kunai writes one JSON object per event to a single output. The `output.path` in the Kunai configuration selects it: `stdout` by default, or a file. The `kunai install` command sets up a service that writes to `/var/log/kunai/events.log`. Kunai has no network output, so a Tenzir pipeline reads the events locally.

## Collect Kunai events

Tenzir reads Kunai’s JSON natively, so you need no parser. The typical setup runs a Tenzir node on the same host as Kunai and deploys the pipeline to that node, for example from the Tenzir Platform. Kunai runs as a service that writes to `/var/log/kunai/events.log`, and the pipeline watches that file with [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md) and parses each line with [`read_ndjson`](https://tenzir.com/docs/reference/operators/read_ndjson.md):

```tql
from_file "/var/log/kunai/events.log", watch=10s {
  read_ndjson
}
```

Because Kunai has no network output, run one node per host to collect events from many hosts, or forward the file with a log shipper such as [Fluent Bit](fluent-bit.md).

Run a pipeline from the command line

Without a node, you can also run Kunai in the foreground and pipe its `stdout` into the `tenzir` binary. The default configuration writes every event to `stdout` without buffering, so [`from_stdin`](https://tenzir.com/docs/reference/operators/from_stdin.md) receives a live stream:

```sh
kunai | tenzir 'from_stdin { read_ndjson }'
```

## Map events to OCSF

[Install the Kunai package](../guides/packages/install-a-package.md) to map events to OCSF. The `kunai::ocsf::normalize` operator picks the OCSF class from the event name, for example Process Activity for `execve`, File System Activity for `file_create`, and Network Activity for `connect`:

```tql
from_file "/var/log/kunai/events.log", watch=10s {
  read_ndjson
}
kunai::ocsf::normalize
ocsf_derive
drop_null_fields
```

The following example shows a Kunai `execve` event, where user `alice` runs `ls -la /tmp` from a shell, and the OCSF event that the pipeline produces:

Kunai input

Kunai records the launch of `ls` as one JSON object:

```json
{
  "data": {
    "ancestors": [
      "/usr/lib/systemd/systemd",
      "/usr/sbin/sshd",
      "/usr/sbin/sshd",
      "/usr/bin/bash"
    ],
    "parent_command_line": "-bash",
    "parent_exe": "/usr/bin/bash",
    "command_line": "ls -la /tmp",
    "exe": {
      "path": "/usr/bin/ls",
      "magic": "ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV)",
      "md5": "e94d7ce68f3bb8261acf37e3f9230f92",
      "sha1": "f02e779d0b359052dc8827ec91eafafe2f730673",
      "sha256": "bf1c32c3ce623b191156458fdc57b1638419ab4fe492488b12c451d543fa784d",
      "sha512": "60fca61359eb24c2dc46f8153e03152f357e822528714a3fefe7904af3b3cc2e73ee537f1ce72e6245130eba8fb746b7ce5a69799a62798e29b30982d61c42a8",
      "size": 138208,
      "error": null
    }
  },
  "info": {
    "host": {
      "uuid": "c030b40d-0eab-417b-b33a-22d952357984",
      "name": "hal",
      "container": null
    },
    "event": {
      "source": "kunai",
      "id": 1,
      "name": "execve",
      "uuid": "532dfd45-bba2-5e48-8d8e-8df24fc221cd",
      "batch": 101
    },
    "task": {
      "name": "ls",
      "pid": 41310,
      "tgid": 41310,
      "guuid": "d1f1c8a2-4b7c-0000-3f9e-5d7a2e0c0000",
      "creds": {
        "effective": {
          "uid": 1000,
          "user": "alice",
          "gid": 1000,
          "group": "alice"
        }
      },
      "namespaces": {
        "mnt": 4026531841
      },
      "flags": "0x400000",
      "zombie": false
    },
    "parent_task": {
      "name": "bash",
      "pid": 41200,
      "tgid": 41200,
      "guuid": "5b0c2d57-a010-0000-9b2e-6c4f6e040000",
      "creds": {
        "effective": {
          "uid": 1000,
          "user": "alice",
          "gid": 1000,
          "group": "alice"
        }
      },
      "namespaces": {
        "mnt": 4026531841
      },
      "flags": "0x400000",
      "zombie": false
    },
    "utc_time": "2026-03-09T09:53:38.033681058Z"
  }
}
```

OCSF output

The pipeline above turns it into an OCSF Process Activity event with the activity Launch. The process, its parent, and its ancestry move to their OCSF attributes, and the file hashes become a list of algorithm and value pairs:

```tql
{
  metadata: {
    version: "1.9.0",
    product: {
      name: "Kunai",
      vendor_name: "Kunai Project",
    },
    profiles: [
      "host",
    ],
    event_code: "execve",
    uid: "532dfd45-bba2-5e48-8d8e-8df24fc221cd",
  },
  severity: "Informational",
  severity_id: 1,
  time: 2026-03-09T09:53:38.033681058Z,
  device: {
    hostname: "hal",
    uid: "c030b40d-0eab-417b-b33a-22d952357984",
  },
  category_name: "System Activity",
  category_uid: 1,
  class_name: "Process Activity",
  class_uid: 1007,
  activity_id: 1,
  activity_name: "Launch",
  launch_type: "Exec",
  launch_type_id: 3,
  process: {
    name: "ls",
    pid: 41310,
    ptid: 41310,
    uid: "d1f1c8a2-4b7c-0000-3f9e-5d7a2e0c0000",
    user: {
      uid: "1000",
      name: "alice",
      groups: [
        {
          uid: "1000",
          name: "alice",
        },
      ],
    },
    parent_process: {
      name: "bash",
      pid: 41200,
      ptid: 41200,
      uid: "5b0c2d57-a010-0000-9b2e-6c4f6e040000",
      user: {
        uid: "1000",
        name: "alice",
        groups: [
          {
            uid: "1000",
            name: "alice",
          },
        ],
      },
      file: {
        name: "bash",
        path: "/usr/bin/bash",
        type: "Executable File",
        type_id: 8,
      },
      cmd_line: "-bash",
    },
    cmd_line: "ls -la /tmp",
    file: {
      name: "ls",
      path: "/usr/bin/ls",
      type: "Executable File",
      type_id: 8,
      desc: "ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV)",
      size: 138208,
      hashes: [
        {
          algorithm: "MD5",
          algorithm_id: 1,
          value: "e94d7ce68f3bb8261acf37e3f9230f92",
        },
        {
          algorithm: "SHA-1",
          algorithm_id: 2,
          value: "f02e779d0b359052dc8827ec91eafafe2f730673",
        },
        {
          algorithm: "SHA-256",
          algorithm_id: 3,
          value: "bf1c32c3ce623b191156458fdc57b1638419ab4fe492488b12c451d543fa784d",
        },
        {
          algorithm: "SHA-512",
          algorithm_id: 4,
          value: "60fca61359eb24c2dc46f8153e03152f357e822528714a3fefe7904af3b3cc2e73ee537f1ce72e6245130eba8fb746b7ce5a69799a62798e29b30982d61c42a8",
        },
      ],
    },
    ancestry: [
      {
        path: "/usr/bin/bash",
        name: "bash",
      },
      {
        path: "/usr/sbin/sshd",
        name: "sshd",
      },
      {
        path: "/usr/sbin/sshd",
        name: "sshd",
      },
      {
        path: "/usr/lib/systemd/systemd",
        name: "systemd",
      },
    ],
  },
  actor: {
    process: {
      pid: 41310,
      ptid: 41310,
      uid: "d1f1c8a2-4b7c-0000-3f9e-5d7a2e0c0000",
    },
  },
  type_name: "Process Activity: Launch",
  type_uid: 100701,
  unmapped: {
    info: {
      event: {
        batch: 101,
      },
      task: {
        namespaces: {
          mnt: 4026531841,
        },
        flags: "0x400000",
        zombie: false,
      },
      parent_task: {
        namespaces: {
          mnt: 4026531841,
        },
        flags: "0x400000",
        zombie: false,
      },
    },
  },
}
```

Events that Kunai’s own rules matched become alerts in the OCSF Security Control profile, with a severity that follows the rule severity and the ATT\&CK techniques of the rules. Select them without knowing which rule fired:

```tql
from_file "/var/log/kunai/events.log", watch=10s {
  read_ndjson
}
kunai::ocsf::normalize
where is_alert? == true
```

The mapping targets the event layout of Kunai after 0.7.0-rc.1. Earlier releases are not supported.
