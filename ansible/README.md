# Ansible host GitOps

Declarative config for non-Kubernetes Linux hosts (Debian game host, Fedora
gaming PC, signage, UniFi NUC when staged, …). Fleet stays the
inventory/compliance plane; this tree owns package/user/system desired state.
`roles/common` branches on `ansible_os_family` (Debian apt /
unattended-upgrades vs RedHat dnf / dnf-automatic).

Archaeology: earlier patterns lived in `homelab.gh/Ansible/` (compose-era docker
roles, k3s bootstrap, vaulted local `secrets`). Do **not** port those — compose
and Ansible-managed k8s are gone. Keep the useful bits: purpose groups,
`common` tags (`packages` / `system` / `user`), `requirements.yml`, GitHub
`authorized_keys`.

## Layout

| Path                  | Role                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `ansible.cfg`         | Minimal overrides only                                           |
| `requirements.yml`    | Collection pins                                                  |
| `inventory/`          | Hosts + non-secret group/host vars                               |
| `playbooks/`          | `site.yml` aggregator, `bootstrap.yml`, `common.yml`             |
| `roles/common/`       | Baseline packages, hostname/timezone, login user                 |
| `ci/requirements.txt` | Pip pins for CI/local tooling (Renovate `pip_requirements`)      |
| `ci/fetch_op_ssh.py`  | Pull deploy key + known_hosts from 1Password Connect             |
| `.gitlab-ci.yml`      | Validate always; check/apply when Connect token can read secrets |

## Local usage

```bash
cd ansible
python -m venv .venv && source .venv/bin/activate
pip install -r ci/requirements.txt
ansible-galaxy collection install -r requirements.yml -p collections
ansible-playbook --syntax-check playbooks/site.yml
ansible-lint playbooks roles inventory
# Against a live host (SSH key + passwordless sudo for `ansible_user`):
ansible-playbook playbooks/common.yml --limit game --check --diff
```

Day-0 (create user + keys), often as root once:

```bash
ansible-playbook playbooks/bootstrap.yml --limit game -u root
```

## CI

Included from the repo-root `.gitlab-ci.yml`.

| Job                | When                            | What                                                 |
| ------------------ | ------------------------------- | ---------------------------------------------------- |
| `ansible-validate` | MR / main, `ansible/**` changes | galaxy install, syntax-check, ansible-lint           |
| `ansible-check`    | MR + `OP_CONNECT_TOKEN` set     | `ansible-playbook --check --diff playbooks/site.yml` |
| `ansible-apply`    | main + token set                | apply `playbooks/site.yml`                           |

SSH material is **not** stored as GitLab CI variables. Check/apply jobs call
[`ci/fetch_op_ssh.py`](./ci/fetch_op_ssh.py) against in-cluster 1Password
Connect (same `OP_CONNECT_*` bootstrap as tofu).

| Source   | Value                                                                                        |
| -------- | -------------------------------------------------------------------------------------------- |
| Vault    | `Secrets`                                                                                    |
| Item     | `ansible-secrets`                                                                            |
| Fields   | `ansible_gitops_ed25519`, `ansible_gitops_known_hosts` (multiline **text**), `sudo-password` |
| Optional | `ansible_gitops_ed25519.pub`                                                                 |

GitLab only needs `OP_CONNECT_TOKEN` (already used by tofu). `OP_CONNECT_HOST`
defaults to `http://onepassword-connect.onepassword-system.svc:8080`.

Check/apply use `--become-password-file` from Connect field `sudo-password`
(same password for `ianyoung` on managed hosts; split later if they diverge).
Jobs use `mcr.microsoft.com/devcontainers/python:3.12` so uid 1000 has a
passwd entry (`vscode`) and OpenSSH can start under the non-root runner.
Runner `HOME` stays `/home/gitlab-runner` (writable emptyDir); ansible gets
absolute `IdentityFile` / `UserKnownHostsFile` under that path.

## Service account

`roles/common` (user tag) maintains a dedicated `ansible` automation account on
every host — CI never logs in as a human account:

- locked password (`password_lock: true` → shadow `!`): password-aging policy
  cannot break sudo, and the account cannot be brute-forced
- deploy key `ansible_gitops_ed25519` as the only authorized key (`exclusive`)
- `/etc/sudoers.d/ansible` → `NOPASSWD: ALL` (visudo-validated, `0440`)

Rollout is two-phase, because CI must create the account before it can use it:

1. **This phase** — role creates/manages the account; CI still connects as
   `ianyoung` with the become password. Landing on main runs `ansible-apply`,
   which provisions the account on every host. Bootstrap (`-u root`) covers
   new hosts on day 0.
2. **Follow-up** — flip `ansible_user: ansible` in `group_vars/all.yml`, drop
   `--become-password-file` from CI, then retire the `sudo-password` field.

## Secrets

1Password is the SoT for the deploy key and sudo password (sudo password is
phase-1 only; it retires when `ansible_user` flips to the service account).
Use multiline text fields (not concealed) for PEM / `known_hosts`. The deploy
public key is committed in `group_vars/all.yml` — public material, repo is SoT.
Local laptop runs can use `~/.ssh/ansible_gitops_ed25519` directly; that is
not the CI path.

## Related

- Plan: [`docs/plans/ansible-host-gitops.md`](../docs/plans/ansible-host-gitops.md)
- UniFi NUC / IPFIX hosting: [`docs/issues/unifi-uxg-ipfix-ck-plus-hosting.md`](../docs/issues/unifi-uxg-ipfix-ck-plus-hosting.md)
- Fleet (visibility): [`fleet/`](../fleet/)
- Tofu Connect pattern: [`docs/plans/tofu-1password-provider.md`](../docs/plans/tofu-1password-provider.md)
