# Homelab

This is where I am going to try and build my kubernetes homelab.

## Architecture

After spending years working with k3s, I have decided to try and migrate more of my services to kubernetes. However, k3s is a pain in the ass to install and manage. So I am going to try and use kubernetes in a more standard way, but also not at all.

### Talos Linux

I am going to use [Talos Linux](https://talos.dev/) as my base OS. I like the idea of a minimal OS for kubernetes. All of the overhead of a full OS is not necessary for kubernetes.

### Infrastructure

The cluster hardware is a combination of physical and virtual machines.

#### Physical Machines

- 3x Dell Optiplex 7050 SFF

#### Virtual Machines

- 4x Proxmox VMs

### Bootstrap

What do I need to bootstrap the cluster?

- Flux
- 1Password Connect
- Metrics exporter

### Infrastructure

What do we need to make everything work?

- Longhorn
- Cilium
- CoreDNS on 10.50.8.53

### Services

What services do I need to initially deploy to the cluster?

- Elastic
- GitLab Agent
- GitLab Runner

### Apps

What do I actually want to do?

- Create a test app

## Getting Started

Go to the [Talos](./talos/README.md) directory to bootstrap the cluster.
