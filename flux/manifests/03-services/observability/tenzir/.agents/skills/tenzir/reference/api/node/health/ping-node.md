---
title: "Check node health"
canonical: https://tenzir.com/docs/reference/api/node/health/ping-node
source: https://tenzir.com/docs/reference/api/node/health/ping-node.md
section: "Docs"
---

# Check node health

> post/ping

post`/ping`

Checks whether the node can respond to authenticated API requests. The response includes the node version.

Requires authentication`TenzirToken`

## Responses

200The node is healthy.

`version``string`required

The version of the responding node.

Example

```json
{
  "version": "v2.3.0-rc3-32-g8529a6c43f"
}
```

401The request is missing a valid authentication token.
