#!/usr/bin/env python3
"""Sync Semaphore templates from the repo tree (scan, no catalog).

The tree is the catalog: every ansible/playbooks/*.yml file derives a
check + apply template pair. Exceptions live in SKIP_PLAYBOOKS and
SCHEDULES below — nothing else is configured.

Idempotent reconciliation:
  - create derived templates that are missing
  - update derived templates whose playbook/description/args changed
  - delete derived templates whose playbook is gone
  - never touch templates whose names don't match the derived convention
    (hand-made templates and this script's own sync template are safe)

Runs as a Semaphore python task. Required env:
  SEMAPHORE_URL       API base, e.g. http://semaphore.semaphore.svc.cluster.local
  SEMAPHORE_TOKEN     API token (env-type secret on the sync environment)
  SEMAPHORE_PROJECT_ID  numeric project id
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

import yaml

# --- exceptions (the only configuration) -------------------------------------

# bootstrap is day-0 interactive (-u root from a laptop); site is an
# aggregator alias for common — templating both would duplicate every run.
SKIP_PLAYBOOKS = {"bootstrap.yml", "site.yml"}

# template name -> (schedule name, cron). Schedules are enforced, not
# just created: the cron here is the truth.
SCHEDULES = {"common.yml — apply": ("nightly-drift-correction", "30 3 * * *")}

# Named resources the derived templates attach to.
REPO_NAME = "homelab"
INVENTORY_NAME = "hosts (repo file)"
ENVIRONMENT_NAME = "ansible-context"

CHECK_ARGS = ["--check", "--diff"]

# Derived-name convention. Anything not matching BOTH patterns is left alone.
SUFFIX_CHECK = ".yml — check"
SUFFIX_APPLY = ".yml — apply"

REPO_ROOT = Path(__file__).resolve().parents[2]

# --- tiny API client ----------------------------------------------------------


class Client:
    def __init__(self, base: str, token: str, project_id: int):
        self.base = base.rstrip("/") + "/api"
        self.token = token
        self.project = project_id

    def req(self, method: str, path: str, body: dict | None = None) -> tuple[int, object]:
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(
            self.base + path,
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(r, timeout=20) as resp:
                raw = resp.read().decode()
                return resp.status, (json.loads(raw) if raw.strip() else None)
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            return e.code, (json.loads(raw) if raw.strip() else raw)

    def get(self, path: str):
        code, body = self.req("GET", path)
        if code != 200:
            raise RuntimeError(f"GET {path}: {code} {body}")
        return body

    def send(self, method: str, path: str, body: dict, expect: tuple[int, ...]):
        code, resp = self.req(method, path, body)
        if code not in expect:
            raise RuntimeError(f"{method} {path}: {code} {resp}")
        return resp

    # project-scoped helpers
    def list(self, kind: str):
        return self.get(f"/project/{self.project}/{kind}")

    def create(self, kind: str, body: dict):
        return self.send("POST", f"/project/{self.project}/{kind}", {**body, "project_id": self.project}, (201,))

    def update(self, kind: str, obj_id: int, body: dict):
        return self.send("PUT", f"/project/{self.project}/{kind}/{obj_id}", {**body, "id": obj_id, "project_id": self.project}, (204, 200))

    def delete(self, kind: str, obj_id: int):
        return self.send("DELETE", f"/project/{self.project}/{kind}/{obj_id}", None, (204,))


# --- scan ---------------------------------------------------------------------


def scan_playbooks() -> dict[str, str]:
    """Return {playbook filename: description} for all non-skipped playbooks."""
    pdir = REPO_ROOT / "ansible" / "playbooks"
    out = {}
    for f in sorted(pdir.glob("*.yml")):
        if f.name in SKIP_PLAYBOOKS:
            continue
        try:
            doc = yaml.safe_load(f.read_text())
            desc = (doc[0].get("name") or f.name) if isinstance(doc, list) and doc else f.name
        except yaml.YAMLError:
            desc = f.name
        out[f.name] = str(desc)
    return out


def derived_name(playbook: str, suffix: str) -> str:
    return playbook[: -len(".yml")] + suffix


# --- reconcile ----------------------------------------------------------------


def template_body(cli: Client, ids: dict, name: str, playbook: str, desc: str, args: list[str] | None) -> dict:
    body = {
        "name": name,
        "playbook": f"ansible/playbooks/{playbook}",
        "description": desc,
        "inventory_id": ids["inventory"],
        "repository_id": ids["repository"],
        "environment_ids": [ids["environment"]],
        "environment_id": ids["environment"],
        "app": "ansible",
        "type": "",
        "allow_override_args_in_task": True,
    }
    if args is not None:
        body["arguments"] = json.dumps(args)
    return body


def reconcile_templates(cli: Client, ids: dict, playbooks: dict[str, str]) -> list[str]:
    log = []
    existing = {t["name"]: t for t in cli.list("templates")}

    desired = {}
    for pb, desc in playbooks.items():
        desired[derived_name(pb, SUFFIX_CHECK)] = template_body(cli, ids, derived_name(pb, SUFFIX_CHECK), pb, desc, CHECK_ARGS)
        desired[derived_name(pb, SUFFIX_APPLY)] = template_body(cli, ids, derived_name(pb, SUFFIX_APPLY), pb, desc, None)

    # create / update
    for name, body in desired.items():
        cur = existing.get(name)
        if cur is None:
            cli.create("templates", body)
            log.append(f"created template {name!r}")
        else:
            changed = (
                cur.get("playbook") != body["playbook"]
                or (cur.get("description") or "") != body["description"]
                or (cur.get("arguments") or "") != (body.get("arguments") or "")
                or cur.get("inventory_id") != body["inventory_id"]
                or cur.get("repository_id") != body["repository_id"]
                or (cur.get("environment_ids") or []) != body["environment_ids"]
            )
            if changed:
                cli.update("templates", cur["id"], body)
                log.append(f"updated template {name!r}")

    # delete derived-named templates with no backing playbook
    for name, cur in existing.items():
        if name not in desired and name.endswith((SUFFIX_CHECK, SUFFIX_APPLY)):
            base = name[: -len(SUFFIX_CHECK)] if name.endswith(SUFFIX_CHECK) else name[: -len(SUFFIX_APPLY)]
            if base + ".yml" not in playbooks:
                cli.delete("templates", cur["id"])
                log.append(f"deleted template {name!r} (no playbook)")

    return log


def reconcile_schedules(cli: Client) -> list[str]:
    log = []
    templates = {t["name"]: t for t in cli.list("templates")}
    schedules = cli.list("schedules")
    by_name = {s["name"]: s for s in schedules}

    for tpl_name, (sched_name, cron) in SCHEDULES.items():
        tpl = templates.get(tpl_name)
        if tpl is None:
            log.append(f"schedule {sched_name!r}: template {tpl_name!r} missing, skipped")
            continue
        body = {
            "name": sched_name,
            "template_id": tpl["id"],
            "cron_format": cron,
            "active": True,
        }
        cur = by_name.get(sched_name)
        if cur is None:
            cli.create("schedules", body)
            log.append(f"created schedule {sched_name!r} ({cron})")
        elif cur.get("cron_format") != cron or not cur.get("active") or cur.get("template_id") != tpl["id"]:
            cli.update("schedules", cur["id"], body)
            log.append(f"updated schedule {sched_name!r} -> {cron}")

    return log


def main() -> int:
    base = os.environ.get("SEMAPHORE_URL")
    token = os.environ.get("SEMAPHORE_TOKEN")
    project = os.environ.get("SEMAPHORE_PROJECT_ID")
    missing = [k for k, v in (("SEMAPHORE_URL", base), ("SEMAPHORE_TOKEN", token), ("SEMAPHORE_PROJECT_ID", project)) if not v]
    if missing:
        print(f"missing env: {', '.join(missing)}", file=sys.stderr)
        return 1

    cli = Client(base, token, int(project))

    ids = {
        "repository": next(r["id"] for r in cli.list("repositories") if r["name"] == REPO_NAME),
        "inventory": next(i["id"] for i in cli.list("inventory") if i["name"] == INVENTORY_NAME),
        "environment": next(e["id"] for e in cli.list("environment") if e["name"] == ENVIRONMENT_NAME),
    }

    playbooks = scan_playbooks()
    print(f"scanned {len(playbooks)} playbook(s): {', '.join(sorted(playbooks))}")

    log = reconcile_templates(cli, ids, playbooks)
    log += reconcile_schedules(cli)

    if log:
        print("\n".join(log))
    else:
        print("already in sync — no changes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
