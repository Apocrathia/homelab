#!/usr/bin/env python3
"""Fetch Ansible GitOps SSH key material from 1Password Connect.

Uses the same Connect bootstrap as tofu CI (OP_CONNECT_HOST +
OP_CONNECT_TOKEN). Item field labels match the former filenames:

  ansible_gitops_ed25519
  ansible_gitops_known_hosts

Optional:
  ansible_gitops_ed25519.pub  (not required for ansible-playbook)

Environment overrides:
  ANSIBLE_OP_VAULT, ANSIBLE_OP_ITEM
  ANSIBLE_OP_FIELD_PRIVATE_KEY, ANSIBLE_OP_FIELD_KNOWN_HOSTS
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


def _require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"missing required environment variable: {name}", file=sys.stderr)
        sys.exit(1)
    return value


def _normalize_multiline(value: str) -> str:
    """Normalize field text to a file body with a trailing newline."""
    text = value.replace("\r\n", "\n")
    # Plaintext 1Password fields sometimes store literal \n sequences.
    if "\n" not in text.strip() and "\\n" in text:
        text = text.replace("\\n", "\n")
    if not text.endswith("\n"):
        text += "\n"
    return text


def _field_map(item) -> dict[str, str]:
    out: dict[str, str] = {}
    for field in item.fields or []:
        label = getattr(field, "label", None)
        value = getattr(field, "value", None)
        if label and value is not None:
            out[label] = value
    return out


def _resolve_secret(client, item, vault_id: str, name: str, fields: dict[str, str]) -> str:
    """Prefer item text fields; fall back to file attachments with the same name."""
    if name in fields and fields[name].strip():
        return fields[name]
    files = client.get_files(item.id, vault_id)
    match = next((f for f in files if getattr(f, "name", None) == name), None)
    if match is None:
        raise KeyError(name)
    content = client.get_file_content(match.id, item.id, vault_id)
    if isinstance(content, bytes):
        return content.decode("utf-8")
    return str(content)


def main() -> int:
    host = _require("OP_CONNECT_HOST")
    token = _require("OP_CONNECT_TOKEN")
    vault_name = os.environ.get("ANSIBLE_OP_VAULT", "Secrets")
    item_title = os.environ.get("ANSIBLE_OP_ITEM", "ansible-secrets")
    field_private = os.environ.get(
        "ANSIBLE_OP_FIELD_PRIVATE_KEY", "ansible_gitops_ed25519"
    )
    field_known = os.environ.get(
        "ANSIBLE_OP_FIELD_KNOWN_HOSTS", "ansible_gitops_known_hosts"
    )

    # Imported lazily so ansible-validate (no Connect) does not need the SDK.
    from onepasswordconnectsdk.client import Client

    client = Client(url=host, token=token)
    try:
        vault = client.get_vault_by_title(vault_name)
    except Exception as exc:  # noqa: BLE001 — surface Connect ACL/name mistakes
        print(
            f"vault {vault_name!r} not readable via Connect: {exc}",
            file=sys.stderr,
        )
        return 1

    try:
        item = client.get_item_by_title(item_title, vault.id)
    except Exception as exc:  # noqa: BLE001
        print(
            f"item {item_title!r} not readable in vault {vault_name!r}: {exc}",
            file=sys.stderr,
        )
        return 1
    fields = _field_map(item)
    try:
        private_key = _resolve_secret(
            client, item, vault.id, field_private, fields
        )
        known_hosts = _resolve_secret(client, item, vault.id, field_known, fields)
    except KeyError as missing:
        file_names = [
            getattr(f, "name", "?") for f in client.get_files(item.id, vault.id)
        ]
        available = sorted(set(fields) | set(file_names))
        print(
            f"item {item_title!r} missing {missing.args[0]!r}; "
            f"available fields/files: {', '.join(available) or '(none)'}",
            file=sys.stderr,
        )
        return 1

    ssh_dir = Path.home() / ".ssh"
    ssh_dir.mkdir(mode=0o700, exist_ok=True)

    private_path = ssh_dir / "id_ed25519"
    known_path = ssh_dir / "known_hosts"
    private_path.write_text(_normalize_multiline(private_key), encoding="utf-8")
    private_path.chmod(0o600)
    known_path.write_text(_normalize_multiline(known_hosts), encoding="utf-8")
    known_path.chmod(0o644)

    # Never print secret material — lengths only for operator debug.
    print(
        f"wrote {private_path} ({private_path.stat().st_size} bytes), "
        f"{known_path} ({known_path.stat().st_size} bytes) "
        f"from op://{vault_name}/{item_title}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
