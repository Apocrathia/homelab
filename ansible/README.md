# Ansible host GitOps

Declarative config for non-Kubernetes Linux hosts (game host, gaming PC,
signage, UniFi NUC, …). Fleet stays the inventory/compliance plane; this tree
owns package/user/system desired state.

Archaeology: earlier patterns lived in `homelab.gh/Ansible/` (compose-era docker
roles, k3s bootstrap, vaulted local `secrets`). Do **not** port those — compose
and Ansible-managed k8s are gone. Keep the useful bits: purpose groups,
`common` tags (`packages` / `system` / `user`), `requirements.yml`, GitHub
`authorized_keys`.

## Layout

| Path               | Role                                                 |
| ------------------ | ---------------------------------------------------- |
| `ansible.cfg`      | Minimal overrides only                               |
| `requirements.yml` | Collection pins                                      |
| `inventory/`       | Hosts + non-secret group/host vars                   |
| `playbooks/`       | `site.yml` aggregator, `bootstrap.yml`, `common.yml` |
| `roles/common/`    | Baseline packages, hostname/timezone, login user     |
| `.gitlab-ci.yml`   | Validate always; check/apply when deploy key is set  |

## Local usage

```bash
cd ansible
python -m venv .venv && source .venv/bin/activate
pip install 'ansible-core>=2.16,<2.19' 'ansible-lint>=24,<26'
ansible-galaxy collection install -r requirements.yml -p collections
ansible-playbook --syntax-check playbooks/site.yml
ansible-lint playbooks roles inventory
# Against a live host (SSH key + passwordless sudo for `username`):
ansible-playbook playbooks/common.yml --limit game-host --check --diff
```

Day-0 (create user + keys), often as root once:

```bash
ansible-playbook playbooks/bootstrap.yml --limit unifi-nuc -u root
```

## CI

Included from the repo-root `.gitlab-ci.yml`.

| Job                | When                               | What                                                 |
| ------------------ | ---------------------------------- | ---------------------------------------------------- |
| `ansible-validate` | MR / main, `ansible/**` changes    | galaxy install, syntax-check, ansible-lint           |
| `ansible-check`    | MR + `ANSIBLE_SSH_PRIVATE_KEY` set | `ansible-playbook --check --diff playbooks/site.yml` |
| `ansible-apply`    | main + key set                     | apply `playbooks/site.yml`                           |

Configure GitLab CI/CD variables (masked):

- `ANSIBLE_SSH_PRIVATE_KEY` — deploy key accepted by managed hosts
- `ANSIBLE_SSH_KNOWN_HOSTS` — optional but recommended

Until the key exists, only validate runs. Fill `ansible_host` (or DNS) in
`inventory/hosts.yml` before expecting check/apply to reach a host.

## Secrets

No in-repo vault file for CI. Prefer SSH keys + passwordless sudo for the
managed `username`. Local ansible-vault is optional for laptop runs and is not
the GitOps path.

## Related

- Plan: [`docs/plans/ansible-host-gitops.md`](../docs/plans/ansible-host-gitops.md)
- UniFi NUC / IPFIX hosting: [`docs/issues/unifi-uxg-ipfix-ck-plus-hosting.md`](../docs/issues/unifi-uxg-ipfix-ck-plus-hosting.md)
- Fleet (visibility): [`fleet/`](../fleet/)
