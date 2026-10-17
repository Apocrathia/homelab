---
title: "Check Sigma rule compatibility with OCSF"
description: "Test a Sigma rule against a normalized event, inspect its field requirements, and distinguish missing evidence from a nonmatch"
canonical: https://tenzir.com/docs/guides/detect/check-sigma-rule-compatibility-with-ocsf
source: https://tenzir.com/docs/guides/detect/check-sigma-rule-compatibility-with-ocsf.md
section: "Docs"
---

# Check Sigma rule compatibility with OCSF

> Test a Sigma rule against a normalized event, inspect its field requirements, and distinguish missing evidence from a nonmatch

This guide shows you how to check whether your existing Sigma rules can run unchanged on OCSF events. Your pipeline now produces normalized events, but the rules still reference source fields such as `Image` and `CommandLine`. You need to verify both rule support and whether normalization preserved the required evidence.

The [`sigma`](https://tenzir.com/docs/reference/operators/sigma.md) operator translates supported rule predicates to OCSF lookups without changing the rule or event. It cannot recover information lost during normalization. Use the catalog to find your rule’s logsource and field mappings, then follow the worked example to check those fields in an actual normalized event, verify a match, and diagnose missing evidence.

## Mapping catalog

Use this catalog to look up a rule’s `logsource` selector, compatible OCSF class, event guard, and field projections. It starts with **All** products. Select a product to narrow the diagram. Each family shows its selector; select the family to open its field projections. On a narrow screen, expand the family’s row.

| Sigma logsource family                                | Source details                                                                 | OCSF class                | Target details     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------- | ------------------ |
| AWS CloudTrail                                        | product: aws, service: cloudtrail                                              | API Activity              | class\_uid: 6003   |
| Azure activity log                                    | product: azure, service: activitylogs                                          | API Activity              | class\_uid: 6003   |
| Entra ID audit user management                        | product: azure, service: auditlogs                                             | Account Change            | class\_uid: 3001   |
| Entra ID audit directory management                   | product: azure, service: auditlogs                                             | Entity Management         | class\_uid: 3004   |
| Entra ID audit group management                       | product: azure, service: auditlogs                                             | Group Management          | class\_uid: 3006   |
| Entra ID Protection risk detections                   | product: azure, service: riskdetection                                         | Detection Finding         | class\_uid: 2004   |
| Entra ID sign-ins                                     | product: azure, service: signinlogs                                            | Authentication            | class\_uid: 3002   |
| GCP Cloud Audit Logs                                  | product: gcp, service: gcp.audit                                               | API Activity              | class\_uid: 6003   |
| Linux file creation                                   | product: linux, category: file\_event                                          | File System Activity      | class\_uid: 1001   |
| Linux network connection                              | product: linux, category: network\_connection                                  | Network Activity          | class\_uid: 4001   |
| Linux process creation                                | product: linux, category: process\_creation                                    | Process Activity          | class\_uid: 1007   |
| macOS process creation                                | product: macos, category: process\_creation                                    | Process Activity          | class\_uid: 1007   |
| Okta account change                                   | product: okta, service: okta                                                   | Account Change            | class\_uid: 3001   |
| Okta API token and OAuth activity                     | product: okta, service: okta                                                   | API Activity              | class\_uid: 6003   |
| Okta authentication                                   | product: okta, service: okta                                                   | Authentication            | class\_uid: 3002   |
| Okta threat detections                                | product: okta, service: okta                                                   | Detection Finding         | class\_uid: 2004   |
| Okta policy, application, zone, and device management | product: okta, service: okta                                                   | Entity Management         | class\_uid: 3004   |
| Okta group management                                 | product: okta, service: okta                                                   | Group Management          | class\_uid: 3006   |
| Windows AppX package deployments                      | product: windows, service: appxdeployment-server                               | Application Lifecycle     | class\_uid: 6002   |
| Windows BITS transfer jobs                            | product: windows, service: bits-client                                         | HTTP Activity             | class\_uid: 4002   |
| Windows App Control blocks and audits                 | product: windows, service: codeintegrity-operational                           | Application Lifecycle     | class\_uid: 6002   |
| Windows remote thread creation                        | product: windows, category: create\_remote\_thread, service: sysmon (optional) | Process Activity          | class\_uid: 1007   |
| Windows alternate data stream creation                | product: windows, category: create\_stream\_hash, service: sysmon (optional)   | File System Activity      | class\_uid: 1001   |
| Windows DNS client queries                            | product: windows, service: dns-client                                          | DNS Activity              | class\_uid: 4003   |
| Windows DNS query                                     | product: windows, category: dns\_query, service: sysmon (optional)             | DNS Activity              | class\_uid: 4003   |
| Windows driver load                                   | product: windows, category: driver\_load, service: sysmon (optional)           | Kernel Extension Activity | class\_uid: 1002   |
| Windows file deletion                                 | product: windows, category: file\_delete, service: sysmon (optional)           | File System Activity      | class\_uid: 1001   |
| Windows file creation                                 | product: windows, category: file\_event, service: sysmon (optional)            | File System Activity      | class\_uid: 1001   |
| Windows Firewall rule changes                         | product: windows, service: firewall-as                                         | Entity Management         | class\_uid: 3004   |
| Windows image load                                    | product: windows, category: image\_load, service: sysmon (optional)            | Module Activity           | class\_uid: 1005   |
| Windows network connection                            | product: windows, category: network\_connection, service: sysmon (optional)    | Network Activity          | class\_uid: 4001   |
| Windows named pipe creation                           | product: windows, category: pipe\_created, service: sysmon (optional)          | Windows Resource Activity | class\_uid: 201003 |
| Windows process access                                | product: windows, category: process\_access, service: sysmon (optional)        | Process Activity          | class\_uid: 1007   |
| Windows process creation                              | product: windows, category: process\_creation, service: sysmon (optional)      | Process Activity          | class\_uid: 1007   |
| Windows PowerShell module logging                     | product: windows, category: ps\_module, service: powershell (optional)         | Script Activity           | class\_uid: 1009   |
| Windows PowerShell script block                       | product: windows, category: ps\_script, service: powershell (optional)         | Script Activity           | class\_uid: 1009   |
| Windows registry key creation                         | product: windows, category: registry\_add, service: sysmon (optional)          | Registry Key Activity     | class\_uid: 201001 |
| Windows registry key deletion                         | product: windows, category: registry\_delete, service: sysmon (optional)       | Registry Key Activity     | class\_uid: 201001 |
| Windows registry value deletion                       | product: windows, category: registry\_delete, service: sysmon (optional)       | Registry Value Activity   | class\_uid: 201002 |
| Windows registry key event                            | product: windows, category: registry\_event, service: sysmon (optional)        | Registry Key Activity     | class\_uid: 201001 |
| Windows registry value event                          | product: windows, category: registry\_event, service: sysmon (optional)        | Registry Value Activity   | class\_uid: 201002 |
| Windows registry value set                            | product: windows, category: registry\_set, service: sysmon (optional)          | Registry Value Activity   | class\_uid: 201002 |
| Windows Security account change                       | product: windows, service: security                                            | Account Change            | class\_uid: 3001   |
| Windows Security authentication                       | product: windows, service: security                                            | Authentication            | class\_uid: 3002   |
| Windows Security special privilege assignment         | product: windows, service: security                                            | Authorize Session         | class\_uid: 3003   |
| Windows Security directory and object management      | product: windows, service: security                                            | Entity Management         | class\_uid: 3004   |
| Windows Security log clearing                         | product: windows, service: security                                            | Event Log Activity        | class\_uid: 1008   |
| Windows Security file access                          | product: windows, service: security                                            | File System Activity      | class\_uid: 1001   |
| Windows Security group management                     | product: windows, service: security                                            | Group Management          | class\_uid: 3006   |
| Windows Security process creation                     | product: windows, service: security                                            | Process Activity          | class\_uid: 1007   |
| Windows Security registry key access                  | product: windows, service: security                                            | Registry Key Activity     | class\_uid: 201001 |
| Windows Security registry value change                | product: windows, service: security                                            | Registry Value Activity   | class\_uid: 201002 |
| Windows Security scheduled task change                | product: windows, service: security                                            | Scheduled Job Activity    | class\_uid: 1006   |
| Windows Security service installation                 | product: windows, service: security                                            | Windows Service Activity  | class\_uid: 201004 |
| Windows Security network share access                 | product: windows, service: security                                            | SMB Activity              | class\_uid: 4006   |
| Windows Security user management                      | product: windows, service: security                                            | User Management           | class\_uid: 3007   |
| Windows System log event log clearing                 | product: windows, service: system                                              | Event Log Activity        | class\_uid: 1008   |
| Windows System log service activity                   | product: windows, service: system                                              | Windows Service Activity  | class\_uid: 201004 |
| Windows Defender detections                           | product: windows, service: windefend                                           | Detection Finding         | class\_uid: 2004   |
| Zeek DNS                                              | product: zeek, service: dns                                                    | DNS Activity              | class\_uid: 4003   |
| Zeek HTTP                                             | product: zeek, service: http                                                   | HTTP Activity             | class\_uid: 4002   |
| Zeek SMB files                                        | product: zeek, service: smb\_files                                             | SMB Activity              | class\_uid: 4006   |

### AWS CloudTrail

product: aws, service: cloudtrail

* product: aws
* service: cloudtrail

#### Event guard

Matches API Activity (`class_uid: 6003`) with `activity_id` `1`, `2`, `3`, `4`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field                                               | OCSF lookup and interpretation                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `eventName`                                               | Reads `api.operation`.                                                                                                 |
| `eventSource`                                             | Reads `api.service.name`.                                                                                              |
| `errorCode`                                               | Reads `api.response.error`.                                                                                            |
| `errorMessage`                                            | Reads `api.response.error_message`.                                                                                    |
| `userAgent`                                               | Reads `http_request.user_agent`.                                                                                       |
| `sourceIPAddress`                                         | Reads `src_endpoint.ip`. CloudTrail also renders AWS service principals here; those never compare equal to an address. |
| `awsRegion`                                               | Reads `cloud.region`.                                                                                                  |
| `recipientAccountId`                                      | Reads `cloud.account.uid`.                                                                                             |
| `userIdentity.type`                                       | Reads `actor.user.type`.                                                                                               |
| `userIdentity.arn`                                        | Reads `actor.user.uid`.                                                                                                |
| `userIdentity.userName`                                   | Reads `actor.user.name`.                                                                                               |
| `userIdentity.accountId`                                  | Reads `actor.user.account.uid`.                                                                                        |
| `userIdentity.sessionContext.sessionIssuer.type`          | Reads `actor.session.issuer`.                                                                                          |
| `userIdentity.sessionContext.attributes.mfaAuthenticated` | Reads `actor.session.is_mfa`.                                                                                          |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                                 | Reason                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `eventType`                                                 | The API Activity mapping does not preserve the CloudTrail event type.            |
| `eventVersion`                                              | The API Activity mapping does not preserve the CloudTrail record version.        |
| `requestParameters`                                         | Request parameters have no OCSF attribute.                                       |
| `requestParameters.enable`                                  | Request parameters have no OCSF attribute.                                       |
| `requestParameters.layers`                                  | Request parameters have no OCSF attribute.                                       |
| `requestParameters.attribute`                               | Request parameters have no OCSF attribute.                                       |
| `requestParameters.containerDefinitions.command`            | Request parameters have no OCSF attribute.                                       |
| `responseElements`                                          | Response elements have no OCSF attribute.                                        |
| `responseElements.publiclyAccessible`                       | Response elements have no OCSF attribute.                                        |
| `responseElements.ConsoleLogin`                             | Response elements have no OCSF attribute.                                        |
| `responseElements.pendingModifiedValues.masterUserPassword` | Response elements have no OCSF attribute.                                        |
| `additionalEventData.MFAUsed`                               | Console sign-in details land in the Authentication class, not in API Activity.   |
| `status`                                                    | The API Activity mapping translates the status into the OCSF status enumeration. |

### Azure activity log

product: azure, service: activitylogs

* product: azure
* service: activitylogs

#### Event guard

Matches API Activity (`class_uid: 6003`) with `activity_id` `1`, `2`, `3`, `4`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field             | OCSF lookup and interpretation                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `operationName`         | Reads `api.operation`.                                                                                |
| `OperationNameValue`    | Reads `api.operation`.                                                                                |
| `ResourceProviderValue` | Reads `api.service.name`.                                                                             |
| `ResourceId`            | Reads `uid` from every entry of `resources`. A rule value matches when any affected resource matches. |
| `properties.message`    | Reads `message`.                                                                                      |
| `CallerIpAddress`       | Reads `src_endpoint.ip`.                                                                              |
| `Caller`                | Reads `actor.user.email_addr`.                                                                        |
| `ActivityStatusValue`   | Reads `status`.                                                                                       |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field     | Reason                                                                |
| --------------- | --------------------------------------------------------------------- |
| `CategoryValue` | The API Activity mapping does not preserve the activity log category. |
| `Category`      | The API Activity mapping does not preserve the activity log category. |

### Entra ID audit user management

product: azure, service: auditlogs

* product: azure
* service: auditlogs

#### Event guard

Matches Account Change (`class_uid: 3001`) with `activity_id` `1`, `2`, `3`, `4`, `5`, `6`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field                          | OCSF lookup and interpretation                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `properties.message`                 | Reads `message`. The activity display name is the OCSF message.                                                                                                    |
| `ActivityDisplayName`                | Reads `message`.                                                                                                                                                   |
| `OperationName`                      | Reads `message`.                                                                                                                                                   |
| `operationName`                      | Reads `message`.                                                                                                                                                   |
| `Result`                             | Reads `status_id`. Translates rule values: `success` → `1`, `failure` → `2`. Translates the audit result to the OCSF status; a rule with another value is skipped. |
| `ResultReason`                       | Reads `status_detail`.                                                                                                                                             |
| `InitiatedBy.user.userPrincipalName` | Reads `actor.user.email_addr`.                                                                                                                                     |
| `InitiatedBy.app.displayName`        | Reads `actor.app_name`.                                                                                                                                            |
| `TargetResources.displayName`        | Reads `user.full_name`.                                                                                                                                            |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                      | Reason                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `Category`                                       | The audit category selects the OCSF class and is not preserved as a field.        |
| `category`                                       | The audit category selects the OCSF class and is not preserved as a field.        |
| `LoggedByService`                                | The Entity Management mapping does not preserve the logging service.              |
| `Status`                                         | The audit mapping translates the result into the OCSF status enumeration.         |
| `ActivityType`                                   | The audit mapping folds the operation type into the activity.                     |
| `activityType`                                   | The audit mapping folds the operation type into the activity.                     |
| `Initiatedby`                                    | The audit mapping splits the initiator into the actor user or application.        |
| `Target`                                         | Targets become class-specific user, group, or entity objects.                     |
| `TargetResources`                                | Targets become class-specific user, group, or entity objects.                     |
| `properties.targetResources`                     | Targets become class-specific user, group, or entity objects.                     |
| `targetResources.type`                           | Targets become class-specific user, group, or entity objects.                     |
| `TargetResources.ModifiedProperties.DisplayName` | Modified properties are not preserved by the audit mapping.                       |
| `TargetResources.ModifiedProperties.NewValue`    | Modified properties are not preserved by the audit mapping.                       |
| `TargetResources.modifiedProperties`             | Modified properties are not preserved by the audit mapping.                       |
| `TargetResources.modifiedProperties.newValue`    | Modified properties are not preserved by the audit mapping.                       |
| `properties.result`                              | The audit mapping translates the result into the OCSF status enumeration.         |
| `failure_status_reason`                          | The audit mapping stores the failure reason as status\_detail under ResultReason. |
| `ConsentContext.IsAdminConsent`                  | The audit mapping does not preserve consent context.                              |
| `additionalDetails.additionalInfo`               | The audit mapping does not preserve additional details.                           |

### Entra ID audit directory management

product: azure, service: auditlogs

* product: azure
* service: auditlogs

#### Event guard

Matches Entity Management (`class_uid: 3004`) with `activity_id` `1`, `2`, `3`, `4`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field                          | OCSF lookup and interpretation                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `properties.message`                 | Reads `message`. The activity display name is the OCSF message.                                                                                                    |
| `ActivityDisplayName`                | Reads `message`.                                                                                                                                                   |
| `OperationName`                      | Reads `message`.                                                                                                                                                   |
| `operationName`                      | Reads `message`.                                                                                                                                                   |
| `Result`                             | Reads `status_id`. Translates rule values: `success` → `1`, `failure` → `2`. Translates the audit result to the OCSF status; a rule with another value is skipped. |
| `ResultReason`                       | Reads `status_detail`.                                                                                                                                             |
| `InitiatedBy.user.userPrincipalName` | Reads `actor.user.email_addr`.                                                                                                                                     |
| `InitiatedBy.app.displayName`        | Reads `actor.app_name`.                                                                                                                                            |
| `TargetResources.displayName`        | Reads `entity.name`.                                                                                                                                               |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                      | Reason                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `Category`                                       | The audit category selects the OCSF class and is not preserved as a field.        |
| `category`                                       | The audit category selects the OCSF class and is not preserved as a field.        |
| `LoggedByService`                                | The Entity Management mapping does not preserve the logging service.              |
| `Status`                                         | The audit mapping translates the result into the OCSF status enumeration.         |
| `ActivityType`                                   | The audit mapping folds the operation type into the activity.                     |
| `activityType`                                   | The audit mapping folds the operation type into the activity.                     |
| `Initiatedby`                                    | The audit mapping splits the initiator into the actor user or application.        |
| `Target`                                         | Targets become class-specific user, group, or entity objects.                     |
| `TargetResources`                                | Targets become class-specific user, group, or entity objects.                     |
| `properties.targetResources`                     | Targets become class-specific user, group, or entity objects.                     |
| `targetResources.type`                           | Targets become class-specific user, group, or entity objects.                     |
| `TargetResources.ModifiedProperties.DisplayName` | Modified properties are not preserved by the audit mapping.                       |
| `TargetResources.ModifiedProperties.NewValue`    | Modified properties are not preserved by the audit mapping.                       |
| `TargetResources.modifiedProperties`             | Modified properties are not preserved by the audit mapping.                       |
| `TargetResources.modifiedProperties.newValue`    | Modified properties are not preserved by the audit mapping.                       |
| `properties.result`                              | The audit mapping translates the result into the OCSF status enumeration.         |
| `failure_status_reason`                          | The audit mapping stores the failure reason as status\_detail under ResultReason. |
| `ConsentContext.IsAdminConsent`                  | The audit mapping does not preserve consent context.                              |
| `additionalDetails.additionalInfo`               | The audit mapping does not preserve additional details.                           |

### Entra ID audit group management

product: azure, service: auditlogs

* product: azure
* service: auditlogs

#### Event guard

Matches Group Management (`class_uid: 3006`) with `activity_id` `3`, `4`, `5`, `6`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field                          | OCSF lookup and interpretation                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `properties.message`                 | Reads `message`. The activity display name is the OCSF message.                                                                                                    |
| `ActivityDisplayName`                | Reads `message`.                                                                                                                                                   |
| `OperationName`                      | Reads `message`.                                                                                                                                                   |
| `operationName`                      | Reads `message`.                                                                                                                                                   |
| `Result`                             | Reads `status_id`. Translates rule values: `success` → `1`, `failure` → `2`. Translates the audit result to the OCSF status; a rule with another value is skipped. |
| `ResultReason`                       | Reads `status_detail`.                                                                                                                                             |
| `InitiatedBy.user.userPrincipalName` | Reads `actor.user.email_addr`.                                                                                                                                     |
| `InitiatedBy.app.displayName`        | Reads `actor.app_name`.                                                                                                                                            |
| `TargetResources.displayName`        | Reads `group.name`.                                                                                                                                                |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                      | Reason                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `Category`                                       | The audit category selects the OCSF class and is not preserved as a field.        |
| `category`                                       | The audit category selects the OCSF class and is not preserved as a field.        |
| `LoggedByService`                                | The Entity Management mapping does not preserve the logging service.              |
| `Status`                                         | The audit mapping translates the result into the OCSF status enumeration.         |
| `ActivityType`                                   | The audit mapping folds the operation type into the activity.                     |
| `activityType`                                   | The audit mapping folds the operation type into the activity.                     |
| `Initiatedby`                                    | The audit mapping splits the initiator into the actor user or application.        |
| `Target`                                         | Targets become class-specific user, group, or entity objects.                     |
| `TargetResources`                                | Targets become class-specific user, group, or entity objects.                     |
| `properties.targetResources`                     | Targets become class-specific user, group, or entity objects.                     |
| `targetResources.type`                           | Targets become class-specific user, group, or entity objects.                     |
| `TargetResources.ModifiedProperties.DisplayName` | Modified properties are not preserved by the audit mapping.                       |
| `TargetResources.ModifiedProperties.NewValue`    | Modified properties are not preserved by the audit mapping.                       |
| `TargetResources.modifiedProperties`             | Modified properties are not preserved by the audit mapping.                       |
| `TargetResources.modifiedProperties.newValue`    | Modified properties are not preserved by the audit mapping.                       |
| `properties.result`                              | The audit mapping translates the result into the OCSF status enumeration.         |
| `failure_status_reason`                          | The audit mapping stores the failure reason as status\_detail under ResultReason. |
| `ConsentContext.IsAdminConsent`                  | The audit mapping does not preserve consent context.                              |
| `additionalDetails.additionalInfo`               | The audit mapping does not preserve additional details.                           |

### Entra ID Protection risk detections

product: azure, service: riskdetection

* product: azure
* service: riskdetection

#### Event guard

Matches Detection Finding (`class_uid: 2004`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field     | OCSF lookup and interpretation                                                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `riskEventType` | Reads `finding_info.title`.                                                                                                                                                                                                                                            |
| `riskLevel`     | Reads `risk_level_id`. Translates rule values: `none` → `0`, `low` → `1`, `medium` → `2`, `high` → `3`. Translates the Entra risk level to the OCSF risk level; a rule with another level is skipped.                                                                  |
| `riskState`     | Reads `status_id`. Translates rule values: `atrisk` → `1`, `confirmedcompromised` → `1`, `confirmedsafe` → `3`, `dismissed` → `3`, `none` → `4`, `remediated` → `4`. Translates the Entra risk state to the OCSF finding status; a rule with another state is skipped. |
| `riskDetail`    | Reads `finding_info.desc`.                                                                                                                                                                                                                                             |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field         | Reason                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| `userPrincipalName` | The Detection Finding mapping stores the user under evidences.           |
| `ipAddress`         | The Detection Finding mapping stores the source address under evidences. |

### Entra ID sign-ins

product: azure, service: signinlogs

* product: azure
* service: signinlogs

#### Event guard

Matches Authentication (`class_uid: 3002`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field                    | OCSF lookup and interpretation                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `ResultType`                   | Reads `status_code`, comparing numbers and strings alike. The sign-in error code, zero for success. |
| `ResultDescription`            | Reads `status_detail`.                                                                              |
| `Resultdescription`            | Reads `status_detail`. Stock rules also spell the field in lower case.                              |
| `UserPrincipalName`            | Reads `user.email_addr`.                                                                            |
| `Username`                     | Reads `user.email_addr`.                                                                            |
| `UserId`                       | Reads `user.uid`.                                                                                   |
| `AppDisplayName`               | Reads `service.name`.                                                                               |
| `AppId`                        | Reads `service.uid`.                                                                                |
| `ResourceDisplayName`          | Reads `dst_endpoint.svc_name`.                                                                      |
| `IPAddress`                    | Reads `src_endpoint.ip`.                                                                            |
| `DeviceDetail.deviceId`        | Reads `src_endpoint.uid`.                                                                           |
| `DeviceDetail.operatingSystem` | Reads `src_endpoint.os.name`.                                                                       |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                 | Reason                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `Status`                    | The Authentication mapping splits the status record into status\_code and status\_detail. |
| `AuthenticationRequirement` | The Authentication mapping folds the requirement into the MFA flag.                       |
| `conditionalAccessStatus`   | The Authentication mapping does not preserve the conditional access outcome.              |
| `ClientApp`                 | The Authentication mapping does not preserve the client application.                      |
| `RiskState`                 | The Authentication mapping does not preserve the sign-in risk state.                      |
| `NetworkLocationDetails`    | The Authentication mapping does not preserve network location details.                    |
| `DeviceDetail.trusttype`    | The Authentication mapping does not preserve the device trust type.                       |
| `DeviceDetail.isCompliant`  | The Authentication mapping does not preserve device compliance.                           |
| `userAgent`                 | The Entra sign-in mapping does not carry the user agent.                                  |
| `ActivityDetails`           | The Authentication mapping does not preserve activity details.                            |
| `properties.message`        | Sign-in events carry no activity message.                                                 |

### GCP Cloud Audit Logs

product: gcp, service: gcp.audit

* product: gcp
* service: gcp.audit

#### Event guard

Matches API Activity (`class_uid: 6003`) with `activity_id` `1`, `2`, `3`, `4`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field                                                 | OCSF lookup and interpretation                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `gcp.audit.method_name`                                     | Reads `api.operation`.                                                                                |
| `data.protoPayload.methodName`                              | Reads `api.operation`.                                                                                |
| `data.protoPayload.serviceName`                             | Reads `api.service.name`.                                                                             |
| `data.protoPayload.status.message`                          | Reads `api.response.message`.                                                                         |
| `data.protoPayload.authenticationInfo.principalEmail`       | Reads `actor.user.email_addr`.                                                                        |
| `data.protoPayload.requestMetadata.callerIp`                | Reads `src_endpoint.ip`.                                                                              |
| `data.protoPayload.requestMetadata.callerSuppliedUserAgent` | Reads `http_request.user_agent`.                                                                      |
| `data.protoPayload.resourceName`                            | Reads `uid` from every entry of `resources`. A rule value matches when any affected resource matches. |
| `data.protoPayload.resource.type`                           | Reads `type` from every entry of `resources`.                                                         |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                      | Reason                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `data.protoPayload.authorizationInfo.granted`    | Authorization decisions have no OCSF attribute in API Activity.            |
| `data.protoPayload.authorizationInfo.permission` | Authorization decisions have no OCSF attribute in API Activity.            |
| `data.protoPayload.logName`                      | The audit log name selects the source, not an OCSF attribute of the event. |

### Linux file creation

product: linux, category: file\_event

* product: linux
* category: file\_event

#### Event guard

Matches File System Activity (`class_uid: 1001`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `linux`.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TargetFilename`    | Reads `file.path`.                                                                                                                                               |
| `Image`             | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                             |
| `CommandLine`       | Reads `actor.process.cmd_line`. Uses the acting process command line.                                                                                            |
| `ParentImage`       | Reads `actor.process.parent_process.path`, falling back to `actor.process.parent_process.file.path` when absent or empty. Uses the parent of the acting process. |
| `ParentCommandLine` | Reads `actor.process.parent_process.cmd_line`.                                                                                                                   |
| `User`              | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                              |
| `ProcessId`         | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                  |
| `ProcessGuid`       | Reads `actor.process.uid`.                                                                                                                                       |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field       | Reason                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `CreationUtcTime` | The File System Activity mapping stores the creation time as a timestamp, not as the Sysmon-rendered string. |

### Linux network connection

product: linux, category: network\_connection

* product: linux
* category: network\_connection

#### Event guard

Matches Network Activity (`class_uid: 4001`) with `activity_id` `1`, `6`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `linux`.

#### Field projections

| Sigma field           | OCSF lookup and interpretation                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Initiated`           | Reads `connection_info.direction_id`. Translates rule values: `true` → `2`, `false` → `1`. Outbound connections are initiated; inbound ones are not.             |
| `Protocol`            | Reads `connection_info.protocol_name`.                                                                                                                           |
| `DestinationIp`       | Reads `dst_endpoint.ip`.                                                                                                                                         |
| `DestinationPort`     | Reads `dst_endpoint.port`, comparing numbers and strings alike.                                                                                                  |
| `DestinationHostname` | Reads `dst_endpoint.hostname`.                                                                                                                                   |
| `SourceIp`            | Reads `src_endpoint.ip`.                                                                                                                                         |
| `SourcePort`          | Reads `src_endpoint.port`, comparing numbers and strings alike.                                                                                                  |
| `SourceHostname`      | Reads `src_endpoint.hostname`.                                                                                                                                   |
| `Image`               | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                             |
| `CommandLine`         | Reads `actor.process.cmd_line`. Uses the acting process command line.                                                                                            |
| `ParentImage`         | Reads `actor.process.parent_process.path`, falling back to `actor.process.parent_process.file.path` when absent or empty. Uses the parent of the acting process. |
| `ParentCommandLine`   | Reads `actor.process.parent_process.cmd_line`.                                                                                                                   |
| `User`                | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                              |
| `ProcessId`           | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                  |
| `ProcessGuid`         | Reads `actor.process.uid`.                                                                                                                                       |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field           | Reason                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `SourceIsIpv6`        | OCSF encodes the address family in the address itself.                                           |
| `DestinationIsIpv6`   | OCSF encodes the address family in the address itself.                                           |
| `SourcePortName`      | The Network Activity mapping resolves the service name from a table, not from the source string. |
| `DestinationPortName` | The Network Activity mapping resolves the service name from a table, not from the source string. |

### Linux process creation

product: linux, category: process\_creation

* product: linux
* category: process\_creation

#### Event guard

Matches Process Activity (`class_uid: 1007`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `linux`.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Image`             | Reads `process.path`, falling back to `process.file.path` when absent or empty.                                                             |
| `ParentImage`       | Reads `process.parent_process.path`, falling back to `process.parent_process.file.path` when absent or empty. Uses the parent process only. |
| `OriginalFileName`  | Reads `process.file.internal_name`. Uses embedded executable identity and never the on-disk file name.                                      |
| `CommandLine`       | Reads `process.cmd_line`. Applies every modifier to one projected command line.                                                             |
| `User`              | Rebuilds `DOMAIN\name` from `process.user.domain` and `process.user.name`. Uses the process user, not an arbitrary User object.             |
| `ParentUser`        | Rebuilds `DOMAIN\name` from `process.parent_process.user.domain` and `process.parent_process.user.name`. Uses the parent process user only. |
| `ParentCommandLine` | Reads `process.parent_process.cmd_line`.                                                                                                    |
| `CurrentDirectory`  | Reads `process.working_directory`.                                                                                                          |
| `Description`       | Reads `process.file.desc`. Uses the embedded file description.                                                                              |
| `Product`           | Reads `process.file.product.name`. Uses the embedded product name.                                                                          |
| `Company`           | Reads `process.file.company_name`.                                                                                                          |
| `FileVersion`       | Reads `process.file.version`.                                                                                                               |
| `Hashes`            | Rebuilds the `ALGORITHM=value` list from `process.file.hashes`. Never pairs an algorithm with another fingerprint's value.                  |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field      | Reason                                                                              |
| ---------------- | ----------------------------------------------------------------------------------- |
| `EventID`        | Sysmon for Linux and macOS event IDs are not part of the OCSF process mapping.      |
| `IntegrityLevel` | Integrity levels are a Windows concept.                                             |
| `LogonId`        | The Process Activity mapping does not preserve the Sysmon logon session identifier. |

### macOS process creation

product: macos, category: process\_creation

* product: macos
* category: process\_creation

#### Event guard

Matches Process Activity (`class_uid: 1007`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `macos`.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Image`             | Reads `process.path`, falling back to `process.file.path` when absent or empty.                                                             |
| `ParentImage`       | Reads `process.parent_process.path`, falling back to `process.parent_process.file.path` when absent or empty. Uses the parent process only. |
| `OriginalFileName`  | Reads `process.file.internal_name`. Uses embedded executable identity and never the on-disk file name.                                      |
| `CommandLine`       | Reads `process.cmd_line`. Applies every modifier to one projected command line.                                                             |
| `User`              | Rebuilds `DOMAIN\name` from `process.user.domain` and `process.user.name`. Uses the process user, not an arbitrary User object.             |
| `ParentUser`        | Rebuilds `DOMAIN\name` from `process.parent_process.user.domain` and `process.parent_process.user.name`. Uses the parent process user only. |
| `ParentCommandLine` | Reads `process.parent_process.cmd_line`.                                                                                                    |
| `CurrentDirectory`  | Reads `process.working_directory`.                                                                                                          |
| `Description`       | Reads `process.file.desc`. Uses the embedded file description.                                                                              |
| `Product`           | Reads `process.file.product.name`. Uses the embedded product name.                                                                          |
| `Company`           | Reads `process.file.company_name`.                                                                                                          |
| `FileVersion`       | Reads `process.file.version`.                                                                                                               |
| `Hashes`            | Rebuilds the `ALGORITHM=value` list from `process.file.hashes`. Never pairs an algorithm with another fingerprint's value.                  |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field      | Reason                                                                              |
| ---------------- | ----------------------------------------------------------------------------------- |
| `EventID`        | Sysmon for Linux and macOS event IDs are not part of the OCSF process mapping.      |
| `IntegrityLevel` | Integrity levels are a Windows concept.                                             |
| `LogonId`        | The Process Activity mapping does not preserve the Sysmon logon session identifier. |

### Okta account change

product: okta, service: okta

* product: okta
* service: okta

#### Event guard

Matches Account Change (`class_uid: 3001`) with `activity_id` `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `12`. Absent, Unknown, and Other activities stay eligible.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `okta`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field                     | OCSF lookup and interpretation                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eventType`                     | Reads `metadata.event_code`. The Okta event type is the OCSF event code. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `displayMessage`                | Reads `message`.                                                                                                                                                         |
| `outcome.reason`                | Reads `status_detail`.                                                                                                                                                   |
| `actor.alternateId`             | Reads `actor.user.email_addr`.                                                                                                                                           |
| `actor.displayName`             | Reads `actor.user.full_name`.                                                                                                                                            |
| `actor.id`                      | Reads `actor.user.uid`.                                                                                                                                                  |
| `client.ipAddress`              | Reads `src_endpoint.ip`.                                                                                                                                                 |
| `client.userAgent.rawUserAgent` | Reads `http_request.user_agent`.                                                                                                                                         |
| `debugContext.debugData.url`    | Reads `http_request.url.path`.                                                                                                                                           |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                  | Reason                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `outcome.result`                             | The Okta mapping translates the outcome into the OCSF status enumeration. |
| `legacyEventType`                            | The Okta mapping keeps only the current event type.                       |
| `securityContext.isProxy`                    | The Okta mapping does not preserve the proxy flag.                        |
| `debugContext.debugData.requestUri`          | The Okta mapping stores the request URL, not the request URI.             |
| `debugContext.debugData.behaviors`           | The Okta mapping does not preserve behavior evaluations.                  |
| `debugContext.debugData.logOnlySecurityData` | The Okta mapping does not preserve the log-only security data.            |
| `target.displayName`                         | Targets become class-specific user, group, or entity objects.             |
| `target.alternateId`                         | Targets become class-specific user, group, or entity objects.             |

### Okta API token and OAuth activity

product: okta, service: okta

* product: okta
* service: okta

#### Event guard

Matches API Activity (`class_uid: 6003`) with `activity_id` `1`, `2`, `3`, `4`. Absent, Unknown, and Other activities stay eligible.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `okta`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field                     | OCSF lookup and interpretation                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eventType`                     | Reads `metadata.event_code`. The Okta event type is the OCSF event code. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `displayMessage`                | Reads `message`.                                                                                                                                                         |
| `outcome.reason`                | Reads `status_detail`.                                                                                                                                                   |
| `actor.alternateId`             | Reads `actor.user.email_addr`.                                                                                                                                           |
| `actor.displayName`             | Reads `actor.user.full_name`.                                                                                                                                            |
| `actor.id`                      | Reads `actor.user.uid`.                                                                                                                                                  |
| `client.ipAddress`              | Reads `src_endpoint.ip`.                                                                                                                                                 |
| `client.userAgent.rawUserAgent` | Reads `http_request.user_agent`.                                                                                                                                         |
| `debugContext.debugData.url`    | Reads `http_request.url.path`.                                                                                                                                           |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                  | Reason                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `outcome.result`                             | The Okta mapping translates the outcome into the OCSF status enumeration. |
| `legacyEventType`                            | The Okta mapping keeps only the current event type.                       |
| `securityContext.isProxy`                    | The Okta mapping does not preserve the proxy flag.                        |
| `debugContext.debugData.requestUri`          | The Okta mapping stores the request URL, not the request URI.             |
| `debugContext.debugData.behaviors`           | The Okta mapping does not preserve behavior evaluations.                  |
| `debugContext.debugData.logOnlySecurityData` | The Okta mapping does not preserve the log-only security data.            |
| `target.displayName`                         | Targets become class-specific user, group, or entity objects.             |
| `target.alternateId`                         | Targets become class-specific user, group, or entity objects.             |

### Okta authentication

product: okta, service: okta

* product: okta
* service: okta

#### Event guard

Matches Authentication (`class_uid: 3002`) with `activity_id` `1`, `2`, `6`. Absent, Unknown, and Other activities stay eligible.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `okta`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field                     | OCSF lookup and interpretation                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eventType`                     | Reads `metadata.event_code`. The Okta event type is the OCSF event code. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `displayMessage`                | Reads `message`.                                                                                                                                                         |
| `outcome.reason`                | Reads `status_detail`.                                                                                                                                                   |
| `actor.alternateId`             | Reads `actor.user.email_addr`.                                                                                                                                           |
| `actor.displayName`             | Reads `actor.user.full_name`.                                                                                                                                            |
| `actor.id`                      | Reads `actor.user.uid`.                                                                                                                                                  |
| `client.ipAddress`              | Reads `src_endpoint.ip`.                                                                                                                                                 |
| `client.userAgent.rawUserAgent` | Reads `http_request.user_agent`.                                                                                                                                         |
| `debugContext.debugData.url`    | Reads `http_request.url.path`.                                                                                                                                           |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                  | Reason                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `outcome.result`                             | The Okta mapping translates the outcome into the OCSF status enumeration. |
| `legacyEventType`                            | The Okta mapping keeps only the current event type.                       |
| `securityContext.isProxy`                    | The Okta mapping does not preserve the proxy flag.                        |
| `debugContext.debugData.requestUri`          | The Okta mapping stores the request URL, not the request URI.             |
| `debugContext.debugData.behaviors`           | The Okta mapping does not preserve behavior evaluations.                  |
| `debugContext.debugData.logOnlySecurityData` | The Okta mapping does not preserve the log-only security data.            |
| `target.displayName`                         | Targets become class-specific user, group, or entity objects.             |
| `target.alternateId`                         | Targets become class-specific user, group, or entity objects.             |

### Okta threat detections

product: okta, service: okta

* product: okta
* service: okta

#### Event guard

Matches Detection Finding (`class_uid: 2004`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `okta`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field                     | OCSF lookup and interpretation                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eventType`                     | Reads `metadata.event_code`. The Okta event type is the OCSF event code. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `displayMessage`                | Reads `message`.                                                                                                                                                         |
| `outcome.reason`                | Reads `status_detail`.                                                                                                                                                   |
| `actor.alternateId`             | Reads `actor.user.email_addr`.                                                                                                                                           |
| `actor.displayName`             | Reads `actor.user.full_name`.                                                                                                                                            |
| `actor.id`                      | Reads `actor.user.uid`.                                                                                                                                                  |
| `client.ipAddress`              | Reads `src_endpoint.ip`.                                                                                                                                                 |
| `client.userAgent.rawUserAgent` | Reads `http_request.user_agent`.                                                                                                                                         |
| `debugContext.debugData.url`    | Reads `http_request.url.path`.                                                                                                                                           |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                  | Reason                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `outcome.result`                             | The Okta mapping translates the outcome into the OCSF status enumeration. |
| `legacyEventType`                            | The Okta mapping keeps only the current event type.                       |
| `securityContext.isProxy`                    | The Okta mapping does not preserve the proxy flag.                        |
| `debugContext.debugData.requestUri`          | The Okta mapping stores the request URL, not the request URI.             |
| `debugContext.debugData.behaviors`           | The Okta mapping does not preserve behavior evaluations.                  |
| `debugContext.debugData.logOnlySecurityData` | The Okta mapping does not preserve the log-only security data.            |
| `target.displayName`                         | Targets become class-specific user, group, or entity objects.             |
| `target.alternateId`                         | Targets become class-specific user, group, or entity objects.             |

### Okta policy, application, zone, and device management

product: okta, service: okta

* product: okta
* service: okta

#### Event guard

Matches Entity Management (`class_uid: 3004`) with `activity_id` `1`, `2`, `3`, `4`, `6`, `8`, `9`, `10`, `11`. Absent, Unknown, and Other activities stay eligible.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `okta`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field                     | OCSF lookup and interpretation                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eventType`                     | Reads `metadata.event_code`. The Okta event type is the OCSF event code. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `displayMessage`                | Reads `message`.                                                                                                                                                         |
| `outcome.reason`                | Reads `status_detail`.                                                                                                                                                   |
| `actor.alternateId`             | Reads `actor.user.email_addr`.                                                                                                                                           |
| `actor.displayName`             | Reads `actor.user.full_name`.                                                                                                                                            |
| `actor.id`                      | Reads `actor.user.uid`.                                                                                                                                                  |
| `client.ipAddress`              | Reads `src_endpoint.ip`.                                                                                                                                                 |
| `client.userAgent.rawUserAgent` | Reads `http_request.user_agent`.                                                                                                                                         |
| `debugContext.debugData.url`    | Reads `http_request.url.path`.                                                                                                                                           |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                  | Reason                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `outcome.result`                             | The Okta mapping translates the outcome into the OCSF status enumeration. |
| `legacyEventType`                            | The Okta mapping keeps only the current event type.                       |
| `securityContext.isProxy`                    | The Okta mapping does not preserve the proxy flag.                        |
| `debugContext.debugData.requestUri`          | The Okta mapping stores the request URL, not the request URI.             |
| `debugContext.debugData.behaviors`           | The Okta mapping does not preserve behavior evaluations.                  |
| `debugContext.debugData.logOnlySecurityData` | The Okta mapping does not preserve the log-only security data.            |
| `target.displayName`                         | Targets become class-specific user, group, or entity objects.             |
| `target.alternateId`                         | Targets become class-specific user, group, or entity objects.             |

### Okta group management

product: okta, service: okta

* product: okta
* service: okta

#### Event guard

Matches Group Management (`class_uid: 3006`) with `activity_id` `1`, `3`, `4`, `5`. Absent, Unknown, and Other activities stay eligible.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `okta`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field                     | OCSF lookup and interpretation                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eventType`                     | Reads `metadata.event_code`. The Okta event type is the OCSF event code. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `displayMessage`                | Reads `message`.                                                                                                                                                         |
| `outcome.reason`                | Reads `status_detail`.                                                                                                                                                   |
| `actor.alternateId`             | Reads `actor.user.email_addr`.                                                                                                                                           |
| `actor.displayName`             | Reads `actor.user.full_name`.                                                                                                                                            |
| `actor.id`                      | Reads `actor.user.uid`.                                                                                                                                                  |
| `client.ipAddress`              | Reads `src_endpoint.ip`.                                                                                                                                                 |
| `client.userAgent.rawUserAgent` | Reads `http_request.user_agent`.                                                                                                                                         |
| `debugContext.debugData.url`    | Reads `http_request.url.path`.                                                                                                                                           |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field                                  | Reason                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `outcome.result`                             | The Okta mapping translates the outcome into the OCSF status enumeration. |
| `legacyEventType`                            | The Okta mapping keeps only the current event type.                       |
| `securityContext.isProxy`                    | The Okta mapping does not preserve the proxy flag.                        |
| `debugContext.debugData.requestUri`          | The Okta mapping stores the request URL, not the request URI.             |
| `debugContext.debugData.behaviors`           | The Okta mapping does not preserve behavior evaluations.                  |
| `debugContext.debugData.logOnlySecurityData` | The Okta mapping does not preserve the log-only security data.            |
| `target.displayName`                         | Targets become class-specific user, group, or entity objects.             |
| `target.alternateId`                         | Targets become class-specific user, group, or entity objects.             |

### Windows AppX package deployments

product: windows, service: appxdeployment-server

* product: windows
* service: appxdeployment-server

#### Event guard

Matches Application Lifecycle (`class_uid: 6002`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_appx`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field           | OCSF lookup and interpretation                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`             | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `PackageFullName`     | Reads `application.data.package_full_name`. Requires consistent producer provenance because the value lives in a source-specific namespace.                       |
| `Path`                | Reads `application.data.path`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                    |
| `FilePath`            | Reads `application.data.file_path`. Requires consistent producer provenance because the value lives in a source-specific namespace.                               |
| `PackageSourceUri`    | Reads `application.url.url_string`.                                                                                                                               |
| `ErrorCode`           | Reads `status_code`, comparing numbers and strings alike.                                                                                                         |
| `CallingProcess`      | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. The process that requested the deployment.                            |
| `DeploymentOperation` | Reads `application.data.deployment_operation`. Requires consistent producer provenance because the value lives in a source-specific namespace.                    |
| `HasFullTrust`        | Reads `application.data.has_full_trust`. Requires consistent producer provenance because the value lives in a source-specific namespace.                          |
| `Flags`               | Reads `application.data.flags`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                   |

### Windows BITS transfer jobs

product: windows, service: bits-client

* product: windows
* service: bits-client

#### Event guard

Matches HTTP Activity (`class_uid: 4002`) with `activity_id` `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_bits`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field   | OCSF lookup and interpretation                                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`     | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `RemoteName`  | Reads `http_request.url.url_string`.                                                                                                                              |
| `LocalName`   | Reads `file.path`.                                                                                                                                                |
| `processPath` | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. The process that created the job.                                     |
| `processId`   | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |

### Windows App Control blocks and audits

product: windows, service: codeintegrity-operational

* product: windows
* service: codeintegrity-operational

#### Event guard

Matches Application Lifecycle (`class_uid: 6002`) with `activity_id` `3`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_codeintegrity`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field             | OCSF lookup and interpretation                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`               | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                 |
| `FileNameBuffer`        | Reads `application.data.file_path`. Code Integrity reports the device path of the validated file. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `ProcessNameBuffer`     | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. The process that attempted the load.                                                                  |
| `RequestedPolicy`       | Reads `application.data.requested_policy`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                        |
| `ValidatedPolicy`       | Reads `application.data.validated_policy`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                        |
| `RequestedSigningLevel` | Reads `application.data.requested_signing_level`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                 |
| `ValidatedSigningLevel` | Reads `application.data.validated_signing_level`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                 |
| `PolicyName`            | Reads `application.data.policy_name`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                             |
| `Status`                | Reads `application.data.status`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                  |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field         | Reason                                                       |
| ------------------- | ------------------------------------------------------------ |
| `FileNameLength`    | Buffer lengths describe the event encoding, not the file.    |
| `ProcessNameLength` | Buffer lengths describe the event encoding, not the process. |

### Windows remote thread creation

product: windows, category: create\_remote\_thread, service: sysmon (optional)

* product: windows
* category: create\_remote\_thread
* service: sysmon (optional)

#### Event guard

Matches Process Activity (`class_uid: 1007`) with `activity_id` `4`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field             | OCSF lookup and interpretation                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`               | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SourceImage`           | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `TargetImage`           | Reads `process.path`, falling back to `process.file.path` when absent or empty. Uses the affected process.                                                        |
| `SourceUser`            | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`.                                                                                            |
| `TargetUser`            | Rebuilds `DOMAIN\name` from `process.user.domain` and `process.user.name`.                                                                                        |
| `SourceProcessId`       | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |
| `TargetProcessId`       | Reads `process.pid`, comparing numbers and strings alike.                                                                                                         |
| `SourceProcessGuid`     | Reads `actor.process.uid`.                                                                                                                                        |
| `TargetProcessGuid`     | Reads `process.uid`.                                                                                                                                              |
| `StartModule`           | Reads `module.file.name`.                                                                                                                                         |
| `StartFunction`         | Reads `module.function_name`.                                                                                                                                     |
| `StartAddress`          | Reads `module.base_address`.                                                                                                                                      |
| `TargetParentProcessId` | Reads `process.parent_process.pid`, comparing numbers and strings alike.                                                                                          |
| `NewThreadId`           | Reads `process.ptid`, comparing numbers and strings alike.                                                                                                        |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field         | Reason                                                                       |
| ------------------- | ---------------------------------------------------------------------------- |
| `SourceParentImage` | The Process Activity mapping does not carry the acting process's parent.     |
| `SourceCommandLine` | The Process Activity mapping does not carry the acting process command line. |

### Windows alternate data stream creation

product: windows, category: create\_stream\_hash, service: sysmon (optional)

* product: windows
* category: create\_stream\_hash
* service: sysmon (optional)

#### Event guard

Matches File System Activity (`class_uid: 1001`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field      | OCSF lookup and interpretation                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`        | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `TargetFilename` | Rebuilds the value as `file.path` + `":"` + `component`. Rebuilds the stream-qualified file name from the file path and the stream component.                     |
| `Hash`           | Rebuilds the `ALGORITHM=value` list from `file.hashes`. Never pairs an algorithm with another fingerprint's value.                                                |
| `Image`          | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `User`           | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                               |
| `ProcessId`      | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |
| `ProcessGuid`    | Reads `actor.process.uid`.                                                                                                                                        |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field       | Reason                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `Contents`        | The File System Activity mapping does not preserve stream contents.                                          |
| `CreationUtcTime` | The File System Activity mapping stores the creation time as a timestamp, not as the Sysmon-rendered string. |

### Windows DNS client queries

product: windows, service: dns-client

* product: windows
* service: dns-client

#### Event guard

Matches DNS Activity (`class_uid: 4003`) with `activity_id` `1`, `2`, `6`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_dns_client`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field    | OCSF lookup and interpretation                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`      | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `QueryName`    | Reads `query.hostname`.                                                                                                                                           |
| `QueryResults` | Reads `rdata` from every entry of `answers`. A rule value matches when any answer matches.                                                                        |
| `QueryStatus`  | Reads `status_code`, comparing numbers and strings alike.                                                                                                         |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field    | Reason                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| `QueryType`    | The DNS Activity mapping stores the record type by name, not by number. |
| `QueryOptions` | The DNS Activity mapping does not preserve the query option flags.      |

### Windows DNS query

product: windows, category: dns\_query, service: sysmon (optional)

* product: windows
* category: dns\_query
* service: sysmon (optional)

#### Event guard

Matches DNS Activity (`class_uid: 4003`) with `activity_id` `1`, `2`, `6`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field    | OCSF lookup and interpretation                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`      | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `QueryName`    | Reads `query.hostname`.                                                                                                                                           |
| `QueryResults` | Reads `rdata` from every entry of `answers`. A rule value matches when any answer matches; the Sysmon type prefixes and IPv4-in-IPv6 rendering are gone.          |
| `QueryStatus`  | Reads `status_code`, comparing numbers and strings alike.                                                                                                         |
| `Image`        | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `CommandLine`  | Reads `actor.process.cmd_line`. Uses the acting process command line.                                                                                             |
| `User`         | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                               |
| `ProcessId`    | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |
| `ProcessGuid`  | Reads `actor.process.uid`.                                                                                                                                        |

### Windows driver load

product: windows, category: driver\_load, service: sysmon (optional)

* product: windows
* category: driver\_load
* service: sysmon (optional)

#### Event guard

Matches Kernel Extension Activity (`class_uid: 1002`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field       | OCSF lookup and interpretation                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EventID`         | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                    |
| `ImageLoaded`     | Reads `driver.file.path`.                                                                                                                                                                                                            |
| `Hashes`          | Rebuilds the `ALGORITHM=value` list from `driver.file.hashes`. Never pairs an algorithm with another fingerprint's value.                                                                                                            |
| `SignatureStatus` | Reads `driver.file.signature.state_id`. Translates rule values: `valid` → `1`, `expired` → `2`, `revoked` → `3`, `untrusted` → `6`. Translates the Sysmon status to the OCSF signature state; a rule with another status is skipped. |
| `Signature`       | Reads `driver.file.signature.certificate.issuer`. Uses the signer name the normalizer stored as the certificate issuer.                                                                                                              |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field | Reason                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| `Signed`    | OCSF encodes signing as the presence of the signature object, not as a flag. |

### Windows file deletion

product: windows, category: file\_delete, service: sysmon (optional)

* product: windows
* category: file\_delete
* service: sysmon (optional)

#### Event guard

Matches File System Activity (`class_uid: 1001`) with `activity_id` `4`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field      | OCSF lookup and interpretation                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`        | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `TargetFilename` | Reads `file.path`.                                                                                                                                                |
| `Hashes`         | Rebuilds the `ALGORITHM=value` list from `file.hashes`. Never pairs an algorithm with another fingerprint's value.                                                |
| `Image`          | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `CommandLine`    | Reads `actor.process.cmd_line`. Uses the acting process command line.                                                                                             |
| `User`           | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                               |
| `ProcessId`      | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |
| `ProcessGuid`    | Reads `actor.process.uid`.                                                                                                                                        |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field    | Reason                                                              |
| -------------- | ------------------------------------------------------------------- |
| `IsExecutable` | The File System Activity mapping folds the flag into the file type. |
| `Archived`     | The Sysmon archive flag has no OCSF attribute.                      |

### Windows file creation

product: windows, category: file\_event, service: sysmon (optional)

* product: windows
* category: file\_event
* service: sysmon (optional)

#### Event guard

Matches File System Activity (`class_uid: 1001`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `TargetFilename`    | Reads `file.path`.                                                                                                                                                |
| `Image`             | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `CommandLine`       | Reads `actor.process.cmd_line`. Uses the acting process command line.                                                                                             |
| `ParentImage`       | Reads `actor.process.parent_process.path`, falling back to `actor.process.parent_process.file.path` when absent or empty. Uses the parent of the acting process.  |
| `ParentCommandLine` | Reads `actor.process.parent_process.cmd_line`.                                                                                                                    |
| `User`              | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                               |
| `ProcessId`         | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |
| `ProcessGuid`       | Reads `actor.process.uid`.                                                                                                                                        |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field       | Reason                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `CreationUtcTime` | The File System Activity mapping stores the creation time as a timestamp, not as the Sysmon-rendered string. |

### Windows Firewall rule changes

product: windows, service: firewall-as

* product: windows
* service: firewall-as

#### Event guard

Matches Entity Management (`class_uid: 3004`) with `activity_id` `1`, `3`, `4`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_firewall`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field            | OCSF lookup and interpretation                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`              | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                           |
| `ModifyingApplication` | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. The application that changed the rule set.                                                                      |
| `ModifyingUser`        | Reads `actor.user.uid`.                                                                                                                                                                                     |
| `RuleName`             | Reads `entity.name`.                                                                                                                                                                                        |
| `RuleId`               | Reads `entity.uid`.                                                                                                                                                                                         |
| `ApplicationPath`      | Reads `entity.data.application_path`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                       |
| `ServiceName`          | Reads `entity.data.service_name`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                           |
| `Action`               | Reads `entity.data.action_id`. Compares the raw Windows Firewall action code (2 Block, 3 Allow). Requires consistent producer provenance because the value lives in a source-specific namespace.            |
| `Direction`            | Reads `entity.data.direction_id`. Compares the raw Windows Firewall direction code (1 Inbound, 2 Outbound). Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `Protocol`             | Reads `entity.data.protocol_num`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                           |
| `LocalPorts`           | Reads `entity.data.local_ports`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                            |
| `RemotePorts`          | Reads `entity.data.remote_ports`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                           |
| `RemoteAddresses`      | Reads `entity.data.remote_addresses`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                       |
| `Profiles`             | Reads `entity.data.profiles`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                          |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field     | Reason                                                      |
| --------------- | ----------------------------------------------------------- |
| `Active`        | The Entity Management mapping stores the flag as a boolean. |
| `EdgeTraversal` | The Entity Management mapping stores the flag as a boolean. |
| `Origin`        | Stock rules never target the rule origin.                   |

### Windows image load

product: windows, category: image\_load, service: sysmon (optional)

* product: windows
* category: image\_load
* service: sysmon (optional)

#### Event guard

Matches Module Activity (`class_uid: 1005`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field        | OCSF lookup and interpretation                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EventID`          | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                    |
| `ImageLoaded`      | Reads `module.file.path`.                                                                                                                                                                                                            |
| `Hashes`           | Rebuilds the `ALGORITHM=value` list from `module.file.hashes`. Never pairs an algorithm with another fingerprint's value.                                                                                                            |
| `SignatureStatus`  | Reads `module.file.signature.state_id`. Translates rule values: `valid` → `1`, `expired` → `2`, `revoked` → `3`, `untrusted` → `6`. Translates the Sysmon status to the OCSF signature state; a rule with another status is skipped. |
| `Signature`        | Reads `module.file.signature.certificate.issuer`. Uses the signer name the normalizer stored as the certificate issuer.                                                                                                              |
| `OriginalFileName` | Reads `module.file.internal_name`. Uses embedded executable identity and never the on-disk file name.                                                                                                                                |
| `Description`      | Reads `module.file.desc`.                                                                                                                                                                                                            |
| `Product`          | Reads `module.file.product.name`.                                                                                                                                                                                                    |
| `Company`          | Reads `module.file.company_name`.                                                                                                                                                                                                    |
| `FileVersion`      | Reads `module.file.version`.                                                                                                                                                                                                         |
| `Image`            | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                                                                                                 |
| `CommandLine`      | Reads `actor.process.cmd_line`. Uses the acting process command line.                                                                                                                                                                |
| `User`             | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                                                                                                  |
| `ProcessId`        | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                                                                                      |
| `ProcessGuid`      | Reads `actor.process.uid`.                                                                                                                                                                                                           |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field | Reason                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| `Signed`    | OCSF encodes signing as the presence of the signature object, not as a flag. |

### Windows network connection

product: windows, category: network\_connection, service: sysmon (optional)

* product: windows
* category: network\_connection
* service: sysmon (optional)

#### Event guard

Matches Network Activity (`class_uid: 4001`) with `activity_id` `1`, `6`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field           | OCSF lookup and interpretation                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`             | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `Initiated`           | Reads `connection_info.direction_id`. Translates rule values: `true` → `2`, `false` → `1`. Outbound connections are initiated; inbound ones are not.              |
| `Protocol`            | Reads `connection_info.protocol_name`.                                                                                                                            |
| `DestinationIp`       | Reads `dst_endpoint.ip`.                                                                                                                                          |
| `DestinationPort`     | Reads `dst_endpoint.port`, comparing numbers and strings alike.                                                                                                   |
| `DestinationHostname` | Reads `dst_endpoint.hostname`.                                                                                                                                    |
| `SourceIp`            | Reads `src_endpoint.ip`.                                                                                                                                          |
| `SourcePort`          | Reads `src_endpoint.port`, comparing numbers and strings alike.                                                                                                   |
| `SourceHostname`      | Reads `src_endpoint.hostname`.                                                                                                                                    |
| `Image`               | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `CommandLine`         | Reads `actor.process.cmd_line`. Uses the acting process command line.                                                                                             |
| `ParentImage`         | Reads `actor.process.parent_process.path`, falling back to `actor.process.parent_process.file.path` when absent or empty. Uses the parent of the acting process.  |
| `ParentCommandLine`   | Reads `actor.process.parent_process.cmd_line`.                                                                                                                    |
| `User`                | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                               |
| `ProcessId`           | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |
| `ProcessGuid`         | Reads `actor.process.uid`.                                                                                                                                        |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field           | Reason                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `SourceIsIpv6`        | OCSF encodes the address family in the address itself.                                           |
| `DestinationIsIpv6`   | OCSF encodes the address family in the address itself.                                           |
| `SourcePortName`      | The Network Activity mapping resolves the service name from a table, not from the source string. |
| `DestinationPortName` | The Network Activity mapping resolves the service name from a table, not from the source string. |

### Windows named pipe creation

product: windows, category: pipe\_created, service: sysmon (optional)

* product: windows
* category: pipe\_created
* service: sysmon (optional)

#### Event guard

Matches Windows Resource Activity (`class_uid: 201003`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field   | OCSF lookup and interpretation                                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`     | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `PipeName`    | Reads `win_resource.name`.                                                                                                                                        |
| `Image`       | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `User`        | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                               |
| `ProcessId`   | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |
| `ProcessGuid` | Reads `actor.process.uid`.                                                                                                                                        |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field | Reason                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------- |
| `EventType` | The Windows Resource Activity mapping does not distinguish pipe creation from connection. |

### Windows process access

product: windows, category: process\_access, service: sysmon (optional)

* product: windows
* category: process\_access
* service: sysmon (optional)

#### Event guard

Matches Process Activity (`class_uid: 1007`) with `activity_id` `3`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `SourceImage`       | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `TargetImage`       | Reads `process.path`, falling back to `process.file.path` when absent or empty. Uses the affected process.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `SourceUser`        | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `TargetUser`        | Rebuilds `DOMAIN\name` from `process.user.domain` and `process.user.name`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `SourceProcessId`   | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `TargetProcessId`   | Reads `process.pid`, comparing numbers and strings alike.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `SourceProcessGUID` | Reads `actor.process.uid`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `TargetProcessGUID` | Reads `process.uid`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `GrantedAccess`     | Reads `requested_permissions`. Translates rule values: `0x1000` → `4096`, `0x1010` → `4112`, `0x1400` → `5120`, `0x1410` → `5136`, `0x1418` → `5144`, `0x1438` → `5176`, `0x143a` → `5178`, `0x1f0fff` → `2035711`, `0x1f1fff` → `2039807`, `0x1f2fff` → `2043903`, `0x1f3fff` → `2047999`, `0x1fffff` → `2097151`, `0x40` → `64`, `0x100000` → `1048576`, `0x100040` → `1048640`, `0x1f00` → `7936`, `0x1fff` → `8191`, `0x2000` → `8192`, `0x0800` → `2048`, `0x800` → `2048`, `0x0400` → `1024`, `0x400` → `1024`, `0x0040` → `64`, `0x0010` → `16`, `0x10` → `16`. Translates the exact hexadecimal mask to the OCSF integer; rules that match mask fragments are skipped. |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field | Reason                                |
| ----------- | ------------------------------------- |
| `CallTrace` | The call stack has no OCSF attribute. |

### Windows process creation

product: windows, category: process\_creation, service: sysmon (optional)

* product: windows
* category: process\_creation
* service: sysmon (optional)

#### Event guard

Matches Process Activity (`class_uid: 1007`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                                                                                                                        |
| `Image`             | Reads `process.path`, falling back to `process.file.path` when absent or empty.                                                                                                                                                                                                                                                                                                          |
| `ParentImage`       | Reads `process.parent_process.path`, falling back to `process.parent_process.file.path` when absent or empty. Uses the parent process only.                                                                                                                                                                                                                                              |
| `OriginalFileName`  | Reads `process.file.internal_name`. Uses embedded executable identity and never the on-disk file name.                                                                                                                                                                                                                                                                                   |
| `CommandLine`       | Reads `process.cmd_line`. Applies every modifier to one projected command line.                                                                                                                                                                                                                                                                                                          |
| `IntegrityLevel`    | Reads `process.integrity_id`. Translates rule values: `untrusted` → `1`, `low` → `2`, `medium` → `3`, `high` → `4`, `system` → `5`, `protected` → `6`, `other` → `99`, `s-1-16-0` → `1`, `s-1-16-4096` → `2`, `s-1-16-8192` → `3`, `s-1-16-12288` → `4`, `s-1-16-16384` → `5`, `s-1-16-20480` → `6`. Accepts level names and mandatory-label SIDs; a rule with another value is skipped. |
| `User`              | Rebuilds `DOMAIN\name` from `process.user.domain` and `process.user.name`. Uses the process user, not an arbitrary User object.                                                                                                                                                                                                                                                          |
| `ParentUser`        | Rebuilds `DOMAIN\name` from `process.parent_process.user.domain` and `process.parent_process.user.name`. Uses the parent process user only.                                                                                                                                                                                                                                              |
| `ParentCommandLine` | Reads `process.parent_process.cmd_line`.                                                                                                                                                                                                                                                                                                                                                 |
| `CurrentDirectory`  | Reads `process.working_directory`.                                                                                                                                                                                                                                                                                                                                                       |
| `Description`       | Reads `process.file.desc`. Uses the embedded file description.                                                                                                                                                                                                                                                                                                                           |
| `Product`           | Reads `process.file.product.name`. Uses the embedded product name.                                                                                                                                                                                                                                                                                                                       |
| `Company`           | Reads `process.file.company_name`.                                                                                                                                                                                                                                                                                                                                                       |
| `FileVersion`       | Reads `process.file.version`.                                                                                                                                                                                                                                                                                                                                                            |
| `Hashes`            | Rebuilds the `ALGORITHM=value` list from `process.file.hashes`. Never pairs an algorithm with another fingerprint's value.                                                                                                                                                                                                                                                               |

### Windows PowerShell module logging

product: windows, category: ps\_module, service: powershell (optional)

* product: windows
* category: ps\_module
* service: powershell (optional)

#### Event guard

Matches Script Activity (`class_uid: 1009`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `powershell`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field | OCSF lookup and interpretation                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`   | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `Payload`   | Reads `script.script_content.value`. Reads the pipeline payload as the script content.                                                                            |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field   | Reason                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| `ContextInfo` | The Script Activity mapping does not carry the module logging context. |

### Windows PowerShell script block

product: windows, category: ps\_script, service: powershell (optional)

* product: windows
* category: ps\_script
* service: powershell (optional)

#### Event guard

Matches Script Activity (`class_uid: 1009`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `powershell`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field       | OCSF lookup and interpretation                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`         | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `ScriptBlockText` | Reads `script.script_content.value`. Reads the text of the OCSF long string object.                                                                               |
| `ScriptBlockId`   | Reads `script.uid`.                                                                                                                                               |
| `Path`            | Reads `script.file.path`.                                                                                                                                         |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field     | Reason                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| `MessageNumber` | Script block fragments are not preserved by the Script Activity mapping. |
| `MessageTotal`  | Script block fragments are not preserved by the Script Activity mapping. |

### Windows registry key creation

product: windows, category: registry\_add, service: sysmon (optional)

* product: windows
* category: registry\_add
* service: sysmon (optional)

#### Event guard

Matches Registry Key Activity (`class_uid: 201001`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field    | OCSF lookup and interpretation                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`      | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `TargetObject` | Reads `reg_key.path`.                                                                                                                                             |
| `EventType`    | Reads `activity_id`. Translates rule values: `createkey` → `1`. Translates the Sysmon event type to the OCSF activity; a rule with another type is skipped.       |
| `Image`        | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `User`         | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                               |
| `ProcessId`    | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |
| `ProcessGuid`  | Reads `actor.process.uid`.                                                                                                                                        |

### Windows registry key deletion

product: windows, category: registry\_delete, service: sysmon (optional)

* product: windows
* category: registry\_delete
* service: sysmon (optional)

#### Event guard

Matches Registry Key Activity (`class_uid: 201001`) with `activity_id` `4`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field    | OCSF lookup and interpretation                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`      | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `TargetObject` | Reads `reg_key.path`.                                                                                                                                             |
| `EventType`    | Reads `activity_id`. Translates rule values: `deletekey` → `4`. Translates the Sysmon event type to the OCSF activity; a rule with another type is skipped.       |
| `Image`        | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `User`         | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                               |
| `ProcessId`    | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |
| `ProcessGuid`  | Reads `actor.process.uid`.                                                                                                                                        |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field | Reason                             |
| ----------- | ---------------------------------- |
| `Details`   | Registry keys carry no value data. |

### Windows registry value deletion

product: windows, category: registry\_delete, service: sysmon (optional)

* product: windows
* category: registry\_delete
* service: sysmon (optional)

#### Event guard

Matches Registry Value Activity (`class_uid: 201002`) with `activity_id` `4`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field    | OCSF lookup and interpretation                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`      | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `TargetObject` | Rebuilds the value as `reg_value.path` + `"\\"` + `reg_value.name`.                                                                                               |
| `EventType`    | Reads `activity_id`. Translates rule values: `deletevalue` → `4`. Translates the Sysmon event type to the OCSF activity; a rule with another type is skipped.     |
| `Image`        | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `User`         | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                               |
| `ProcessId`    | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                   |
| `ProcessGuid`  | Reads `actor.process.uid`.                                                                                                                                        |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field | Reason                        |
| ----------- | ----------------------------- |
| `Details`   | Deleted values carry no data. |

### Windows registry key event

product: windows, category: registry\_event, service: sysmon (optional)

* product: windows
* category: registry\_event
* service: sysmon (optional)

#### Event guard

Matches Registry Key Activity (`class_uid: 201001`) with `activity_id` `1`, `4`, `5`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field    | OCSF lookup and interpretation                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`      | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                 |
| `TargetObject` | Reads `prev_reg_key.path`, falling back to `reg_key.path` when absent or empty. For renames, TargetObject is the previous key path.                                                               |
| `NewName`      | Reads `reg_key.path`. Meaningful for renames, where the key path is the new name.                                                                                                                 |
| `EventType`    | Reads `activity_id`. Translates rule values: `createkey` → `1`, `deletekey` → `4`, `renamekey` → `5`. Translates the Sysmon event type to the OCSF activity; a rule with another type is skipped. |
| `Image`        | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                                                              |
| `User`         | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                                                               |
| `ProcessId`    | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                                                   |
| `ProcessGuid`  | Reads `actor.process.uid`.                                                                                                                                                                        |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field | Reason                             |
| ----------- | ---------------------------------- |
| `Details`   | Registry keys carry no value data. |

### Windows registry value event

product: windows, category: registry\_event, service: sysmon (optional)

* product: windows
* category: registry\_event
* service: sysmon (optional)

#### Event guard

Matches Registry Value Activity (`class_uid: 201002`) with `activity_id` `2`, `3`, `4`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field    | OCSF lookup and interpretation                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`      | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.               |
| `TargetObject` | Rebuilds the value as `reg_value.path` + `"\\"` + `reg_value.name`.                                                                                                             |
| `Details`      | Reads `reg_value.data`. Reads the value data the normalizer stored, whatever its type.                                                                                          |
| `EventType`    | Reads `activity_id`. Translates rule values: `setvalue` → `2`, `deletevalue` → `4`. Translates the Sysmon event type to the OCSF activity; a rule with another type is skipped. |
| `Image`        | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                                            |
| `User`         | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                                             |
| `ProcessId`    | Reads `actor.process.pid`, comparing numbers and strings alike.                                                                                                                 |
| `ProcessGuid`  | Reads `actor.process.uid`.                                                                                                                                                      |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field | Reason                                     |
| ----------- | ------------------------------------------ |
| `NewName`   | Registry values are not renamed as values. |

### Windows registry value set

product: windows, category: registry\_set, service: sysmon (optional)

* product: windows
* category: registry\_set
* service: sysmon (optional)

#### Event guard

Matches Registry Value Activity (`class_uid: 201002`) with `activity_id` `2`, `3`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `sysmon`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field    | OCSF lookup and interpretation                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`      | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `TargetObject` | Rebuilds the value as `reg_value.path` + `"\\"` + `reg_value.name`.                                                                                               |
| `Details`      | Reads `reg_value.data`. Reads the value data the normalizer stored, whatever its type.                                                                            |
| `Image`        | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty. Uses the acting process.                                              |
| `User`         | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`. Uses the acting user, not the affected user.                                               |

### Windows Security account change

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Account Change (`class_uid: 3001`) with `activity_id` `1`, `2`, `3`, `4`, `5`, `6`, `9`, `12`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`    | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`    | Reads `actor.session.uid_alt`.                                                                                                                                    |
| `TargetUserName`    | Reads `user.name`.                                                                                                                                                |
| `TargetDomainName`  | Reads `user.domain`.                                                                                                                                              |
| `TargetSid`         | Reads `user.uid`.                                                                                                                                                 |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field      | Reason                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `SamAccountName` | Account attribute changes (4738) land in the OCSF user management class, which this document does not cover. |
| `PrivilegeList`  | The Account Change mapping does not preserve the privilege list.                                             |

### Windows Security authentication

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Authentication (`class_uid: 3002`) with `activity_id` `1`, `2`, `3`, `4`, `5`, `6`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field                 | OCSF lookup and interpretation                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`                   | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`           | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName`         | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`            | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`            | Reads `actor.session.uid_alt`.                                                                                                                                    |
| `TargetUserName`            | Reads `user.name`.                                                                                                                                                |
| `TargetDomainName`          | Reads `user.domain`.                                                                                                                                              |
| `TargetSid`                 | Reads `user.uid`.                                                                                                                                                 |
| `TargetUserSid`             | Reads `user.uid`.                                                                                                                                                 |
| `TargetLogonId`             | Reads `session.uid_alt`.                                                                                                                                          |
| `LogonType`                 | Reads `logon_type_id`, comparing numbers and strings alike.                                                                                                       |
| `IpAddress`                 | Reads `src_endpoint.ip`.                                                                                                                                          |
| `IpPort`                    | Reads `src_endpoint.port`, comparing numbers and strings alike.                                                                                                   |
| `WorkstationName`           | Reads `src_endpoint.hostname`.                                                                                                                                    |
| `Workstation`               | Reads `src_endpoint.hostname`. NTLM authentication (4776) names the workstation without the Name suffix.                                                          |
| `AuthenticationPackageName` | Reads `auth_protocol`.                                                                                                                                            |
| `Status`                    | Reads `status_code`. Compares the NTSTATUS or Kerberos result code the source rendered.                                                                           |
| `FailureReason`             | Reads `status_detail`.                                                                                                                                            |
| `TargetServerName`          | Reads `dst_endpoint.hostname`. Explicit-credential logons (4648) name the target server.                                                                          |
| `ServiceName`               | Reads `service.name`, falling back to `dst_endpoint.svc_name` when absent or empty. Kerberos ticket events name the requested service.                            |
| `ProcessName`               | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty.                                                                       |
| `LogonProcessName`          | Reads `logon_process.name`.                                                                                                                                       |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field            | Reason                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `TicketEncryptionType` | The Authentication mapping does not preserve the Kerberos encryption type.                                     |
| `TicketOptions`        | The Authentication mapping stores Kerberos flags in the authentication token, not as the rendered option mask. |
| `SubStatus`            | The Authentication mapping keeps only the primary status code.                                                 |
| `ProcessId`            | The source renders process identifiers in hexadecimal; OCSF stores integers.                                   |
| `ElevatedToken`        | The Authentication mapping does not preserve the elevation flag.                                               |
| `ImpersonationLevel`   | The Authentication mapping does not preserve the impersonation level.                                          |

### Windows Security special privilege assignment

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Authorize Session (`class_uid: 3003`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`   | Reads `user.name`.                                                                                                                                                |
| `SubjectDomainName` | Reads `user.domain`.                                                                                                                                              |
| `SubjectUserSid`    | Reads `user.uid`.                                                                                                                                                 |
| `SubjectLogonId`    | Reads `session.uid_alt`.                                                                                                                                          |
| `PrivilegeList`     | Reads `privileges`. A rule value matches when any assigned privilege matches.                                                                                     |

### Windows Security directory and object management

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Entity Management (`class_uid: 3004`) with `activity_id` `1`, `2`, `3`, `4`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field                | OCSF lookup and interpretation                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`                  | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                              |
| `SubjectUserName`          | Reads `actor.user.name`.                                                                                                                                                                                                                                       |
| `SubjectDomainName`        | Reads `actor.user.domain`.                                                                                                                                                                                                                                     |
| `SubjectUserSid`           | Reads `actor.user.uid`.                                                                                                                                                                                                                                        |
| `SubjectLogonId`           | Reads `actor.session.uid_alt`.                                                                                                                                                                                                                                 |
| `ObjectDN`                 | Reads `entity.name`. Directory service events name the object by distinguished name.                                                                                                                                                                           |
| `ObjectName`               | Reads `entity.name`.                                                                                                                                                                                                                                           |
| `ObjectValueName`          | Reads `entity.data.attribute`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                                 |
| `AttributeLDAPDisplayName` | Reads `entity.data.attribute`. Directory service changes name the modified attribute. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                          |
| `AttributeSyntaxOID`       | Reads `entity.data.attribute_syntax_oid`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                      |
| `AttributeValue`           | Reads `entity.data.value`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                                     |
| `ObjectClass`              | Reads `entity.data.object_class`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                              |
| `ObjectServer`             | Reads `entity.data.object_server`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                             |
| `ObjectType`               | Reads `entity.data.object_type`, falling back to `entity.type` when absent or empty. Non-file, non-key object access keeps the source type as the entity type. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `OperationType`            | Reads `entity.data.operation`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                                 |
| `AccessList`               | Reads `access_list`. A rule value matches when any listed access matches.                                                                                                                                                                                      |
| `Status`                   | Reads `status_code`.                                                                                                                                                                                                                                           |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field  | Reason                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `Properties` | The Entity Management mapping does not preserve the property GUID list.                                                  |
| `AccessMask` | The source renders the access mask in hexadecimal; OCSF stores an integer.                                               |
| `ObjectGUID` | The Entity Management mapping stores the GUID as the entity identifier but rules compare it against distinguished names. |

### Windows Security log clearing

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Event Log Activity (`class_uid: 1008`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`    | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`    | Reads `actor.session.uid_alt`.                                                                                                                                    |

### Windows Security file access

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches File System Activity (`class_uid: 1001`) with `activity_id` `2`, `3`, `14`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`    | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`    | Reads `actor.session.uid_alt`.                                                                                                                                    |
| `ObjectName`        | Reads `file.path`.                                                                                                                                                |
| `ObjectType`        | Reads `class_uid`. Translates rule values: `file` → `1001`. Object access events (4663) route by object type into distinct classes; the type selects the class.   |
| `ProcessName`       | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty.                                                                       |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field  | Reason                                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| `AccessMask` | The source renders the access mask in hexadecimal; OCSF stores an integer.   |
| `AccessList` | The object access mapping does not preserve the rendered access list.        |
| `HandleId`   | Handles are not part of the OCSF object access mapping.                      |
| `ProcessId`  | The source renders process identifiers in hexadecimal; OCSF stores integers. |

### Windows Security group management

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Group Management (`class_uid: 3006`) with `activity_id` `3`, `4`, `5`, `6`, `9`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`    | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`    | Reads `actor.session.uid_alt`.                                                                                                                                    |
| `TargetUserName`    | Reads `group.name`. Group events name the group in TargetUserName.                                                                                                |
| `TargetDomainName`  | Reads `group.domain`.                                                                                                                                             |
| `TargetSid`         | Reads `group.uid`.                                                                                                                                                |
| `MemberName`        | Reads `user.name`. The member's distinguished name as the source rendered it.                                                                                     |
| `MemberSid`         | Reads `user.uid`.                                                                                                                                                 |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field     | Reason                                                             |
| --------------- | ------------------------------------------------------------------ |
| `PrivilegeList` | The Group Management mapping does not preserve the privilege list. |

### Windows Security process creation

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Process Activity (`class_uid: 1007`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                         |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                                                                                                                                                  |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                                                                                                                                                |
| `SubjectUserSid`    | Reads `actor.user.uid`.                                                                                                                                                                                                                                                                   |
| `SubjectLogonId`    | Reads `actor.session.uid_alt`.                                                                                                                                                                                                                                                            |
| `NewProcessName`    | Reads `process.path`, falling back to `process.file.path` when absent or empty.                                                                                                                                                                                                           |
| `CommandLine`       | Reads `process.cmd_line`.                                                                                                                                                                                                                                                                 |
| `ParentProcessName` | Reads `process.parent_process.path`, falling back to `process.parent_process.file.path` when absent or empty.                                                                                                                                                                             |
| `TargetUserName`    | Reads `process.user.name`. The account the new process runs as.                                                                                                                                                                                                                           |
| `TargetDomainName`  | Reads `process.user.domain`.                                                                                                                                                                                                                                                              |
| `TargetUserSid`     | Reads `process.user.uid`.                                                                                                                                                                                                                                                                 |
| `MandatoryLabel`    | Reads `process.integrity_id`. Translates rule values: `s-1-16-0` → `1`, `s-1-16-4096` → `2`, `s-1-16-8192` → `3`, `s-1-16-12288` → `4`, `s-1-16-16384` → `5`, `s-1-16-20480` → `6`. Translates the mandatory-label SID to the OCSF integrity level; a rule with another label is skipped. |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field          | Reason                                                                       |
| -------------------- | ---------------------------------------------------------------------------- |
| `NewProcessId`       | The source renders process identifiers in hexadecimal; OCSF stores integers. |
| `ProcessId`          | The source renders process identifiers in hexadecimal; OCSF stores integers. |
| `TokenElevationType` | The Security process mapping does not preserve the token elevation type.     |

### Windows Security registry key access

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Registry Key Activity (`class_uid: 201001`) with `activity_id` `2`, `3`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`    | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`    | Reads `actor.session.uid_alt`.                                                                                                                                    |
| `ObjectName`        | Reads `reg_key.path`.                                                                                                                                             |
| `ObjectType`        | Reads `class_uid`. Translates rule values: `key` → `201001`. Object access events (4663) route by object type into distinct classes; the type selects the class.  |
| `ProcessName`       | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty.                                                                       |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field  | Reason                                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| `AccessMask` | The source renders the access mask in hexadecimal; OCSF stores an integer.   |
| `AccessList` | The object access mapping does not preserve the rendered access list.        |
| `HandleId`   | Handles are not part of the OCSF object access mapping.                      |
| `ProcessId`  | The source renders process identifiers in hexadecimal; OCSF stores integers. |

### Windows Security registry value change

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Registry Value Activity (`class_uid: 201002`) with `activity_id` `2`, `3`, `4`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`    | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`    | Reads `actor.session.uid_alt`.                                                                                                                                    |
| `ObjectName`        | Reads `reg_value.path`.                                                                                                                                           |
| `ObjectValueName`   | Reads `reg_value.name`.                                                                                                                                           |
| `NewValue`          | Reads `reg_value.data`. Reads the value data the normalizer stored, whatever its type.                                                                            |
| `OldValue`          | Reads `prev_reg_value.data`.                                                                                                                                      |
| `NewValueType`      | Reads `reg_value.type`.                                                                                                                                           |
| `ProcessName`       | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty.                                                                       |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field     | Reason                                                                       |
| --------------- | ---------------------------------------------------------------------------- |
| `OperationType` | The Registry Value Activity mapping folds the operation into the activity.   |
| `ProcessId`     | The source renders process identifiers in hexadecimal; OCSF stores integers. |

### Windows Security scheduled task change

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Scheduled Job Activity (`class_uid: 1006`) with `activity_id` `1`, `2`, `3`, `4`, `5`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`    | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`    | Reads `actor.session.uid_alt`.                                                                                                                                    |
| `TaskName`          | Reads `job.name`.                                                                                                                                                 |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field   | Reason                                                             |
| ------------- | ------------------------------------------------------------------ |
| `TaskContent` | The Scheduled Job Activity mapping does not preserve the task XML. |

### Windows Security service installation

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches Windows Service Activity (`class_uid: 201004`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`    | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`    | Reads `actor.session.uid_alt`.                                                                                                                                    |
| `ServiceName`       | Reads `win_service.name`.                                                                                                                                         |
| `ServiceFileName`   | Reads `win_service.service_file.path`.                                                                                                                            |
| `ServiceAccount`    | Reads `win_service.service_start_name`.                                                                                                                           |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field        | Reason                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `ServiceType`      | The Windows Service Activity mapping translates the type into enumerations, not the rendered code.       |
| `ServiceStartType` | The Windows Service Activity mapping translates the start type into enumerations, not the rendered code. |

### Windows Security network share access

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches SMB Activity (`class_uid: 4006`) with `activity_id` `2`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field          | OCSF lookup and interpretation                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`            | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`    | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName`  | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`     | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`     | Reads `actor.session.uid_alt`.                                                                                                                                    |
| `ShareName`          | Reads `share`.                                                                                                                                                    |
| `RelativeTargetName` | Reads `file.path`.                                                                                                                                                |
| `IpAddress`          | Reads `src_endpoint.ip`.                                                                                                                                          |
| `IpPort`             | Reads `src_endpoint.port`, comparing numbers and strings alike.                                                                                                   |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field      | Reason                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| `AccessMask`     | The source renders the access mask in hexadecimal; OCSF stores an integer. |
| `AccessList`     | The SMB Activity mapping does not preserve the rendered access list.       |
| `ShareLocalPath` | The SMB Activity mapping does not preserve the local share path.           |
| `ObjectType`     | Share access events always concern files.                                  |

### Windows Security user management

product: windows, service: security

* product: windows
* service: security

#### Event guard

Matches User Management (`class_uid: 3007`) with `activity_id` `2`, `14`, `15`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `Security`. Explicitly conflicting channels: `System`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                          |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                        |
| `SubjectUserSid`    | Reads `actor.user.uid`.                                                                                                                                           |
| `SubjectLogonId`    | Reads `actor.session.uid_alt`.                                                                                                                                    |
| `TargetUserName`    | Reads `user.name`.                                                                                                                                                |
| `TargetDomainName`  | Reads `user.domain`.                                                                                                                                              |
| `TargetSid`         | Reads `user.uid`.                                                                                                                                                 |
| `PrivilegeList`     | Reads `privileges`. A rule value matches when any granted privilege matches.                                                                                      |
| `AccessList`        | Reads `privileges`. A rule value matches when any granted right matches.                                                                                          |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field      | Reason                                                                        |
| ---------------- | ----------------------------------------------------------------------------- |
| `SamAccountName` | The User Management mapping does not preserve the SAM account name attribute. |

### Windows System log event log clearing

product: windows, service: system

* product: windows
* service: system

#### Event guard

Matches Event Log Activity (`class_uid: 1008`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `System`. Explicitly conflicting channels: `Security`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field         | OCSF lookup and interpretation                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`           | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                |
| `Provider_Name`     | Reads `metadata.product.name`. The event provider becomes the OCSF product name. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `Channel`           | Reads `log_name`. For log clearing, Channel names the cleared log, which OCSF stores as the class's log name.                                                                    |
| `SubjectUserName`   | Reads `actor.user.name`.                                                                                                                                                         |
| `SubjectDomainName` | Reads `actor.user.domain`.                                                                                                                                                       |
| `BackupPath`        | Reads `file.path`.                                                                                                                                                               |

### Windows System log service activity

product: windows, service: system

* product: windows
* service: system

#### Event guard

Matches Windows Service Activity (`class_uid: 201004`) with `activity_id` `1`, `2`, `3`, `4`, `5`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_security`. Missing or unknown producer information stays eligible.

For provenance-scoped fields, expected log channel: `System`. Explicitly conflicting channels: `Security`. Missing or unknown channel information stays eligible.

#### Field projections

| Sigma field     | OCSF lookup and interpretation                                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EventID`       | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                                |
| `Provider_Name` | Reads `metadata.product.name`. The event provider becomes the OCSF product name. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                 |
| `Channel`       | Reads `metadata.log_name`. Requires consistent producer provenance because the value lives in a source-specific namespace.                                                                                                                                                                       |
| `ServiceName`   | Reads `win_service.name`.                                                                                                                                                                                                                                                                        |
| `ImagePath`     | Reads `win_service.cmd_line`. The service command line as registered.                                                                                                                                                                                                                            |
| `AccountName`   | Reads `win_service.service_start_name`.                                                                                                                                                                                                                                                          |
| `param1`        | Reads `win_service.name`. Service state changes (7036) name the service in the first parameter.                                                                                                                                                                                                  |
| `param2`        | Reads `activity_id`. Translates rule values: `running` → `3`, `stopped` → `4`, `paused` → `5`, `en cours d’exécution` → `3`, `arrêté` → `4`, `wird ausgeführt` → `3`, `beendet` → `4`. Translates the localized service state (7036) to the OCSF activity; a rule with another state is skipped. |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field   | Reason                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `ServiceType` | The Windows Service Activity mapping translates the type into enumerations, not the rendered code.       |
| `StartType`   | The Windows Service Activity mapping translates the start type into enumerations, not the rendered code. |
| `Computer`    | The host name lives in device.hostname, which no stock rule targets through this field.                  |

### Windows Defender detections

product: windows, service: windefend

* product: windows
* service: windefend

#### Event guard

Matches Detection Finding (`class_uid: 2004`) with `activity_id` `1`. Absent, Unknown, and Other activities stay eligible.

Rejects events whose `device.os` identifies an operating system other than `windows`.

For provenance-scoped fields, rejects `metadata.log_name` or `metadata.product.name` identifying a known producer other than `windows_defender`. Missing or unknown producer information stays eligible.

#### Field projections

| Sigma field   | OCSF lookup and interpretation                                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventID`     | Reads `metadata.event_code`, comparing numbers and strings alike. Requires consistent producer provenance because the value lives in a source-specific namespace. |
| `ProcessName` | Reads `actor.process.path`, falling back to `actor.process.file.path` when absent or empty.                                                                       |
| `Threat_Name` | Reads `finding_info.title`.                                                                                                                                       |
| `User`        | Rebuilds `DOMAIN\name` from `actor.user.domain` and `actor.user.name`.                                                                                            |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field    | Reason                                                                              |
| -------------- | ----------------------------------------------------------------------------------- |
| `NewValue`     | Defender configuration changes carry the new value only in the finding title.       |
| `OldValue`     | Defender configuration changes carry the old value only in the finding title.       |
| `Value`        | Defender configuration changes carry the value only in the finding title.           |
| `Path`         | The Detection Finding mapping stores the file under evidences.                      |
| `SourceName`   | The Detection Finding mapping does not preserve the detection source.               |
| `Reason`       | The Detection Finding mapping does not preserve the reason text.                    |
| `Feature_Name` | The Detection Finding mapping does not preserve the feature name.                   |
| `Action`       | The Detection Finding mapping translates the action into a disposition enumeration. |

### Zeek DNS

product: zeek, service: dns

* product: zeek
* service: dns

#### Event guard

Matches DNS Activity (`class_uid: 4003`) with `activity_id` `1`, `2`, `6`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field  | OCSF lookup and interpretation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `query`      | Reads `query.hostname`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `answers`    | Reads `rdata` from every entry of `answers`. A rule value matches when any answer matches.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `qtype_name` | Reads `query.type`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `id.resp_p`  | Reads `dst_endpoint.port`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `id.orig_h`  | Reads `src_endpoint.ip`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `id.resp_h`  | Reads `dst_endpoint.ip`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `rcode_name` | Reads `rcode_id`. Translates rule values: `noerror` → `0`, `formerr` → `1`, `servfail` → `2`, `nxdomain` → `3`, `notimp` → `4`, `refused` → `5`, `yxdomain` → `6`, `yxrrset` → `7`, `nxrrset` → `8`, `notauth` → `9`, `notzone` → `10`, `badvers` → `16`, `badsig` → `16`, `badkey` → `17`, `badtime` → `18`, `badmode` → `19`, `badname` → `20`, `badalg` → `21`, `badtrunc` → `22`, `badcookie` → `23`. Translates Zeek response code names to OCSF response code IDs; a rule with another name is skipped. |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field | Reason                                                                  |
| ----------- | ----------------------------------------------------------------------- |
| `Z`         | The DNS Activity mapping does not preserve the Zeek authoritative flag. |
| `rejected`  | The DNS Activity mapping does not preserve the Zeek rejected flag.      |
| `AA`        | The DNS Activity mapping does not preserve DNS header flags.            |
| `TC`        | The DNS Activity mapping does not preserve DNS header flags.            |
| `RD`        | The DNS Activity mapping does not preserve DNS header flags.            |
| `RA`        | The DNS Activity mapping does not preserve DNS header flags.            |

### Zeek HTTP

product: zeek, service: http

* product: zeek
* service: http

#### Event guard

Matches HTTP Activity (`class_uid: 4002`) with `activity_id` `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field   | OCSF lookup and interpretation     |
| ------------- | ---------------------------------- |
| `id.orig_h`   | Reads `src_endpoint.ip`.           |
| `id.orig_p`   | Reads `src_endpoint.port`.         |
| `id.resp_h`   | Reads `dst_endpoint.ip`.           |
| `id.resp_p`   | Reads `dst_endpoint.port`.         |
| `method`      | Reads `http_request.http_method`.  |
| `host`        | Reads `http_request.url.hostname`. |
| `uri`         | Reads `http_request.url.path`.     |
| `referrer`    | Reads `http_request.referrer`.     |
| `user_agent`  | Reads `http_request.user_agent`.   |
| `version`     | Reads `http_request.version`.      |
| `status_code` | Reads `http_response.code`.        |
| `status_msg`  | Reads `http_response.status`.      |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field         | Reason                                                             |
| ------------------- | ------------------------------------------------------------------ |
| `resp_mime_types`   | The HTTP Activity mapping does not preserve response MIME types.   |
| `orig_mime_types`   | The HTTP Activity mapping does not preserve request MIME types.    |
| `c-uri`             | Web proxy taxonomy fields do not apply to Zeek HTTP records.       |
| `c-useragent`       | Web proxy taxonomy fields do not apply to Zeek HTTP records.       |
| `request_body_len`  | The HTTP Activity mapping does not preserve request body lengths.  |
| `response_body_len` | The HTTP Activity mapping does not preserve response body lengths. |

### Zeek SMB files

product: zeek, service: smb\_files

* product: zeek
* service: smb\_files

#### Event guard

Matches SMB Activity (`class_uid: 4006`) with `activity_id` `2`. Absent, Unknown, and Other activities stay eligible.

#### Field projections

| Sigma field | OCSF lookup and interpretation                         |
| ----------- | ------------------------------------------------------ |
| `id.orig_h` | Reads `src_endpoint.ip`.                               |
| `id.orig_p` | Reads `src_endpoint.port`.                             |
| `id.resp_h` | Reads `dst_endpoint.ip`.                               |
| `id.resp_p` | Reads `dst_endpoint.port`.                             |
| `name`      | Reads `share`. Zeek names the share in the name field. |
| `path`      | Reads `file.path`.                                     |

#### Unmapped source fields

These fields are not preserved by the source-to-OCSF mapping. A rule requiring one must find an explicit representation in the input schema or it is skipped, not weakened.

| Sigma field | Reason                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| `action`    | The SMB Activity mapping folds the action into the activity and share type. |
| `size`      | The SMB Activity mapping does not preserve the file size.                   |

### API Activity

class\_uid: 6003

* class\_uid: 6003

### Account Change

class\_uid: 3001

* class\_uid: 3001

### Entity Management

class\_uid: 3004

* class\_uid: 3004

### Group Management

class\_uid: 3006

* class\_uid: 3006

### Detection Finding

class\_uid: 2004

* class\_uid: 2004

### Authentication

class\_uid: 3002

* class\_uid: 3002

### File System Activity

class\_uid: 1001

* class\_uid: 1001

### Network Activity

class\_uid: 4001

* class\_uid: 4001

### Process Activity

class\_uid: 1007

* class\_uid: 1007

### Application Lifecycle

class\_uid: 6002

* class\_uid: 6002

### HTTP Activity

class\_uid: 4002

* class\_uid: 4002

### DNS Activity

class\_uid: 4003

* class\_uid: 4003

### Kernel Extension Activity

class\_uid: 1002

* class\_uid: 1002

### Module Activity

class\_uid: 1005

* class\_uid: 1005

### Windows Resource Activity

class\_uid: 201003

* class\_uid: 201003

### Script Activity

class\_uid: 1009

* class\_uid: 1009

### Registry Key Activity

class\_uid: 201001

* class\_uid: 201001

### Registry Value Activity

class\_uid: 201002

* class\_uid: 201002

### Authorize Session

class\_uid: 3003

* class\_uid: 3003

### Event Log Activity

class\_uid: 1008

* class\_uid: 1008

### Scheduled Job Activity

class\_uid: 1006

* class\_uid: 1006

### Windows Service Activity

class\_uid: 201004

* class\_uid: 201004

### SMB Activity

class\_uid: 4006

* class\_uid: 4006

### User Management

class\_uid: 3007

* class\_uid: 3007

A listed projection describes supported interpretation, not a guarantee that your events preserve its inputs. Unlisted fields resolve literally against the input schema; if they cannot be resolved, the rule is skipped for that schema.

## 1. Examine the rule

This rule uses source fields such as `Image` and `CommandLine`, rather than OCSF paths:

```yaml
title: Elevated Command Shell Running Whoami
id: 1f2b3c4d-1111-2222-3333-444455556666
logsource:
  category: process_creation
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 1
    Image|endswith: '\cmd.exe'
    CommandLine|contains: whoami
    IntegrityLevel: High
  filter_system:
    User: NT AUTHORITY\SYSTEM
  condition: selection and not filter_system
level: high
```

The rule requires all four conditions in `selection` and excludes the account in `filter_system`. In `CommandLine|contains`, `CommandLine` is the field to look up; `contains` is the matching modifier. Include fields from negative filters in your check, not only the positive selection.

## 2. Examine the normalized event

This sample represents the input after normalization, before `sigma`:

```tql
{
  time: 1786701600000,
  class_uid: 1007,
  category_uid: 1,
  type_uid: 100701,
  activity_id: 1,
  severity_id: 1,
  metadata: {
    version: "1.9.0",
    event_code: "1",
    log_name: "Microsoft-Windows-Sysmon/Operational",
    product: {name: "Microsoft Sysmon"},
  },
  process: {
    path: r"C:\Windows\System32\cmd.exe",
    cmd_line: "cmd.exe /c whoami",
    integrity_id: 4,
    user: {domain: "CORP", name: "alice"},
  },
}
```

Notice that the event has no `Image`, `CommandLine`, or `IntegrityLevel` fields. The rule must use the built-in projections to match it.

## 3. Trace the rule fields into the event

Open the [Windows process creation field projections](check-sigma-rule-compatibility-with-ocsf.md#sigma-windows-process-creation) in the mapping catalog. Its visible selector covers the rule’s `logsource`. The family details show where Tenzir reads each field and how it interprets the value. Compare those lookups with the attributes in the sample event:

| Sigma field      | OCSF lookup                                                              | Result for the sample                                   |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| `EventID`        | `metadata.event_code`                                                    | The string `"1"` agrees with the rule’s number `1`.     |
| `Image`          | `process.path`, falling back to `process.file.path` when absent or empty | The path ends with `\cmd.exe`.                          |
| `CommandLine`    | `process.cmd_line`                                                       | The command line contains `whoami`.                     |
| `IntegrityLevel` | `process.integrity_id`                                                   | The rule value `High` translates to `4`.                |
| `User`           | `process.user.domain` and `process.user.name`                            | Reconstructs `CORP\alice`, so `filter_system` is false. |

The event supplies the primary `process.path`, so it does not need the fallback `process.file.path` for this rule.

Also check the family’s event guard: `class_uid: 1007` is Process Activity and `activity_id: 1` is Launch. The producer metadata identifies Sysmon, which matters because `EventID` belongs to a source-specific namespace. The missing optional `device.os` classifier does not exclude this event.

## 4. Run the unchanged rule

This complete pipeline evaluates the sample event against the rule and extracts three fields from the resulting finding:

```tql
from {
  time: 1786701600000,
  class_uid: 1007,
  category_uid: 1,
  type_uid: 100701,
  activity_id: 1,
  severity_id: 1,
  metadata: {
    version: "1.9.0",
    event_code: "1",
    log_name: "Microsoft-Windows-Sysmon/Operational",
    product: {name: "Microsoft Sysmon"},
  },
  process: {
    path: r"C:\Windows\System32\cmd.exe",
    cmd_line: "cmd.exe /c whoami",
    integrity_id: 4,
    user: {domain: "CORP", name: "alice"},
  },
}
sigma rules=r#"
title: Elevated Command Shell Running Whoami
id: 1f2b3c4d-1111-2222-3333-444455556666
logsource:
  category: process_creation
  product: windows
  service: sysmon
detection:
  selection:
    EventID: 1
    Image|endswith: '\cmd.exe'
    CommandLine|contains: whoami
    IntegrityLevel: High
  filter_system:
    User: NT AUTHORITY\SYSTEM
  condition: selection and not filter_system
level: high
"#
select title=finding_info.title,
       image=evidences[0].data.process.path,
       command_line=evidences[0].data.process.cmd_line
```

```tql
{
  title: "Elevated Command Shell Running Whoami",
  image: "C:\\Windows\\System32\\cmd.exe",
  command_line: "cmd.exe /c whoami",
}
```

The default result of `sigma` is an OCSF Detection Finding; `select` extracts the fields shown here. The complete finding retains the original event in `evidences[0].data` and the field-level match explanation in `evidences[1].sigma.fields`. Match evidence explains successful matches, not why an arbitrary event failed to match.

To check your own data, replace the example’s `from` operator with your source and normalization steps, keeping the rule unchanged. Our [execution guide](execute-sigma-rules.md#choose-a-rule-source) shows how to load a rule library instead of embedding a single rule.

## 5. Recognize different failure modes

Make each of these changes separately to the working example, restoring it before the next test.

### A value does not match

Change the sample event’s `process.cmd_line` to `"cmd.exe /c hostname"`. The pipeline produces no finding: the command line no longer contains `whoami`. Restore `"cmd.exe /c whoami"` and the sample matches again. There is no missing-field warning to fix.

Removing `process.cmd_line` from the sample also produces no finding without a skip warning. The `CommandLine` projection is supported, but this event no longer carries a value that can satisfy it. Preserve the command line in your normalization; changing the matching mode cannot recover it.

### A rule field cannot be resolved

In the embedded rule, add this condition under `detection.selection`, alongside the existing ones:

```yaml
CallTrace|contains: ntdll.dll
```

Evaluate the modified rule against the original event. The diagnostic includes:

```text
warning: sigma operator skips rule '<rules[0]>' for OCSF input
```

```text
= note: unresolved Sigma fields: `CallTrace`
= note: field `CallTrace` is absent from the OCSF schema
```

This family has no projection for `CallTrace`, and the input has no literal field with that name. Tenzir skips the complete rule for this schema instead of dropping the condition. If a real rule needs this evidence, use a source that supplies it and preserve an explicit representation through normalization. Do not substitute a similarly named field or remove the condition just to obtain a match.

No finding and no warning is not a compatibility report. Inspect the actual input values and test a known-positive event. A field absent from the schema, a null value, a conflicting event guard, and an ordinary nonmatching value are not interchangeable diagnoses.
