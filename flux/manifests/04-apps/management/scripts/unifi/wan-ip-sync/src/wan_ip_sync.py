#!/usr/bin/env python3
"""
Keep the DNSEndpoint CR's WAN A records in sync with the UniFi gateway's WAN IPs.

Reads the wan1/wan2 addresses from the site's gateway device (UXG-PRO) via the
UniFi Network API, then creates or patches the DNSEndpoint CR that the
external-dns-wan instance turns into Cloudflare A records. See README.md for
required environment variables.
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

# Gateway device types accepted as "the" gateway (this site: a UXG-PRO, "uxg").
GATEWAY_TYPES = {"uxg", "ugw", "udm", "udm-pro"}
WAN_RECORD_TTL = 300

K8S_API = "https://kubernetes.default.svc"
DNSENDPOINT_API = "/apis/externaldns.k8s.io/v1alpha1"
SA_DIR = Path("/var/run/secrets/kubernetes.io/serviceaccount")

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


def get_gateway(
    session: requests.Session,
    base_url: str,
    is_unifi_os: bool,
    site: str,
    verify: bool,
) -> dict[str, Any] | None:
    """Return the site's single gateway device, or None on error/ambiguity."""
    url = rest_url(base_url, is_unifi_os, site, "/device")
    r = session.get(url, timeout=60, verify=verify)
    if r.status_code != 200:
        LOG.error("GET device list failed: HTTP %s %s", r.status_code, r.text[:500])
        return None
    data = r.json().get("data")
    if not isinstance(data, list):
        LOG.error("unexpected device list response shape: %s", type(data).__name__)
        return None
    gateways = [d for d in data if isinstance(d, dict) and str(d.get("type", "")).lower() in GATEWAY_TYPES]
    if not gateways:
        LOG.error("no gateway device (types %s) found in site %s", sorted(GATEWAY_TYPES), site)
        return None
    if len(gateways) > 1:
        LOG.error("multiple gateway devices found (%d); refusing to pick one", len(gateways))
        return None
    return gateways[0]


def load_k8s_creds() -> tuple[str, str, str]:
    """Return (bearer token, namespace, ca-cert path) from the mounted ServiceAccount."""
    try:
        token = (SA_DIR / "token").read_text().strip()
        namespace = (SA_DIR / "namespace").read_text().strip()
    except OSError as e:
        LOG.error("cannot read service account credentials at %s: %s", SA_DIR, e)
        sys.exit(1)
    return token, namespace, str(SA_DIR / "ca.crt")


def k8s_headers(token: str, content_type: str | None = None) -> dict[str, str]:
    h = {"Authorization": f"Bearer {token}"}
    if content_type:
        h["Content-Type"] = content_type
    return h


def desired_endpoints(wan1_hostname: str, wan2_hostname: str, wan1_ip: str, wan2_ip: str) -> list[dict[str, Any]]:
    return [
        {"dnsName": wan1_hostname, "recordType": "A", "recordTTL": WAN_RECORD_TTL, "targets": [wan1_ip]},
        {"dnsName": wan2_hostname, "recordType": "A", "recordTTL": WAN_RECORD_TTL, "targets": [wan2_ip]},
    ]


def ensure_dnsendpoint(
    session: requests.Session,
    name: str,
    endpoints: list[dict[str, Any]],
    token: str,
    namespace: str,
    verify_ca: str,
) -> bool:
    """Create the DNSEndpoint if missing, else merge-patch spec.endpoints (full array)."""
    collection = f"{K8S_API}{DNSENDPOINT_API}/namespaces/{namespace}/dnsendpoints"
    resource = f"{collection}/{name}"

    r = session.get(resource, headers=k8s_headers(token), verify=verify_ca, timeout=30)
    if r.status_code == 404:
        LOG.info("DNSEndpoint %s/%s not found, creating", namespace, name)
        body = {
            "apiVersion": "externaldns.k8s.io/v1alpha1",
            "kind": "DNSEndpoint",
            "metadata": {"name": name, "namespace": namespace},
            "spec": {"endpoints": endpoints},
        }
        r = session.post(collection, headers=k8s_headers(token), json=body, verify=verify_ca, timeout=30)
        if not 200 <= r.status_code < 300:
            LOG.error("create DNSEndpoint %s failed: HTTP %s %s", name, r.status_code, r.text[:800])
            return False
        LOG.info("DNSEndpoint %s/%s created", namespace, name)
        return True

    if r.status_code != 200:
        LOG.error("GET DNSEndpoint %s failed: HTTP %s %s", name, r.status_code, r.text[:800])
        return False

    current = (r.json().get("spec") or {}).get("endpoints")
    if current == endpoints:
        LOG.info("DNSEndpoint %s/%s endpoints unchanged", namespace, name)
        return True

    LOG.info("DNSEndpoint %s/%s endpoints differ, patching", namespace, name)
    r = session.patch(
        resource,
        headers=k8s_headers(token, "application/merge-patch+json"),
        json={"spec": {"endpoints": endpoints}},
        verify=verify_ca,
        timeout=30,
    )
    if not 200 <= r.status_code < 300:
        LOG.error("patch DNSEndpoint %s failed: HTTP %s %s", name, r.status_code, r.text[:800])
        return False
    LOG.info("DNSEndpoint %s/%s patched", namespace, name)
    return True


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
    wan1_hostname = _env_required("WAN1_HOSTNAME")
    wan2_hostname = _env_required("WAN2_HOSTNAME")
    cr_name = _env_required("DNSENDPOINT_NAME")
    verify_ssl = _env_bool("UNIFI_VERIFY_SSL", True)
    dry_run = _env_bool("DRY_RUN", False)

    if not verify_ssl:
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    session = requests.Session()
    session.headers.update({"User-Agent": "homelab-unifi-wan-ip-sync/1.0"})

    is_unifi_os = detect_unifi_os(session, base_url, verify_ssl)
    LOG.info("logging in to UniFi at %s (unifi_os=%s)", base_url, is_unifi_os)
    if not unifi_login(session, base_url, user, password, verify_ssl, is_unifi_os):
        return 1

    gateway = get_gateway(session, base_url, is_unifi_os, site, verify_ssl)
    if gateway is None:
        return 1
    LOG.info(
        "found gateway %s (type=%s, mac=%s)",
        gateway.get("name", "unnamed"),
        gateway.get("type"),
        gateway.get("mac"),
    )

    wan1_ip = (gateway.get("wan1") or {}).get("ip")
    wan2_ip = (gateway.get("wan2") or {}).get("ip")
    if not wan1_ip or not wan2_ip:
        LOG.error(
            "gateway WAN IPs missing (wan1=%r wan2=%r); refusing to patch empty or partial state",
            wan1_ip,
            wan2_ip,
        )
        return 1
    LOG.info("wan1 %s -> %s, wan2 %s -> %s", wan1_hostname, wan1_ip, wan2_hostname, wan2_ip)

    endpoints = desired_endpoints(wan1_hostname, wan2_hostname, wan1_ip, wan2_ip)

    if dry_run:
        LOG.info("DRY_RUN: would ensure DNSEndpoint with spec.endpoints: %s", json.dumps(endpoints))
        return 0

    token, namespace, ca_path = load_k8s_creds()
    ok = ensure_dnsendpoint(session, cr_name, endpoints, token, namespace, ca_path)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(run())
