#!/usr/bin/env python3
"""
Sync UniFi firewall address groups from Uptime Robot's published checker IP list.

Expects UniFi Network Application (UniFi OS) with the standard session + CSRF flow.
See README.md for required environment variables.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests
import urllib3
from dotenv import load_dotenv

LOG = logging.getLogger(__name__)

UPTIME_ROBOT_IPS_URL_DEFAULT = "https://api.uptimerobot.com/meta/ips"

_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    load_dotenv(_env_file)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_required(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        LOG.error("missing required environment variable: %s", name)
        sys.exit(1)
    return v


def parse_uptime_robot_ips(payload: dict[str, Any]) -> tuple[list[str], list[str], str | None]:
    """Return (ipv4_hosts, ipv6_hosts, sync_token) from Uptime Robot meta/ips JSON."""
    v4: list[str] = []
    v6: list[str] = []
    for entry in payload.get("prefixes", []):
        if "ip_prefix" in entry:
            v4.append(entry["ip_prefix"].split("/")[0])
        if "ipv6_prefix" in entry:
            v6.append(entry["ipv6_prefix"].split("/")[0])
    v4_sorted = sorted(set(v4), key=lambda x: tuple(int(p) for p in x.split(".")))
    v6_sorted = sorted(set(v6))
    sync = payload.get("syncToken")
    sync_token = str(sync) if sync is not None else None
    return v4_sorted, v6_sorted, sync_token


def fetch_uptime_robot_json(url: str, session: requests.Session, verify: bool) -> dict[str, Any]:
    r = session.get(url, timeout=60, verify=verify)
    r.raise_for_status()
    return r.json()


def _decode_jwt_csrf(token_value: str) -> str | None:
    """Extract csrfToken from UniFi TOKEN cookie (JWT)."""
    parts = token_value.split(".")
    if len(parts) < 2:
        return None
    payload_b64 = parts[1]
    pad = len(payload_b64) % 4
    if pad:
        payload_b64 += "=" * (4 - pad)
    try:
        raw = base64.urlsafe_b64decode(payload_b64)
        data = json.loads(raw)
        return data.get("csrfToken") if isinstance(data, dict) else None
    except (json.JSONDecodeError, ValueError) as e:
        LOG.debug("jwt payload decode failed: %s", e)
        return None


def csrf_headers(session: requests.Session) -> dict[str, str]:
    h: dict[str, str] = {}
    for c in session.cookies:
        if c.name == "TOKEN":
            csrf = _decode_jwt_csrf(c.value)
            if csrf:
                h["x-csrf-token"] = csrf
            break
    return h


def detect_unifi_os(session: requests.Session, base_url: str, verify: bool) -> bool:
    """Match Art-of-WiFi UniFi-API-client: GET / with HTTP 200 implies UniFi OS."""
    r = session.get(urljoin(base_url + "/", "/"), timeout=30, verify=verify)
    return r.status_code == 200


def unifi_login(
    session: requests.Session,
    base_url: str,
    user: str,
    password: str,
    verify: bool,
    is_unifi_os: bool,
) -> bool:
    login_path = "/api/auth/login" if is_unifi_os else "/api/login"
    url = urljoin(base_url + "/", login_path.lstrip("/"))
    headers = {"Referer": urljoin(base_url + "/", "login")}
    r = session.post(
        url,
        json={"username": user, "password": password},
        headers=headers,
        timeout=60,
        verify=verify,
    )
    if r.status_code != 200:
        LOG.error("UniFi login failed: HTTP %s %s", r.status_code, r.text[:500])
        return False
    return True


def api_prefix(is_unifi_os: bool) -> str:
    return "/proxy/network" if is_unifi_os else ""


def rest_url(base_url: str, is_unifi_os: bool, site: str, path: str) -> str:
    p = api_prefix(is_unifi_os) + f"/api/s/{site}/rest" + path
    return urljoin(base_url + "/", p.lstrip("/"))


def get_firewall_group(
    session: requests.Session,
    base_url: str,
    is_unifi_os: bool,
    site: str,
    group_id: str,
    verify: bool,
) -> dict[str, Any] | None:
    url = rest_url(base_url, is_unifi_os, site, f"/firewallgroup/{group_id}")
    r = session.get(url, timeout=60, verify=verify)
    if r.status_code != 200:
        LOG.error("GET firewall group %s failed: HTTP %s %s", group_id, r.status_code, r.text[:500])
        return None
    body = r.json()
    data = body.get("data")
    if isinstance(data, list) and data:
        row = data[0]
        return row if isinstance(row, dict) else None
    if isinstance(data, dict):
        return data
    LOG.error("unexpected GET response shape for group %s: %s", group_id, body.keys())
    return None


def put_firewall_group(
    session: requests.Session,
    base_url: str,
    is_unifi_os: bool,
    site: str,
    group_id: str,
    payload: dict[str, Any],
    verify: bool,
) -> bool:
    url = rest_url(base_url, is_unifi_os, site, f"/firewallgroup/{group_id}")
    headers = {
        "Content-Type": "application/json",
        "Referer": urljoin(base_url + "/", ""),
    }
    headers.update(csrf_headers(session))
    r = session.put(url, json=payload, headers=headers, timeout=120, verify=verify)
    if r.status_code not in (200, 201):
        LOG.error("PUT firewall group %s failed: HTTP %s %s", group_id, r.status_code, r.text[:800])
        return False
    return True


def members_equal(a: list[str], b: list[str]) -> bool:
    return a == b


def run() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )

    base_url = _env_required("UNIFI_URL").rstrip("/")
    site = os.environ.get("UNIFI_SITE", "default").strip()
    user = _env_required("UNIFI_USERNAME")
    password = _env_required("UNIFI_PASSWORD")
    gid_v4 = _env_required("FIREWALL_GROUP_ID_V4")
    gid_v6 = _env_required("FIREWALL_GROUP_ID_V6")
    verify_ssl = _env_bool("UNIFI_VERIFY_SSL", True)
    dry_run = _env_bool("DRY_RUN", False)
    ips_url = os.environ.get("UPTIME_ROBOT_IPS_URL", UPTIME_ROBOT_IPS_URL_DEFAULT).strip()

    if not verify_ssl:
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    session = requests.Session()
    session.headers.update({"User-Agent": "homelab-unifi-ip-sync/1.0"})

    LOG.info("fetching published IPs from %s", ips_url)
    meta = fetch_uptime_robot_json(ips_url, session, verify=True)
    v4, v6, sync_token = parse_uptime_robot_ips(meta)
    LOG.info(
        "uptime robot: syncToken=%s ipv4=%d ipv6=%d",
        sync_token,
        len(v4),
        len(v6),
    )

    is_unifi_os = detect_unifi_os(session, base_url, verify_ssl)
    LOG.info("logging in to UniFi at %s (unifi_os=%s)", base_url, is_unifi_os)
    if not unifi_login(session, base_url, user, password, verify_ssl, is_unifi_os):
        return 1

    groups: list[tuple[str, str, list[str]]] = [
        (gid_v4, "address-group", v4),
        (gid_v6, "ipv6-address-group", v6),
    ]

    changed = False
    for gid, expected_type, new_members in groups:
        current = get_firewall_group(session, base_url, is_unifi_os, site, gid, verify_ssl)
        if not current:
            return 1
        gtype = current.get("group_type")
        if gtype != expected_type:
            LOG.error(
                "group %s has group_type %s, expected %s — refusing to update",
                gid,
                gtype,
                expected_type,
            )
            return 1
        old_members = current.get("group_members")
        if not isinstance(old_members, list):
            old_members = []
        old_str = [str(x) for x in old_members]
        if members_equal(old_str, new_members):
            LOG.info("group %s unchanged (%d members)", gid, len(new_members))
            continue

        LOG.info(
            "group %s: updating members (%d -> %d)",
            gid,
            len(old_str),
            len(new_members),
        )
        changed = True
        payload = {
            "_id": current.get("_id", gid),
            "name": current.get("name", ""),
            "group_type": gtype,
            "group_members": new_members,
            "site_id": current.get("site_id", ""),
        }
        if "external_id" in current:
            payload["external_id"] = current["external_id"]

        if dry_run:
            LOG.info("DRY_RUN: would PUT group %s", gid)
            continue

        if not put_firewall_group(session, base_url, is_unifi_os, site, gid, payload, verify_ssl):
            return 1

    if dry_run and changed:
        LOG.info("DRY_RUN: no PUT performed")
    elif not changed:
        LOG.info("no firewall group updates required")

    return 0


if __name__ == "__main__":
    raise SystemExit(run())
