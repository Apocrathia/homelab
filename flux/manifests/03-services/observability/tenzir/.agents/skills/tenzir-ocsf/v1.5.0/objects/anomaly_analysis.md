# Anomaly Analysis (anomaly_analysis)

Describes the analysis of activity patterns and anomalies of target entities to identify potential security threats, performance issues, or other deviations from established baselines. This includes monitoring and analyzing user interactions, API usage, resource utilization, access patterns and other measured indicators.

## Attributes

### `analysis_targets`

- **Type**: [`analysis_target`](analysis_target.md)
- **Requirement**: required

The analysis targets define the scope of monitored activities, specifying what entities, systems or processes are analyzed for activity patterns.

### `anomalies`

- **Type**: [`anomaly`](anomaly.md)
- **Requirement**: required

List of detected activities that significantly deviate from the established baselines. This can include unusual access patterns, unexpected user-agents, abnormal API usage, suspicious traffic spikes, unauthorized access attempts, and other activities that may indicate potential security threats or system issues.

### `baselines`

- **Type**: [`baseline`](baseline.md)
- **Requirement**: recommended

List of established patterns representing normal activity that serve as reference points for anomaly detection. This includes typical user interaction patterns like common user-agents, expected API access frequencies and patterns, standard resource utilization levels, and regular traffic flows. These baselines help establish what constitutes 'normal' activity in the system.
