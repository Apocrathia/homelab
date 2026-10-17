---
title: "Model detections in OCSF"
description: "Choose an OCSF representation for alertable activity, create Detection Findings, and model their lifecycle"
canonical: https://tenzir.com/docs/guides/detect/model-detections-in-ocsf
source: https://tenzir.com/docs/guides/detect/model-detections-in-ocsf.md
section: "Docs"
---

# Model detections in OCSF

> Choose an OCSF representation for alertable activity, create Detection Findings, and model their lifecycle

This guide shows you how to model detection results in [OCSF](https://schema.ocsf.io). Add the [Security Control profile](https://schema.ocsf.io/profiles/security_control) when a verdict belongs on the original activity event. Generate a [Detection Finding](https://schema.ocsf.io/classes/detection_finding) when an analytic result needs its own identity, evidence, and lifecycle.

Schema enforcement is optional

The examples construct their intended OCSF records directly. Add [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md) for enum sibling expansion or [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) for schema enforcement at a pipeline boundary when you need either behavior. They are not part of the detection semantics.

## Choose the OCSF representation

Start by separating alertability from the event shape, then decide whether the judgment belongs on the source activity or in a finding.

### Interpret alertability

OCSF does not infer that an event is an alert from its class, severity, risk, or detection content. The producer expresses that intent with `is_alert: true`, which means the event may require immediate attention from a stream processor, SIEM, product console, or analyst. A blocked low-severity event can be alertable, while a high-severity event does not have to be.

The Detection Finding and [Data Security Finding](https://schema.ocsf.io/classes/data_security_finding) classes carry `is_alert`, as do events augmented with the Security Control profile. Applying the profile to an activity class lets the original activity become an explicit alertable signal without turning it into a finding.

The OCSF article on [modeling alerts](https://github.com/ocsf/ocsf-docs/blob/main/articles/modeling-alerts.md) explains the central distinction: a Security Control event records an activity and the control’s real-time judgment, while a Detection Finding records the result of analysis over one or more events.

### Choose an activity event or a finding

Ask where the detection judgment belongs:

| Representation                          | Use it when                                                                                    | What the event represents                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Activity event with Security Control    | A control observes or intervenes in an activity and reports its action and disposition.        | The original activity augmented with the control’s judgment. |
| Detection Finding                       | An analytic produces a result that needs independent identity, evidence, triage, or lifecycle. | A new finding created from one or more source events.        |
| Detection Finding with Security Control | Analysis happens at a control or enforcement point and also needs a disposition.               | A finding augmented with the control’s action and outcome.   |

## Tag an event as an alert

Use the Security Control profile when the verdict belongs to the activity that the control observed.

Tag without a security judgment

For classification without a security judgment, add a label such as `"deep-analysis"` or `"noise"` to `metadata.labels`. The guide on [routing with event labels](../route/split-and-merge-streams.md#route-with-event-labels) shows how a later pipeline can select the label without setting `is_alert` or expressing a Security Control verdict.

### Add the Security Control profile

Not every match warrants a standalone finding. A lighter-weight pattern marks interesting events in place and forwards them, for example routing every PowerShell launch to the SIEM while the bulk of process activity takes a cheaper path. The following pipeline marks one [Process Activity](https://schema.ocsf.io/classes/process_activity) event as alertable:

```tql
from {
  time: 2026-07-01T12:00:00Z,
  metadata: {
    product: {name: "Windows Security", vendor_name: "Microsoft"},
    uid: "process-activity-52501",
    version: "1.9.0",
  },
  class_uid: 1007,
  category_uid: 1,
  activity_id: 1,
  severity_id: 1,
  device: {hostname: "ws-17"},
  actor: {user: {name: "alice"}},
  process: {name: "PowerShell.EXE", cmd_line: "powershell.exe -File C:\\scripts\\report.ps1"},
}, {
  time: 2026-07-01T12:01:00Z,
  metadata: {
    product: {name: "Windows Security", vendor_name: "Microsoft"},
    uid: "process-activity-52502",
    version: "1.9.0",
  },
  class_uid: 1007,
  category_uid: 1,
  activity_id: 1,
  severity_id: 1,
  device: {hostname: "ws-17"},
  actor: {user: {name: "alice"}},
  process: {name: "notepad.exe", cmd_line: "notepad.exe C:\\Users\\alice\\notes.txt"},
}
// class_name: "Process Activity", activity_name: "Launch"
where class_uid == 1007 and activity_id == 1
where process.name.equals("powershell.exe", ignore_case=true)
metadata.profiles = ["security_control"]
is_alert = true
action_id = 3       // Observed: the control neither allowed nor denied it
disposition_id = 15 // Detected
type_uid = class_uid * 100 + activity_id
```

```tql
{
  time: 2026-07-01T12:00:00Z,
  metadata: {
    product: {
      name: "Windows Security",
      vendor_name: "Microsoft",
    },
    uid: "process-activity-52501",
    version: "1.9.0",
    profiles: [
      "security_control",
    ],
  },
  class_uid: 1007,
  category_uid: 1,
  activity_id: 1,
  severity_id: 1,
  device: {
    hostname: "ws-17",
  },
  actor: {
    user: {
      name: "alice",
    },
  },
  process: {
    name: "PowerShell.EXE",
    cmd_line: "powershell.exe -File C:\\scripts\\report.ps1",
  },
  is_alert: true,
  action_id: 3,
  disposition_id: 15,
  type_uid: 100701,
}
```

### Record the control action and disposition

Action versus disposition

A security control is a sensor or enforcement point such as an IDS, EDR agent, or firewall. Its `action_id` describes broadly what it did: observe, allow, deny, or modify an activity. Its `disposition_id` records the more specific outcome, such as detected, blocked, quarantined, or logged.

Declaring `security_control` in `metadata.profiles` activates the profile’s attributes on the Process Activity event. `action_id: 3` (`Observed`) says the control neither allowed nor denied the process launch, while `disposition_id: 15` (`Detected`) records its judgment. Use `Allowed`, `Denied`, or another action when the control actively enforces a decision.

The event remains alertable even though `severity_id: 1` marks it as informational. Severity describes the effort and urgency required to handle the event; `is_alert` expresses whether a consumer should consider it for immediate attention.

### Route alertable events

Downstream logic can route every alertable event without knowing its activity class or why the producer flagged it:

```tql
where is_alert? == true
publish "alerts"
```

The original Process Activity shape remains available to the consumer. The guide on [sending data to destinations](../route/send-to-destinations.md) covers the delivery side.

## Create a Detection Finding

Use a Detection Finding when an analytic consumes one or more source events and produces a result that needs independent identity, evidence, and workflow. This lets routing, suppression, and case management treat detections uniformly without knowing which predicate produced them.

### Assign stable finding and analytic identities

The [Finding Information object](https://schema.ocsf.io/objects/finding_info) requires `finding_info.uid`. Build it from stable analytic and source-event identities so rerunning the detection produces the same finding identifier. Keep this identifier unchanged when the finding is updated or closed.

The nested [Analytic object](https://schema.ocsf.io/objects/analytic) identifies what produced the result. Give it a stable `uid`, a human-readable `name`, an analytic `type_id`, and a version when the detection content is versioned.

When the analytic maps to MITRE ATT\&CK, record the tactic and technique in `finding_info.attacks` using the [Attack object](https://schema.ocsf.io/objects/attack). Consumers can then route and correlate findings by technique instead of parsing titles.

Finding identity versus event identity

`finding_info.uid` identifies the logical finding and stays unchanged across Create, Update, and Close events. `metadata.uid` identifies one emitted OCSF event in that lifecycle, so each update or close receives a new value.

### Attach evidence and source-event references

A finding can preserve detection context in two complementary ways:

Evidence versus related events

* The [Evidence Artifacts object](https://schema.ocsf.io/objects/evidences) embeds the actors, processes, files, endpoints, or other artifacts that triggered the detection.
* [Related Event objects](https://schema.ocsf.io/objects/related_event) reference retained source events by `metadata.uid` without copying their complete contents into the finding.

Use concise evidence when analysts need immediate context, event references when they need complete traceability, or both as the example does.

### Set the triage fields

Keep the finding’s triage dimensions independent:

| Field           | Meaning                                                       |
| --------------- | ------------------------------------------------------------- |
| `severity_id`   | The effort and urgency required to handle the finding.        |
| `confidence_id` | The analytic’s expected accuracy.                             |
| `status_id`     | The finding’s workflow state.                                 |
| `is_alert`      | Whether this lifecycle event may require immediate attention. |

A high-confidence finding can have low severity, and a high-severity finding does not have to be alertable. A newly created detection that should enter an analyst queue commonly uses `status_id: 1` (`New`) and `is_alert: true`.

### Build the finding

The following example reshapes the credential-dump match from our guide on [packaging a complete TQL detection](match-events-with-tql.md#package-the-complete-detection):

```tql
let $finding_time = 2026-04-28T10:01:05Z


from {
  time: 2026-04-28T10:01:00Z,
  metadata: {
    product: {name: "Windows Security", vendor_name: "Microsoft"},
    uid: "process-activity-52517",
    version: "1.9.0",
  },
  class_uid: 1007,
  activity_id: 1,
  severity_id: 1,
  device: {hostname: "WORKSTATION-17"},
  actor: {user: {name: "alice"}},
  process: {
    name: "print.exe",
    path: "C:\\Windows\\System32\\print.exe",
    file: {internal_name: "Print.EXE"},
    cmd_line: "print.exe /D:C:\\Windows\\System32\\config\\SAM C:\\Temp\\sam.bak",
  },
}
// class_name: "Process Activity", activity_name: "Launch"
where class_uid == 1007 and activity_id == 1
where process.cmd_line.match_regex(r"(?i)[/-]d") and process.cmd_line.match_regex(
  r"(?i)\\config\\(sam|security|system)|\\windows\\ntds\\ntds\.dit"
)
this = {
  time: $finding_time,
  metadata: {
    product: {name: "Tenzir", vendor_name: "Tenzir"},
    uid: f"finding-create-{metadata.uid}",
    version: "1.9.0",
  },
  class_uid: 2004,
  category_uid: 2,
  activity_id: 1,
  severity_id: 4,
  confidence_id: 3,
  status_id: 1,
  is_alert: true,
  finding_info: {
    uid: f"print-dump-{metadata.uid}",
    title: "Sensitive File Dump Via Print.EXE",
    created_time: $finding_time,
    first_seen_time: time,
    last_seen_time: time,
    analytic: {
      name: "Sensitive File Dump Via Print.EXE",
      uid: "windows_threats::print_sensitive_dump",
      type_id: 1,
      version: "1.0.0",
    },
    // The ATT&CK mapping travels inside the finding as data.
    attacks: [{
      tactic: {uid: "TA0006", name: "Credential Access"},
      technique: {uid: "T1003", name: "OS Credential Dumping"},
      sub_technique: {uid: "T1003.002", name: "Security Account Manager"},
    }],
    related_events: [{
      uid: metadata.uid,
      type_uid: class_uid * 100 + activity_id,
      created_time: time,
      severity_id: severity_id,
    }],
  },
  device: device,
  evidences: [{uid: metadata.uid, actor: actor, process: process}],
}
type_uid = class_uid * 100 + activity_id
```

```tql
{
  time: 2026-04-28T10:01:05Z,
  metadata: {
    product: {
      name: "Tenzir",
      vendor_name: "Tenzir",
    },
    uid: "finding-create-process-activity-52517",
    version: "1.9.0",
  },
  class_uid: 2004,
  category_uid: 2,
  activity_id: 1,
  severity_id: 4,
  confidence_id: 3,
  status_id: 1,
  is_alert: true,
  finding_info: {
    uid: "print-dump-process-activity-52517",
    title: "Sensitive File Dump Via Print.EXE",
    created_time: 2026-04-28T10:01:05Z,
    first_seen_time: 2026-04-28T10:01:00Z,
    last_seen_time: 2026-04-28T10:01:00Z,
    analytic: {
      name: "Sensitive File Dump Via Print.EXE",
      uid: "windows_threats::print_sensitive_dump",
      type_id: 1,
      version: "1.0.0",
    },
    attacks: [
      {
        tactic: {
          uid: "TA0006",
          name: "Credential Access",
        },
        technique: {
          uid: "T1003",
          name: "OS Credential Dumping",
        },
        sub_technique: {
          uid: "T1003.002",
          name: "Security Account Manager",
        },
      },
    ],
    related_events: [
      {
        uid: "process-activity-52517",
        type_uid: 100701,
        created_time: 2026-04-28T10:01:00Z,
        severity_id: 1,
      },
    ],
  },
  device: {
    hostname: "WORKSTATION-17",
  },
  evidences: [
    {
      uid: "process-activity-52517",
      actor: {
        user: {
          name: "alice",
        },
      },
      process: {
        name: "print.exe",
        path: "C:\\Windows\\System32\\print.exe",
        file: {
          internal_name: "Print.EXE",
        },
        cmd_line: "print.exe /D:C:\\Windows\\System32\\config\\SAM C:\\Temp\\sam.bak",
      },
    },
  ],
  type_uid: 200401,
}
```

The example sets the required OCSF identifiers explicitly. The guide on [mapping to OCSF](../normalize/map-to-ocsf.md#use-native-ocsf-operators) explains optional derivation, schema enforcement, validation, and field trimming.

## Manage the finding lifecycle

A Detection Finding uses `activity_id` to distinguish Create, Update, and Close events. Preserve `finding_info.uid` throughout the lifecycle, but assign each emitted event its own `metadata.uid` and `time`. Update `finding_info.modified_time`, `last_seen_time`, evidence, and triage fields as the investigation changes.

Typical lifecycle values look as follows:

| Lifecycle event | `activity_id` | Typical `status_id`                         | Typical alertability                                             |
| --------------- | ------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Create          | `1`           | `1` (`New`)                                 | `is_alert: true` when the new finding needs immediate attention. |
| Update          | `2`           | `2` (`In Progress`) or `3` (`Suppressed`)   | Usually `false` or omitted.                                      |
| Close           | `3`           | `4` (`Resolved`) or another terminal status | Usually `false` or omitted.                                      |

Alert only the lifecycle events that warrant immediate attention rather than reopening the analyst queue for every state change.

A Detection Finding is not automatically an incident. When it requires incident workflow, apply the [Incident profile](https://schema.ocsf.io/profiles/incident) or aggregate it into an [Incident Finding](https://schema.ocsf.io/classes/incident_finding).

## See Also

* [Detections](../../explanations/detections.md)
* [Match events with TQL](match-events-with-tql.md)
* [Detect over time windows](detect-over-time-windows.md)
* [Create multi-stage detectors](create-multi-stage-detectors.md)
* [Map to OCSF](../normalize/map-to-ocsf.md)
* [Send to destinations](../route/send-to-destinations.md)
