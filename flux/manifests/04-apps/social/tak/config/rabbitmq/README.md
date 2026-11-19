# OpenTAKServer RabbitMQ config

RabbitMQ configuration for OpenTAKServer, adapted from upstream: MQTT
listener on 1883 and HTTP auth backends hitting the OTS API on the shared
pod network. `enabled_plugins` loads `rabbitmq_mqtt` and
`rabbitmq_auth_backend_http`.

> **Navigation**: [← Back to OpenTAKServer config README](../README.md)
