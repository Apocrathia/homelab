# Sensor Information (sensor_info)

The Sensor Information object describes a control point sensor that emits data, or originates detections. It can be part of an endpoint or agent running on an OS, a SaaS application, a network device, a Cyber Threat Intelligence (CTI) system, or other detection and enforcement technologies.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `sensor_layer`

- **Type**: `string_t`
- **Requirement**: optional

The technology or sensor layer that emitted the data, normalized to the caption of `sensor_layer_id`. When `sensor_layer_id` is `99` (Other), this attribute must contain the source-specific label.

### `sensor_layer_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `sensor_layer`

#### Enum values

- `0`: `Unknown` - The sensor layer type is Unknown.
- `1`: `Network` - The analyzed data is emitted by, or originates from a network, firewall, or IPS sensor.
- `2`: `Endpoint` - The analyzed data is emitted by, or originates from an endpoint device or agent running on an OS.
- `3`: `Email` - The analyzed data is emitted by, or originates from an email gateway or email security system.
- `4`: `IAM` - The analyzed data is emitted by, or originates from an identity and access management (IAM) system or service.
- `5`: `Proxy` - The analyzed data is emitted by, or originates from a proxy server (e.g., forward or reverse proxy, web gateway).
- `6`: `Threat Intel` - The analyzed data is emitted by, or originates from a cyber threat intelligence (CTI) system or by matching observables against a threat intelligence feed or report.
- `7`: `Application` - The analyzed data is emitted by, or originates from an application (e.g., web application, SaaS platform, or custom business application).
- `99`: `Other` - The sensor layer type is not mapped. See the `sensor_layer` attribute, which contains a data source specific value.

The normalized identifier of the sensor layer that emitted the data. For example, use this to classify the detection surface (e.g., IPS sensor, endpoint agent, email gateway). When the type is not listed, use `99` (Other) and populate `sensor_layer` with the source-specific label.
