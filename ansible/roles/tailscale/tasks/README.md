# tasks — tailscale role logic

`main.yml` installs tailscaled from the upstream apt repo (armored GPG key
dearmored into the keyring, deb822 repo definition), then joins the tailnet with
the tag-scoped auth key.

> **Navigation**: [← Back to tailscale README](../README.md)
