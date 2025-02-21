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

## Bootstrap

What do I need to bootstrap the cluster?

- Flux

## Services

What services do I want to initially deploy to the cluster?

- Longhorn
- 1Password Connect
- Cilium
- GitLab Agent
- GitLab Runner
