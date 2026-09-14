#!/usr/bin/env python3
"""Fetch playbook secrets from 1Password Connect into an extra-vars JSON.

Uses the same Connect bootstrap as fetch_op_ssh.py (OP_CONNECT_HOST +
OP_CONNECT_TOKEN). Writes {"var": "value", ...} to
$HOME/.ansible/op_secrets.json (override: OP_SECRETS_JSON), which the
ansible-check / ansible-apply jobs pass via `-e @...`.

Items (vault Secrets, overridable via ANSIBLE_OP_VAULT):

  tailscale-ansible-authkey / credential -> tailscale_authkey
  cloudflare-api-token      / credential -> acme_sh_cf_token

Missing items warn and are omitted (the roles fail loudly on empty vars,
scoped to the hosts that need them); the JSON file is always written so
`-e @` never breaks.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# var name -> (item title, field label)
SECRETS: dict[str, tuple[str, str]] = {
    "tailscale_authkey": ("tailscale-ansible-authkey", "credential"),
    # cloudflare-api-token is an older item: the token sits in a custom
    # "api-token" field (the default "credential" field is empty).
    "acme_sh_cf_token": ("cloudflare-api-token", "api-token"),
}


def _require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"missing required environment variable: {name}", file=sys.stderr)
        sys.exit(1)
    return value


def main() -> int:
    host = _require("OP_CONNECT_HOST")
    token = _require("OP_CONNECT_TOKEN")
    vault_name = os.environ.get("ANSIBLE_OP_VAULT", "Secrets")
    dest = Path(os.environ.get("OP_SECRETS_JSON", os.path.expanduser("~/.ansible/op_secrets.json")))

    # Imported lazily so ansible-validate (no Connect) does not need the SDK.
    from onepasswordconnectsdk.client import Client

    client = Client(url=host, token=token)
    try:
        vault = client.get_vault_by_title(vault_name)
    except Exception as exc:  # noqa: BLE001 — surface Connect ACL/name mistakes
        print(f"vault {vault_name!r} not readable via Connect: {exc}", file=sys.stderr)
        return 1

    out: dict[str, str] = {}
    missing: list[str] = []
    for var, (item_title, field_label) in SECRETS.items():
        try:
            item = client.get_item_by_title(item_title, vault.id)
        except Exception:  # noqa: BLE001 — absent item is expected pre-setup
            missing.append(f"item {item_title!r} (var {var})")
            continue
        value = ""
        for field in item.fields or []:
            if getattr(field, "label", None) == field_label and field.value:
                value = field.value
                break
        if value:
            out[var] = value
        else:
            missing.append(f"field {item_title}/{field_label} (var {var})")

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out))
    dest.chmod(0o600)
    print(f"wrote {len(out)} secret(s) to {dest}")
    if missing:
        print(f"WARNING: missing in vault {vault_name!r}: {', '.join(missing)}", file=sys.stderr)
        print("roles that need them will fail loudly; others are unaffected", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
