---
title: "Overview"
canonical: https://tenzir.com/docs/guides/installation
source: https://tenzir.com/docs/guides/installation.md
section: "Docs"
---

# Overview

> This guide shows you how to install the Tenzir CLI to run pipelines locally or deploy a persistent node. The package includes two binaries:

This guide shows you how to install the Tenzir CLI to run pipelines locally or deploy a persistent node. The package includes two binaries:

* **`tenzir`**: Execute a single pipeline from the command line
* **`tenzir-node`**: Run a persistent node for continuous pipeline execution

These binaries run pipelines on your machine. To manage pipelines through a web interface, [create an account](installation/create-account.md) and use the [platform](https://app.tenzir.com). See the [architecture overview](../explanations/deployment.md) to learn how they fit together.

Supported Platforms

Tenzir runs on **macOS 26 or newer** (Apple Silicon) and **Linux** (x86\_64, ARM64).

Choose the installation method that fits your use case.

## uvx

Run pipelines instantly without installation:

```sh
uvx tenzir 'from {x: 42}'
```

Use `uvx tenzir@latest` to ensure you always get the most recent release. If startup time is a concern, omit `@latest` and manually refresh the cache when you want updates.

## curl installer

Run the installer and follow the instructions to download the binaries, and optionally start a node:

```sh
curl https://get.tenzir.app | sh
```

The installer script asks for confirmation before performing the installation. It uses the package manager of your Linux distribution to install the Tenzir package. This typically also creates a [systemd](https://systemd.io) unit and starts the node automatically.

## Packages

* macOS

  Install Tenzir on macOS (Apple Silicon) via [Homebrew](https://brew.sh):

  ```sh
  brew install --cask tenzir/tenzir/tenzir
  ```

  Or tap the repository first if you prefer:

  ```sh
  brew tap tenzir/tenzir
  brew install --cask tenzir
  ```

  To uninstall, run `brew uninstall --cask tenzir`.

* Debian

  1. Download the latest [Debian package](https://storage.googleapis.com/tenzir-dist-public/packages/main/debian/tenzir_latest_amd64.deb) ([arm64 version](https://storage.googleapis.com/tenzir-dist-public/packages/main/debian/tenzir_latest_arm64.deb)).

  2. Install it via `dpkg`:

     ```sh
     dpkg -i tenzir_latest_arm64.deb
     ```

  To uninstall, run `apt-get remove tenzir`. Use `purge` instead of `remove` to also delete the state directory.

* RPM-based

  1. Download the latest [RPM package](https://storage.googleapis.com/tenzir-dist-public/packages/main/rpm/tenzir-latest-x86_64-linux-static.rpm) ([aarch64 version](https://storage.googleapis.com/tenzir-dist-public/packages/main/rpm/tenzir-latest-aarch64-linux-static.rpm)).

  2. Install it via `rpm`:

     ```sh
     rpm -i tenzir-latest-x86_64-linux-static.rpm
     ```

* Nix

  Run Tenzir ad-hoc without installing:

  ```sh
  nix --accept-flake-config run github:tenzir/tenzir/latest 'from {x: 42}'
  ```

  Or enter a shell with Tenzir available:

  ```sh
  nix --accept-flake-config shell github:tenzir/tenzir/latest -c $SHELL
  ```

  Install a Tenzir Node by adding `github:tenzir/tenzir/latest` to your flake inputs, or use your preferred method to include third-party modules on classic NixOS.

  Pre-built only!

  The default attributes of the flake contain some closed source plugins and will fail to download locally. The flake is only for public consumption together with the [Tenzir cachix cache](https://tenzir.cachix.org).

* Docker

  Run pipelines in a container without installing anything locally:

  ```sh
  docker run --rm -it tenzir/tenzir 'from {x: 42}'
  ```

* Tarball

  1. Download the [static binary tarball](https://storage.googleapis.com/tenzir-dist-public/packages/main/tarball/tenzir-latest-x86_64-linux-static.tar.gz).

  2. Unpack it into `/opt/tenzir`:

     ```sh
     tar xzf tenzir-latest-x86_64-linux-static.tar.gz -C /
     ```

  We also offer [prebuilt binaries for every commit to `main`](https://storage.googleapis.com/tenzir-dist-public/packages/main/tarball/tenzir-main-x86_64-linux-static.tar.gz) ([aarch64 version](https://storage.googleapis.com/tenzir-dist-public/packages/main/tarball/tenzir-main-aarch64-linux-static.tar.gz)).

## Build from source

You can also [build from source](development/build-from-source.md). Note that this excludes proprietary plugins that ship with our prebuilt packages.

## Next steps

* [Run pipelines](basic-usage/run-pipelines.md): Execute TQL pipelines from the CLI
* [Deploy a node](node-setup/deploy-a-node.md): Run a persistent node for continuous operation
* [Configuration](../explanations/configuration.md): Learn how to configure Tenzir with files and environment variables
