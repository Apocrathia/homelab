# templates — nginx_site vhost template

`site.conf.j2` renders the HTTPS reverse-proxy vhost: the http-to-https
redirect, the cert pair from `nginx_site_tls_dir`, websocket upgrade headers,
and the optional shared-webroot block.

> **Navigation**: [← Back to nginx_site — nginx vhost role](../README.md)
