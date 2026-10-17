---
title: "Zscaler integration"
description: "Logs all web, firewall, and DNS traffic for users and locations."
canonical: https://tenzir.com/integrations/zscaler
source: https://tenzir.com/integrations/zscaler.md
section: "Integrations"
---

# Zscaler integration

> Logs all web, firewall, and DNS traffic for users and locations.

Zscaler’s [Nanolog Streaming Service (NSS)](https://help.zscaler.com/zia/understanding-nanolog-streaming-service) streams Zscaler logs to external systems. You can use Zscaler’s Cloud NSS or deploy an on-prem NSS server, and Tenzir can receive logs in either case.

Zscaler NSS

## Use a Cloud NSS Feed to send events to Tenzir

### Configure Tenzir

Use [`accept_splunk`](https://tenzir.com/docs/reference/operators/accept_splunk.md) to receive HEC events over HTTPS:

```tql
accept_splunk "https://0.0.0.0:8088",
  hec_token=secret("zscaler-hec-token"),
  tls={certfile: "server.crt", keyfile: "server.key"}
publish "zscaler"
```

The listener accepts HTTPS on all interfaces at port `8088`. Store your HEC token in the `zscaler-hec-token` secret. Provide a TLS certificate valid for the public hostname or IP address used in the feed URL, with its corresponding private key. Zscaler requires a chain ending at a [publicly trusted certificate authority](https://help.zscaler.com/zia/adding-cloud-nss-feeds-web-logs). Self-signed or internally issued certificates do not pass its connectivity test.

### Create a Cloud NSS Feed

Perform the following steps to create a Cloud NSS feed:

1. Log in to your ZIA Admin Portal and go to *Administration → Nanolog Streaming Service*.
2. Select the *Cloud NSS Feeds* tab.
3. Click *Add Cloud NSS Feed*.

In the new dialog, configure the following options:

* **Feed Name**: Enter a name, e.g., `Tenzir ZIA Logs`

* **NSS Type**: NSS for Web

* **Status**: Enabled

* **SIEM Rate**: Unlimited

* **SIEM Type**: Splunk

* **OAuth 2.0 Authentication**: disabled

* **Max Batch Size**: 16 KB

* **API URL**: Enter the URL that identifies the Tenzir pipeline where the Splunk HEC endpoint is listening, e.g., `https://1.2.3.4:8088/services/collector`.

* **HTTP Headers**: Use the same token as in the Tenzir secret:

  * `Authorization`: `Splunk YOUR_TOKEN`
  * `Content-Encoding`: `gzip`

* **Feed Output Type**: JSON

* **Feed Output Format**: Use a HEC JSON envelope with the log record inside its `event` field. Zscaler provides the complete web-log template in its [Splunk deployment guide](https://help.zscaler.com/downloads/zscaler-technology-partners/operations/zscaler-and-splunk-deployment-guide/Zscaler-Splunk-Deployment-Guide-FINAL.pdf).

* **JSON Array Notation**: disabled

* **Feed Escape Character**: `,\"`

After a web, firewall, or DNS feed has been configured, activate the changes as needed and test the feed. To test the connection:

1. Go to *Administration* → *Nanolog Streaming Service* → *Cloud NSS Feeds*.
2. Click the *Cloud icon*. This sends a test message to the Tenzir receiver.

## Use an NSS Feed to send events to Tenzir

The on-prem NSS server VM pulls logs from the Zscaler cloud and pushes them to Tenzir via Syslog over TCP. The NSS server also buffers logs if the TCP connection goes down.

Unencrypted Communication

Note that the forwarding TCP connection is *unencrypted*, as the assumption is that the NSS server is on premises next to the receiver.

### Configure Tenzir

Spin up a Tenzir pipeline that accepts [TCP](tcp.md) connection and parses [Syslog](syslog.md):

```tql
accept_tcp "0.0.0.0:514" {
  read_syslog
}
publish "zscaler"
```

In the above example, the pipeline uses `0.0.0.0` to listen on all IP addresses available.

Depending on how your NSS Feed is configured, you can futher dissect the opaque Syslog message into a structured record.

### Create an NSS Feed

First, [deploy an NSS server](https://help.zscaler.com/zia/adding-nss-servers). Then log into ZIA using your administrator account:

1. Go to *Administration* → *Cloud Configuration* → *Nanolog Streaming Service*.
2. Verify that the NSS State is Healthy. Deploy a new NSS server by following the steps at [NSS Deployment Guides](https://help.zscaler.com/zia/nanolog-streaming-service).
3. Click the *NSS Feeds* tab, and then click *Add NSS Feed*.

Follow the [official documentation to add an NSS feed](https://help.zscaler.com/zia/adding-nss-feeds). You can add up to 16 NSS feeds per NSS server.

In the new dialog, configure the following options:

* **Feed Name**: Enter a name, e.g., `Tenzir ZIA Logs`
* **NSS Server**: Choose your server
* **Status**: Enabled
* **SIEM Destination Type**: FQDN
* **SIEM IP Address**: Enter the address of your Tenzir Node
* **SIEM TCP Port**: Enter the port of your pipeline
* **SIEM Rate**: Unlimited
* **Feed Output Type**: JSON
* **Feed Escape Character**: `,\"`
