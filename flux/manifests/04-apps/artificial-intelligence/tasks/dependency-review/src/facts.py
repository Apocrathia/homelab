#!/usr/bin/env python3
"""Deterministic upstream fact collection for the dependency-review sweep.

Every lookup here is a plain HTTP call with a fallback chain — no LLM in the
collection path. Judgment on top of these facts happens in the A2A agent turn.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

import httpx

# --- Renovate MR description parsing -----------------------------------------


@dataclass
class Dep:
    """One dependency update extracted from a Renovate MR."""

    iid: int
    title: str
    branch: str
    updated_at: str
    labels: list[str] = field(default_factory=list)
    pkg: str | None = None
    update_type: str | None = None  # patch | minor | major | digest
    old: str | None = None
    new: str | None = None
    declared_source: str | None = None  # [source](...) link from the MR table


_ROW_LINKED = re.compile(
    r"\|\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*\(\[[^\]]*\]\([^)]+\)\))*"
    r"\s*\|\s*(image|version-field|helm|image-name)\s*\|\s*([\w-]+)\s*\|([^|]+)\|"
)
_ROW_BARE = re.compile(r"\|\s*([^\s|]+)\s*\|\s*(image|version-field|helm|image-name)\s*\|\s*([\w-]+)\s*\|([^|]+)\|")
_CHUNK = re.compile(r"`([^`]+)`")


def _change_cell_versions(cell: str) -> tuple[str | None, str | None]:
    """Old/new versions from a change cell like `` `a` → `b` `` (link-wrapped ok)."""
    chunks = _CHUNK.findall(cell)
    if len(chunks) >= 2:
        return chunks[0].strip(), chunks[1].strip()
    return None, None


_SOURCE = re.compile(r"\[source\]\((https://github\.com/[^/]+/[^/)]+)\)")


def parse_dep(mr: dict) -> Dep:
    """Extract the dependency update row from a Renovate MR description."""
    d = mr.get("description") or ""
    dep = Dep(
        iid=mr["iid"],
        title=mr.get("title", ""),
        branch=mr.get("source_branch", ""),
        updated_at=mr.get("updated_at", ""),
        labels=list(mr.get("labels") or []),
    )
    src = _SOURCE.search(d)
    if src:
        dep.declared_source = src.group(1).replace("https://github.com/", "")

    row = _ROW_LINKED.search(d)
    if row:
        dep.pkg = row.group(1)
        dep.update_type = row.group(4)
        dep.old, dep.new = _change_cell_versions(row.group(5))
        # package link itself may be the repo when no [source] is given
        link = row.group(2)
        if not dep.declared_source and "github.com/" in link:
            dep.declared_source = link.rstrip("/").replace("https://github.com/", "")
        return dep

    row = _ROW_BARE.search(d)
    if row:
        dep.pkg, dep.update_type = row.group(1), row.group(3)
        dep.old, dep.new = _change_cell_versions(row.group(4))
        return dep
    return dep


# --- Small shared HTTP helpers -----------------------------------------------

_GH_ACCEPT = "application/vnd.github+json"
_MANIFEST_ACCEPT = (
    "application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json,"
    " application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json"
)


def _bearer(token: str) -> str:
    """Normalize a token that may or may not already carry a Bearer prefix."""
    t = token.strip()
    if t.lower().startswith("bearer "):
        t = t[7:]
    return t


async def gh_json(http: httpx.AsyncClient, path: str, token: str, **params) -> object | None:
    headers = {"Accept": _GH_ACCEPT, "X-GitHub-Api-Version": "2022-11-28"}
    if token:
        headers["Authorization"] = f"Bearer {_bearer(token)}"
    try:
        r = await http.get(f"https://api.github.com{path}", headers=headers, params=params)
        if r.status_code != 200:
            return None
        return r.json()
    except httpx.HTTPError:
        return None


# --- Upstream lookups --------------------------------------------------------


def _norm_ver(s: str) -> str:
    return s.lower().lstrip("v")


def _ver_tuple(s: str) -> tuple[int, ...] | None:
    m = re.match(r"^(\d+(?:\.\d+)*)", _norm_ver(s))
    if not m:
        return None
    try:
        return tuple(int(p) for p in m.group(1).split("."))
    except ValueError:
        return None


def _matches_release(tag: str, version: str) -> bool:
    ntag, nver = _norm_ver(tag), _norm_ver(version)
    base = ntag.split("/")[-1].split("@")[-1]
    if base == nver or base.startswith(nver + "."):
        return True
    # whisparr-style: image tag 3.1.0 vs git tag v3.1.0.2116
    return base.startswith(nver) and (len(base) == len(nver) or base[len(nver)] == ".")


async def github_releases(http: httpx.AsyncClient, repo: str, token: str) -> list[dict]:
    rels = await gh_json(http, f"/repos/{repo}/releases", token, per_page=20)
    if not isinstance(rels, list):
        return []
    out = []
    for r in rels:
        if r.get("draft"):
            continue
        out.append(
            {
                "tag": r["tag_name"],
                "published": r["published_at"],
                "prerelease": bool(r.get("prerelease")),
            }
        )
    return out


async def github_tag_date(http: httpx.AsyncClient, repo: str, token: str) -> str | None:
    """Commit date of the newest tag, for repos without releases."""
    tags = await gh_json(http, f"/repos/{repo}/tags", token, per_page=5)
    if not isinstance(tags, list) or not tags:
        return None
    sha = tags[0]["commit"]["sha"]
    commit = await gh_json(http, f"/repos/{repo}/commits/{sha}", token)
    if not isinstance(commit, dict):
        return None
    return commit.get("commit", {}).get("committer", {}).get("date")


async def pypi_date(http: httpx.AsyncClient, pkg: str, ver: str) -> str | None:
    try:
        r = await http.get(f"https://pypi.org/pypi/{pkg}/{ver}/json")
        if r.status_code != 200:
            return None
        urls = r.json().get("urls") or []
        return urls[0].get("upload_time_iso_8601") if urls else None
    except httpx.HTTPError:
        return None


async def osv_query(http: httpx.AsyncClient, pkg: str, ver: str, ecosystem: str = "PyPI") -> dict:
    try:
        r = await http.post(
            "https://api.osv.dev/v1/query",
            json={"package": {"name": pkg, "ecosystem": ecosystem}, "version": ver},
        )
        if r.status_code != 200:
            return {"error": f"status {r.status_code}"}
        vulns = r.json().get("vulns", [])
        return {
            "count": len(vulns),
            "ids": [v.get("id") for v in vulns][:5],
        }
    except httpx.HTTPError as e:
        return {"error": repr(e)[:120]}


async def dockerhub_date(http: httpx.AsyncClient, image: str, tag: str) -> str | None:
    try:
        r = await http.get(f"https://hub.docker.com/v2/repositories/library/{image}/tags/{tag}")
        if r.status_code != 200:
            return None
        return r.json().get("tag_last_push") or r.json().get("last_updated")
    except httpx.HTTPError:
        return None


async def _registry_token(http: httpx.AsyncClient, registry: str, repo: str) -> str | None:
    """Anonymous pull token for ghcr.io."""
    try:
        r = await http.get(f"https://{registry}/token", params={"scope": f"repository:{repo}:pull"})
        return r.json().get("token") if r.status_code == 200 else None
    except httpx.HTTPError:
        return None


async def ghcr_config(http: httpx.AsyncClient, repo: str, tag_or_digest: str) -> dict:
    """Image config (created date + labels) for a ghcr.io ref (anonymous pull)."""
    out: dict = {}
    try:
        tok = await _registry_token(http, "ghcr.io", repo)
        if not tok:
            return {"error": "no anon token"}
        h = {"Authorization": f"Bearer {tok}", "Accept": _MANIFEST_ACCEPT}
        man = await http.get(f"https://ghcr.io/v2/{repo}/manifests/{tag_or_digest}", headers=h)
        if man.status_code != 200:
            return {"error": f"manifest {man.status_code}"}
        m = man.json()
        if "manifests" in m:
            for e in m["manifests"]:
                if e.get("platform", {}).get("architecture") == "amd64":
                    h["Accept"] = e["mediaType"]
                    man = await http.get(f"https://ghcr.io/v2/{repo}/manifests/{e['digest']}", headers=h)
                    m = man.json()
                    break
        cfg = await http.get(f"https://ghcr.io/v2/{repo}/blobs/{m['config']['digest']}", headers=h)
        if cfg.status_code != 200:
            return {"error": f"config {cfg.status_code}"}
        j = cfg.json()
        labels = j.get("config", {}).get("Labels") or {}
        out["created"] = j.get("created")
        out["label_source"] = labels.get("org.opencontainers.image.source")
        return out
    except httpx.HTTPError as e:
        return {"error": repr(e)[:120]}


async def github_issue_scan(http: httpx.AsyncClient, repo: str, since: str, token: str, mention: str = "") -> dict:
    """Top issues created since `since` (ISO date), sorted by 👍 reactions."""
    q = f"repo:{repo} is:issue created:>={since[:10]}"
    if mention:
        q += f" {mention}"
    params = {"q": q, "sort": "reactions-+1", "order": "desc", "per_page": 10}
    headers = {"Accept": _GH_ACCEPT}
    if token:
        headers["Authorization"] = f"Bearer {_bearer(token)}"
    try:
        r = await http.get("https://api.github.com/search/issues", headers=headers, params=params)
        if r.status_code != 200:
            return {"error": f"status {r.status_code}"}
        j = r.json()
        top = []
        for it in j.get("items", [])[:10]:
            top.append(
                {
                    "n": it["number"],
                    "title": it["title"][:90],
                    "state": it["state"],
                    "created": it["created_at"][:10],
                    "p1": (it.get("reactions") or {}).get("+1", 0),
                    "comments": it.get("comments", 0),
                }
            )
        return {"total": j.get("total_count", 0), "top": top}
    except httpx.HTTPError as e:
        return {"error": repr(e)[:120]}
