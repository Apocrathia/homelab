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

- **Execution** — GitLab CI push over SSH, not AWX — mirrors `fleet/` gitops.
  Semaphore was trialed as a UI/ops surface (2026-09-16→18) and retired: it
  demanded a parallel execution plane (duplicated secrets, its own runtime,
  glibc shims for tofu) that CI already covers. Nightly drift correction
  runs as a scheduled CI pipeline instead.
- **Secrets** — 1Password item `ansible-secrets` (vault `Secrets`); CI fetches
  via Connect (`OP_CONNECT_HOST` + `OP_CONNECT_TOKEN`, same as tofu). Fields:
  `ansible_gitops_ed25519`, `ansible_gitops_known_hosts` (multiline text).
  No committed vault file / no GitLab SSH vars.
- **Layout** — lowercase `ansible/`; purpose inventory groups; thin playbooks +
  `site.yml`; minimal `ansible.cfg` (not a dumped defaults file).
- **Become** — none needed: CI connects as the `ansible` service account
  (NOPASSWD sudoers entry). `common_passwordless_sudo` stays false for humans
  (phase 1 used `--become-password-file` from Connect `sudo-password`; retired
  2026-09-16).
- **Port from homelab.gh** — `common` tags, GitHub `.keys` authorized_keys,
  timezone/`github_username` group vars, `requirements.yml`. Drop
  `ignore_errors: true`, k8s/docker/proxmox roles, compose files.
- **Service account (2026-09-08)** — dedicated `ansible` user per host, locked
  password, deploy-key auth (`exclusive`), `sudoers.d` NOPASSWD. Motivated by
  MR !4392 CI failure: `game` had a hidden 60-day password-aging policy
  (manual CIS residue, not repo-managed) that expired `ianyoung`'s password
  and broke sudo mid-run. Human accounts keep their policy; CI stops
  depending on any human password. Two-phase: role first, then
  `ansible_user` flip + become-password retirement.

## Steps

- [x] Scaffold `ansible/` + `roles/common` + inventory stubs
- [x] Wire `ansible/.gitlab-ci.yml` and root `include`
- [x] Document keep/drop from `homelab.gh` in README + this plan
- [x] Fetch deploy key + known_hosts + `sudo-password` from 1Password Connect
- [x] Confirm Connect token can read `Secrets` / `ansible-secrets`
- [x] Install deploy pubkey on hosts; MR `ansible-check` green
- [x] Bootstrap first host (`playbooks/bootstrap.yml`) then `common.yml` —
      unifi-os NUC 2026-09-08 (day-0 python3 pre-task added to bootstrap.yml)
- [x] Service account phase 1: role manages `ansible` user (locked password,
      deploy key, NOPASSWD sudo); merged !4399, applied + verified on both
      hosts 2026-09-15
- [x] Service account phase 2: flip `ansible_user`, drop become password from
      CI + README/CI notes (operator follow-up: delete the `sudo-password`
      field from the 1Password `ansible-secrets` item)
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
  `unifi-os` → `10.10.0.3` (static Management; host_vars/unifi-os.yml holds
  the full .3-per-VLAN table).
- Local verify (2026-08-01): syntax-check + `ansible-lint` production profile
  clean (Homebrew Python 3.14 + ansible-core 2.20). CI image is Python 3.12 +
  ansible-core 2.16+.
- unifi-os (2026-09-17): parallel-run state. Box holds a DHCP reservation at
  `10.0.1.3` (Legacy — same address as the planned static .3) while the
  network-tag renumber is pending; `unifi.*` DNS stays on the CK+ until the
  Track A cutover. Static .3 scheme (roles/common `network` tag): Legacy .3
  untagged (untagged-port adoption fallback), Management/Services/Media/
  Access/IoT tagged at .3; default route via Management only.
