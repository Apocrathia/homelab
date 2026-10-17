---
title: "Overview"
canonical: https://tenzir.com/docs/reference/api/node/overview
source: https://tenzir.com/docs/reference/api/node/overview.md
section: "Docs"
---

# Overview

> This reference is generated from the OpenAPI specification.

This reference is generated from the [OpenAPI specification](https://tenzir.com/openapi/node.yaml).

Use the Tenzir REST API to manage pipelines and read pipeline output from a Tenzir node.

Authenticate every request with a token in the `X-Tenzir-Token` request header. Generate tokens with `tenzir-ctl web generate-token`.

All endpoints are versioned. Prefix every path in this specification with `/v0`.

Base URL

`/api/v0`

Versioned API endpoint on the current Tenzir node.

Authentication

`TenzirToken`

API key in header `X-Tenzir-Token`

## Health

* [`/ping`postCheck node health](https://tenzir.com/docs/reference/api/node/health/ping-node.md)

## Pipeline output

* [`/serve`postRead pipeline output](https://tenzir.com/docs/reference/api/node/pipeline-output/read-pipeline-output.md)
* [`/serve-multi`postRead multiple pipeline outputs](https://tenzir.com/docs/reference/api/node/pipeline-output/read-multiple-pipeline-outputs.md)

## Pipelines

* [`/pipeline/create`postCreate a new pipeline](https://tenzir.com/docs/reference/api/node/pipelines/create-pipeline.md)
* [`/pipeline/delete`postDelete an existing pipeline](https://tenzir.com/docs/reference/api/node/pipelines/delete-pipeline.md)
* [`/pipeline/launch`postLaunch a new pipeline](https://tenzir.com/docs/reference/api/node/pipelines/launch-pipeline.md)
* [`/pipeline/list`postList pipelines](https://tenzir.com/docs/reference/api/node/pipelines/list-pipelines.md)
* [`/pipeline/reset-ttl`postReset the TTL of an existing pipeline](https://tenzir.com/docs/reference/api/node/pipelines/reset-pipeline-ttl.md)
* [`/pipeline/update`postUpdate pipeline state](https://tenzir.com/docs/reference/api/node/pipelines/update-pipeline.md)
