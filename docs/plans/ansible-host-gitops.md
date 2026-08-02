---
title: "Ansible host GitOps"
status: active
found_at: 2026-08-01
updated_at: 2026-08-01
related_issue: docs/issues/unifi-uxg-ipfix-ck-plus-hosting.md
area: agents
---

# Ansible host GitOps

## Goal

Manage non-Kubernetes Linux hosts declaratively from this repo via Ansible
playbooks applied by GitLab CI (Fleet-shaped), starting with a `common`
baseline and inventory stubs for game host, gaming PC, signage, and the UniFi
NUC (BLKNUC7i7DNK1E).

## Scope

**In scope:**

- `ansible/` tree at repo root (cfg, inventory, playbooks, `roles/common`)
- GitLab CI: lint/syntax always; `--check` / apply via 1Password Connect
- Learnings from `homelab.gh/Ansible/` kept selectively (see Decisions)

**Out of scope:**

- AWX / Semaphore (deferred until CI proves insufficient)
- Docker Compose roles (compose retired)
- Ansible-managed Kubernetes / k3s / Proxmox cluster bootstrap (Talos + Flux /
  OpenTofu own that)
- UniFi OS Server install play (Track A consumer — after NUC is staged)
- Full CIS / `devsec.hardening` on day one
- Storing deploy keys as GitLab CI variables (Connect is the bus)

## Decisions

- **Execution** — GitLab CI push over SSH, not AWX — mirrors `fleet/` gitops;
  reversible later with Semaphore if a UI is needed.
- **Secrets** — 1Password item `ansible-secrets` (vault `Secrets`); CI fetches
  via Connect (`OP_CONNECT_HOST` + `OP_CONNECT_TOKEN`, same as tofu). Fields:
  `ansible_gitops_ed25519`, `ansible_gitops_known_hosts` (multiline text),
  `sudo-password`. No committed vault file / no GitLab SSH vars.
- **Layout** — lowercase `ansible/`; purpose inventory groups; thin playbooks +
  `site.yml`; minimal `ansible.cfg` (not a dumped defaults file).
- **Become** — `--become-password-file` from Connect `sudo-password`;
  `common_passwordless_sudo` defaults false.
- **Port from homelab.gh** — `common` tags, GitHub `.keys` authorized_keys,
  timezone/`github_username` group vars, `requirements.yml`. Drop
  `ignore_errors: true`, k8s/docker/proxmox roles, compose files.

## Steps

- [x] Scaffold `ansible/` + `roles/common` + inventory stubs
- [x] Wire `ansible/.gitlab-ci.yml` and root `include`
- [x] Document keep/drop from `homelab.gh` in README + this plan
- [x] Fetch deploy key + known_hosts + `sudo-password` from 1Password Connect
- [x] Confirm Connect token can read `Secrets` / `ansible-secrets`
- [ ] Install deploy pubkey on hosts; MR `ansible-check` green
- [ ] Bootstrap first host (`playbooks/bootstrap.yml`) then `common.yml`
- [ ] Stage UniFi NUC + Track A cutover (links to related issue)
- [ ] Expand roles only when a host needs them (no speculative roles)

## Feedback loop

- Local: `cd ansible && ansible-playbook --syntax-check playbooks/site.yml && ansible-lint playbooks roles inventory`
- CI: `ansible-validate` green on MRs touching `ansible/**`
- Live: `ansible-playbook --check --diff playbooks/common.yml --limit <host>`
- Fleet: host still enrolls / policies pass after config changes

## Notes

- Hardware for UniFi: BLKNUC7i7DNK1E, 32 GiB RAM, 1 TB NVMe — overkill for UOS
  Server; hosting tier was the IPFIX gate, not CPU.
- Inventory (current): `game` → `game.services.apocrathia.com`,
  `ians-gaming-pc` → `ians-gaming-pc.access.apocrathia.com`,
  `unifi-nuc` → `unifi.apocrathia.com`.
- Local verify (2026-08-01): syntax-check + `ansible-lint` production profile
  clean (Homebrew Python 3.14 + ansible-core 2.20). CI image is Python 3.12 +
  ansible-core 2.16+.
