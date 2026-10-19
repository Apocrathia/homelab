---
title: "Overview"
canonical: https://tenzir.com/docs/reference/api/platform/overview
source: https://tenzir.com/docs/reference/api/platform/overview.md
section: "Docs"
---

# Overview

> This reference is generated from the OpenAPI specification.

This reference is generated from the [OpenAPI specification](https://tenzir.com/openapi/platform.yaml).

API for managing Tenzir Platform workspaces, nodes, and dashboards.

Authentication

`User Key`

API key in header `X-Tenzir-UserKey`

Authentication

`Admin Key`

API key in header `X-Tenzir-AdminKey`

## Nodes

* [`/user/list-nodes`postList Nodes](https://tenzir.com/docs/reference/api/platform/nodes/list-nodes.md)
* [`/user/create-node`postCreate Node](https://tenzir.com/docs/reference/api/platform/nodes/create-node.md)
* [`/user/rename-node`postRename Node](https://tenzir.com/docs/reference/api/platform/nodes/rename-node.md)
* [`/user/delete-node`postDelete Node](https://tenzir.com/docs/reference/api/platform/nodes/delete-node.md)
* [`/user/get-node-token`postGet Node Token](https://tenzir.com/docs/reference/api/platform/nodes/get-node-token.md)
* [`/user/generate-client-config`postGenerate Client Config](https://tenzir.com/docs/reference/api/platform/nodes/generate-client-config.md)
* [`/user/generate-download-url`postGenerate Download Url](https://tenzir.com/docs/reference/api/platform/nodes/generate-download-url.md)
* [`/user/create-demo-node`postCreate Demo Node](https://tenzir.com/docs/reference/api/platform/nodes/create-demo-node.md)
* [`/user/retire-demo-node`postRetire Demo Node](https://tenzir.com/docs/reference/api/platform/nodes/retire-demo-node.md)
* [`/user/proxy`postProxy](https://tenzir.com/docs/reference/api/platform/nodes/proxy.md)
* [`/user/node-proxy/{tenant_id}/{node_id}/{http_path}`getTransparent Proxy](https://tenzir.com/docs/reference/api/platform/nodes/node-proxy-get.md)
* [`/user/node-proxy/{tenant_id}/{node_id}/{http_path}`postTransparent Proxy](https://tenzir.com/docs/reference/api/platform/nodes/node-proxy-post.md)
* [`/user/node-proxy/{tenant_id}/{node_id}/{http_path}`putTransparent Proxy](https://tenzir.com/docs/reference/api/platform/nodes/node-proxy-put.md)
* [`/user/node-proxy/{tenant_id}/{node_id}/{http_path}`deleteTransparent Proxy](https://tenzir.com/docs/reference/api/platform/nodes/node-proxy-delete.md)
* [`/user/node-proxy/{tenant_id}/{node_id}/{http_path}`patchTransparent Proxy](https://tenzir.com/docs/reference/api/platform/nodes/node-proxy-patch.md)
* [`/user/node-proxy/{tenant_id}/{node_id}/{http_path}`headTransparent Proxy](https://tenzir.com/docs/reference/api/platform/nodes/node-proxy-head.md)
* [`/user/node-proxy/{tenant_id}/{node_id}/{http_path}`optionsTransparent Proxy](https://tenzir.com/docs/reference/api/platform/nodes/node-proxy-options.md)
* [`/user/proxy-cached`postProxy Cached](https://tenzir.com/docs/reference/api/platform/nodes/proxy-cached.md)

## Dashboards

* [`/user/dashboard/store`postStore](https://tenzir.com/docs/reference/api/platform/dashboards/store.md)
* [`/user/dashboard/get`postGet](https://tenzir.com/docs/reference/api/platform/dashboards/get.md)
* [`/user/dashboard/list`postList](https://tenzir.com/docs/reference/api/platform/dashboards/list.md)
* [`/user/dashboard/delete`postDelete](https://tenzir.com/docs/reference/api/platform/dashboards/delete.md)

## Alerts

* [`/user/alert/add`postAdd](https://tenzir.com/docs/reference/api/platform/alerts/add.md)
* [`/user/alert/list`postList](https://tenzir.com/docs/reference/api/platform/alerts/list.md)
* [`/user/alert/delete`postDelete](https://tenzir.com/docs/reference/api/platform/alerts/delete.md)

## Secrets

* [`/user/secrets/add-external-store`postAdd External Store](https://tenzir.com/docs/reference/api/platform/secrets/add-external-store.md)
* [`/user/secrets/select-store`postSet Default Store](https://tenzir.com/docs/reference/api/platform/secrets/select-store.md)
* [`/user/secrets/delete-external-store`postDelete External Store](https://tenzir.com/docs/reference/api/platform/secrets/delete-external-store.md)
* [`/user/secrets/list-stores`postList Stores](https://tenzir.com/docs/reference/api/platform/secrets/list-stores.md)
* [`/user/secrets/add`postAdd](https://tenzir.com/docs/reference/api/platform/secrets/add.md)
* [`/user/secrets/update`postUpdate](https://tenzir.com/docs/reference/api/platform/secrets/update.md)
* [`/user/secrets/remove`postRemove](https://tenzir.com/docs/reference/api/platform/secrets/remove.md)
* [`/user/secrets/list`postList](https://tenzir.com/docs/reference/api/platform/secrets/list.md)

## Tenant

* [`/user/delete-tenant`postDelete Tenant](https://tenzir.com/docs/reference/api/platform/tenant/delete-tenant.md)
* [`/user/rename-tenant`postUpdate Tenant Name](https://tenzir.com/docs/reference/api/platform/tenant/rename-tenant.md)
* [`/user/switch-tenant`postSwitch Tenant](https://tenzir.com/docs/reference/api/platform/tenant/switch-tenant.md)

## Account

* [`/user/health`getHealth](https://tenzir.com/docs/reference/api/platform/account/health.md)
* [`/user/get-login-info`postGet Login Info](https://tenzir.com/docs/reference/api/platform/account/get-login-info.md)

## Admin

* [`/admin/webapp-key`getGet Webapp Key](https://tenzir.com/docs/reference/api/platform/admin/webapp-key.md)
* [`/admin/create-tenant`postCreate Tenant](https://tenzir.com/docs/reference/api/platform/admin/create-tenant.md)
* [`/admin/generate-user-key`postGenerate User Key](https://tenzir.com/docs/reference/api/platform/admin/generate-user-key.md)
* [`/admin/spawn-node`postSpawn Node](https://tenzir.com/docs/reference/api/platform/admin/spawn-node.md)
* [`/admin/global-tenant-list`getList Tenants](https://tenzir.com/docs/reference/api/platform/admin/global-tenant-list.md)
* [`/admin/force-delete-tenant`postDelete Tenant](https://tenzir.com/docs/reference/api/platform/admin/force-delete-tenant.md)
* [`/admin/check-connectivy`postCheck Connectivity](https://tenzir.com/docs/reference/api/platform/admin/check-connectivy.md)
* [`/admin/update-tenant`postUpdate Tenant Owner](https://tenzir.com/docs/reference/api/platform/admin/update-tenant.md)
* [`/admin/add-auth-function`postAdd Auth Function](https://tenzir.com/docs/reference/api/platform/admin/add-auth-function.md)
* [`/admin/delete-auth-function`postDelete Auth Function](https://tenzir.com/docs/reference/api/platform/admin/delete-auth-function.md)
