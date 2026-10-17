# Endpoint (endpoint)

The Endpoint object describes a physical or virtual device that connects to and exchanges information with a computer network. Some examples of endpoints are mobile devices, desktop computers, virtual machines, embedded devices, and servers. Internet-of-Things devices—like cameras, lighting, refrigerators, security systems, smart speakers, and thermostats—are also endpoints.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `agent_list`

- **Type**: [`agent`](agent.md)
- **Requirement**: optional

A list of `agent` objects associated with a device, endpoint, or resource.

### `domain`

- **Type**: `string_t`
- **Requirement**: optional

The name of the domain that the endpoint belongs to or that corresponds to the endpoint.

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: recommended

The fully qualified name of the endpoint.

### `hw_info`

- **Type**: [`device_hw_info`](device_hw_info.md)
- **Requirement**: optional

The endpoint hardware information.

### `instance_uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of a VM instance.

### `interface_name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the network interface (e.g. eth2).

### `interface_uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of the network interface.

### `ip`

- **Type**: `ip_t`
- **Requirement**: recommended

The IP address of the endpoint, in either IPv4 or IPv6 format.

### `location`

- **Type**: [`location`](location.md)
- **Requirement**: optional

The geographical location of the endpoint.

### `mac`

- **Type**: `mac_t`
- **Requirement**: optional

The Media Access Control (MAC) address of the endpoint.

### `name`

- **Type**: `string_t`

The short name of the endpoint.

### `os`

- **Type**: [`os`](os.md)
- **Requirement**: optional

The endpoint operating system.

### `owner`

- **Type**: [`user`](user.md)
- **Requirement**: recommended

The identity of the service or user account that owns the endpoint or was last logged into it.

### `subnet_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of a virtual subnet.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The endpoint type. For example: `unknown`, `server`, `desktop`, `laptop`, `tablet`, `mobile`, `virtual`, `browser`, or `other`.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `1`: `Server` - A [server](https://d3fend.mitre.org/dao/artifact/d3f:Server/).
- `2`: `Desktop` - A [desktop computer](https://d3fend.mitre.org/dao/artifact/d3f:DesktopComputer/).
- `3`: `Laptop` - A [laptop computer](https://d3fend.mitre.org/dao/artifact/d3f:LaptopComputer/).
- `4`: `Tablet` - A [tablet computer](https://d3fend.mitre.org/dao/artifact/d3f:TabletComputer/).
- `5`: `Mobile` - A [mobile phone](https://d3fend.mitre.org/dao/artifact/d3f:MobilePhone/).
- `6`: `Virtual` - A [virtual machine](https://d3fend.mitre.org/dao/artifact/d3f:VirtualizationSoftware/).
- `7`: `IOT` - An [IOT (Internet of Things) device](https://www.techtarget.com/iotagenda/definition/IoT-device).
- `8`: `Browser` - A [web browser](https://d3fend.mitre.org/dao/artifact/d3f:Browser/).
- `9`: `Firewall` - A [networking firewall](https://d3fend.mitre.org/dao/artifact/d3f:Firewall/).
- `10`: `Switch` - A [networking switch](https://d3fend.mitre.org/dao/artifact/d3f:Switch/).
- `11`: `Hub` - A [networking hub](https://en.wikipedia.org/wiki/Ethernet_hub).
- `12`: `Router` - A [networking router](https://d3fend.mitre.org/dao/artifact/d3f:Router/).
- `13`: `IDS` - An [intrusion detection system](https://d3fend.mitre.org/dao/artifact/d3f:IntrusionDetectionSystem/).
- `14`: `IPS` - An [intrusion prevention system](https://d3fend.mitre.org/dao/artifact/d3f:IntrusionPreventionSystem/).
- `15`: `Load Balancer` - A [Load Balancer device.](https://en.wikipedia.org/wiki/Load_balancing_(computing))

The endpoint type ID.

### `uid`

- **Type**: `string_t`

The unique identifier of the endpoint.

### `vlan_uid`

- **Type**: `string_t`
- **Requirement**: optional

The Virtual LAN identifier.

### `vpc_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the Virtual Private Cloud (VPC).

### `zone`

- **Type**: `string_t`
- **Requirement**: optional

The network zone or LAN segment.
