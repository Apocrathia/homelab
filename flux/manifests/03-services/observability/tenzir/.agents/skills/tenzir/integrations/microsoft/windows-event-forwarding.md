---
title: "Microsoft Windows Event Forwarding integration"
description: "Acts as the collector for Windows Event Forwarding, without a Windows server or shipping agent."
canonical: https://tenzir.com/integrations/microsoft/windows-event-forwarding
source: https://tenzir.com/integrations/microsoft/windows-event-forwarding.md
section: "Integrations"
---

# Microsoft Windows Event Forwarding integration

> Acts as the collector for Windows Event Forwarding, without a Windows server or shipping agent.

Tenzir can be your Windows Event Collector (WEC). The [`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) operator receives events directly from Windows hosts through Windows Event Forwarding (WEF), without an intermediate Windows collector or shipping agent.

WEF is built into every Windows host. A Group Policy points the hosts at a *subscription manager*, which provides subscriptions that define the events to forward. The hosts push those events to the collector of the subscription. The [`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) operator acts as both the subscription manager and the collector.

Tenzir as the WEC: Windows hosts fetch subscriptions from Tenzir and forward matching events directly to accept\_wef, which acts as the subscription manager and event collector.

You can also keep a Windows collector and ship its events to Tenzir with the agent of your choice. Our [Microsoft Windows Event Collector](windows-event-collector.md) integration describes that architecture.

Hosts authenticate in one of two ways:

* **Kerberos** suits hosts in an Active Directory domain. It needs no certificates on the hosts and is what Windows uses by default.
* **Client certificates** suit hosts outside of a domain, such as workgroup machines, hosts in a DMZ, or devices that join only Microsoft Entra ID.

A pipeline accepts one of the two. Run two pipelines on different ports to accept both.

## Authenticate with Kerberos

Kerberos authenticates the computer account of each host, such as `WIN10$`, and encrypts every message, so the hosts connect over HTTP on port 5985.

Prepare the domain for the collector:

1. Create a DNS record for the collector, such as `wef.example.org`. Hosts request a ticket for this name, so they must reach the collector under it.

2. Create an Active Directory account for the collector and register the service principal names `HTTP/wef.example.org` and `HOST/wef.example.org` for it. Windows Server 2025 and Windows 11 24H2 request `HOST/`, older versions `HTTP/`.

   ```cmd
   setspn -S HTTP/wef.example.org EXAMPLE\svc-wef
   setspn -S HOST/wef.example.org EXAMPLE\svc-wef
   ```

3. Export the keys of the service principal names into a keytab, for example with `ktpass` on a domain controller or `msktutil` on Linux, and copy it to the collector.

4. Keep the clock of the collector within five minutes of the domain controllers, for example with NTP. Kerberos rejects tickets otherwise.

Then start a pipeline with the keytab:

```tql
let $query = r#"
<QueryList>
  <Query Id="0">
    <Select Path="Security">*</Select>
    <Select Path="System">*</Select>
  </Query>
</QueryList>
"#
accept_wef "0.0.0.0:5985",
  kerberos={keytab: "/etc/tenzir/wef.keytab"},
  subscriptions=[{id: "security", query: $query}]
this = data.parse_winlog()
publish "windows"
```

The `query` uses the same `QueryList` format as a native subscription, which you can export from the XML tab of a custom view in the Event Viewer. Paste it into the raw string as is, including line breaks and indentation. The pipeline identifies hosts by their principal, such as `WIN10$@EXAMPLE.ORG`, in `wef.client`.

Configure the hosts through a Group Policy. Open `Computer Configuration\Administrative Templates\Windows Components\Event Forwarding`, enable the policy “Configure target Subscription Manager”, and add the subscription manager:

```plaintext
Server=http://wef.example.org:5985/wsman/SubscriptionManager/WEC,Refresh=60
```

## Authenticate with client certificates

Client certificates authenticate hosts without a domain. The hosts connect over HTTPS on port 5986.

You need a CA, a server certificate for Tenzir, and a client certificate for every Windows host. You can issue them with Active Directory Certificate Services (AD CS) or OpenSSL:

* The server certificate needs the Server Authentication extended key usage, and its common name or a subject alternative name must match the host name in the subscription manager URL.
* Each client certificate needs the Client Authentication extended key usage and the fully qualified domain name of the host as its common name. Tenzir uses this name as the client identity.

On each Windows host, import the client certificate with its private key into the `Local Computer\Personal` store, and the CA certificate into `Local Computer\Trusted Root Certification Authorities`. Windows forwards events as the `NETWORK SERVICE` account, so grant that account read access to the private key in the certificate manager (`certlm.msc`). A missing Client Authentication usage and missing access to the private key are the most common causes of failing setups.

Start a pipeline with the certificates:

```tql
let $query = r#"
<QueryList>
  <Query Id="0">
    <Select Path="Security">*</Select>
    <Select Path="System">*</Select>
  </Query>
</QueryList>
"#
accept_wef "0.0.0.0:5986",
  tls={
    certfile: "server.pem",
    keyfile: "server-key.pem",
    client_ca: "ca.pem",
    require_client_cert: true,
  },
  subscriptions=[{id: "security", query: $query}]
this = data.parse_winlog()
publish "windows"
```

If an intermediate CA issues the client certificates, `client_ca` must hold the root CA. Import the intermediate CA into `Local Computer\Intermediate Certification Authorities` on each host, so that Windows sends it along with the client certificate.

Compute the SHA-1 thumbprint of the CA that issued the client certificates, which is the intermediate CA if there is one:

```sh
openssl x509 -in ca.pem -noout -fingerprint -sha1 | cut -d= -f2 | tr -d :
```

Then add the subscription manager with the thumbprint to the “Configure target Subscription Manager” policy as described for Kerberos:

```plaintext
Server=https://wef.example.org:5986/wsman/SubscriptionManager/WEC,Refresh=60,IssuerCA=<THUMBPRINT>
```

## Start forwarding

To forward the `Security` channel, add `NETWORK SERVICE` to the local `Event Log Readers` group of the hosts, for example through the “Restricted Groups” policy. The WinRM service must run on the hosts, which `winrm qc -q` ensures.

Apply the policy on a host with `gpupdate /force`. The host then retrieves the subscriptions and starts forwarding events.

To collect more than the classic channels, add their paths to the query, such as `Microsoft-Windows-Sysmon/Operational` for [Sysmon](../sysmon.md) or `Microsoft-Windows-PowerShell/Operational` for [PowerShell Script Block Logging](../powershell-script-block-logging.md).

## Understand delivery guarantees

[`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) acknowledges a batch only after it emitted the events and stored the host’s bookmark in the state directory. Hosts resume from their bookmark after a restart of Tenzir, so outages delay events rather than losing them, as long as the local event logs on the hosts retain the events. A batch whose acknowledgement does not reach the host arrives again, so plan for occasional duplicates.

## Troubleshoot forwarding

On a Windows host, the `Microsoft-Windows-Eventlog-ForwardingPlugin/Operational` and `Microsoft-Windows-WinRM/Operational` channels in the Event Viewer show whether the host reaches the subscription manager and why requests fail. On the Tenzir side, [`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) emits a warning for every rejected request with the reason, the client identity, and its address.

For Kerberos, `klist get HTTP/wef.example.org` on a host shows whether it can obtain a ticket for the collector. Most failures come from a missing service principal name, a keytab without the keys that the host requests, or clock skew.

## Process the events

The pipelines publish the parsed events to the `windows` topic. The [Microsoft Windows Event Logs](windows-event-logs.md) page shows how to filter and extract them, and how to map them to OCSF.
