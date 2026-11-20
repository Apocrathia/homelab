# nginx_site: nginx vhost role

Installs nginx and renders one site vhost from `site.conf.j2` for
`nginx_site_domain`, set per host in `host_vars/`. Handlers reload nginx when
the vhost changes.

> **Navigation**: [← Back to roles README](../README.md)
