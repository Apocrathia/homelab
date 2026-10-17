---
title: "Platform Data Flow"
canonical: https://tenzir.com/docs/explanations/platform/data-flow
source: https://tenzir.com/docs/explanations/platform/data-flow.md
section: "Docs"
---

# Platform Data Flow

> This page explains what data flows between a Tenzir Node and the Tenzir Platform, so you can reason about privacy, compliance, and what an operator of the Tenzir Platform can see.

This page explains what data flows between a [Tenzir Node](../node.md) and the [Tenzir Platform](../platform.md), so you can reason about privacy, compliance, and what an operator of the Tenzir Platform can see.

When a Tenzir Node starts, it opens a single outbound, TLS-encrypted WebSocket connection to the Tenzir Platform. All communication between the two travels over that connection.

For the bigger picture on TLS termination and trust boundaries, see the [FAQ entry on data privacy](https://tenzir.com/faqs/can-tenzir-see-my-data.md).

## The connection is a tunnel, not a feed

The Tenzir Node does not push state to the Tenzir Platform. It opens the WebSocket, authenticates, and then waits. The Tenzir Platform (and through it, the app) uses this connection as a reverse tunnel to call the [node API](../../reference/operators/openapi.md) on demand.

In other words: whatever the app shows you about a Tenzir Node was pulled from that node at the moment you asked for it. The Tenzir Platform does not maintain a continuously updated mirror of the Tenzir Node’s state.

The Tenzir Node initiates the connection; the Tenzir Platform never connects to it. For nodes registered with the hosted Tenzir Platform, the endpoint defaults to `wss://ws.tenzir.app:443/production`. See [Configure TLS](../../guides/node-setup/configure-tls.md) for the TLS options.

## What the app pulls on demand

Anything you can retrieve via the [node API](../../reference/operators/openapi.md), the Tenzir Platform can retrieve on behalf of an authenticated user in your workspace. In practice this means:

* The list of **pipelines** on the Tenzir Node, their TQL source, labels, and lifecycle state.
* **Pipeline metrics** such as ingress/egress event and byte counters.
* **Diagnostics** (warnings and errors) emitted by pipelines.
* **Contexts**: their names, types, and, if you open them in the app, their contents.
* **Packages** installed on the Tenzir Node and their configuration.
* **Schemas** the Tenzir Node has seen.

These are fetched when a page or component in the app needs them. Close the page and the requests stop.

## Pipeline data does not flow through the Tenzir Platform

Pipelines run entirely on the Tenzir Node. The events flowing through a pipeline’s operators are **not** routed through the Tenzir Platform, regardless of where the pipeline was created.

The single exception is a pipeline you run interactively from the app (for example, in the Explorer). In that case the results stream Tenzir Node → Tenzir Platform → browser for as long as the view is open, so the app can render them. They are not persisted on the Tenzir Platform.

## Secrets

When a pipeline accesses a secret, the Tenzir Node requests its value from the Tenzir Platform over the same encrypted channel, and the Tenzir Platform replies with the resolved value. See [Secrets](../secrets.md).

## What is *not* sent

The Tenzir Platform does **not** receive:

* The **events stored in the Tenzir Node** (Parquet partitions, the catalog, or query results), unless you explicitly query them from the app.
* The **raw bytes** ingested from your sources.
* **Pipeline payloads** for pipelines that aren’t being viewed live in the app.
* **Configuration files**, environment variables, or secret values defined locally on the Tenzir Node.
* **Operating system logs** or anything outside the `tenzir-node` process.

## Encryption and trust

The WebSocket is TLS-encrypted and terminates at the Tenzir Platform. In the editions where Tenzir hosts the Tenzir Platform, Tenzir is therefore technically able to observe data that traverses it during interactive use. If this is unacceptable, host the Tenzir Platform yourself with the [Sovereign Edition](https://tenzir.com/pricing.md). See [Platform setup](../../guides/platform-setup.md).

## See Also

* [Configure TLS](../../guides/node-setup/configure-tls.md)
* [Platform](../platform.md)
* [Node](../node.md)
* [Secrets](../secrets.md)
* [Frequently asked questions](https://tenzir.com/faqs.md)
