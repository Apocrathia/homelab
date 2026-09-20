#!/usr/bin/env python3
"""Hourly dependency-review sweep for Renovate MRs.

Pipeline: list renovate MRs -> collect upstream facts (facts.py) -> hard gates
(cooldown / superseded / OSV / major) -> A2A judgment turn (git-agent) ->
post MR note + labels + approval on pass. Merge stays with the operator.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

import httpx
from a2a.client import ClientConfig, ClientFactory
from a2a.client.card_resolver import A2ACardResolver
from a2a.helpers.proto_helpers import get_artifact_text, get_message_text
from a2a.types import Message, Part, Role, SendMessageRequest, TaskState

import facts
from facts import Dep, parse_dep

LOG = logging.getLogger("dependency-review")

DEFAULT_COOLDOWN_H = 24.0
DEFAULT_INFRA_COOLDOWN_H = 72.0
# MRs untouched for this long with a verdict label already set are skipped.
FRESHNESS_WINDOW_MIN = 90
# Packages where even patch bumps get a second operator glance (or 72h on majors).
# Infra bumps are operator-only: never auto-merged, always in the triage digest.
# siderolabs covers the installer/kubelet images that reimage nodes (a merged
# Talos-class bump reboots the cluster the agents themselves run on).
INFRA_PACKAGES = (
    "talos",
    "siderolabs",
    "kubelet",
    "authentik",
    "tailscale",
    "litellm",
    "cnpg",
    "cloudnative-pg",
    "longhorn",
    "rabbitmq",
    "redis",
    "kube-prometheus",
)
VERDICT_LABELS = ("agent-review:pass", "agent-review:hold", "agent-review:block")
# The sweep fully owns the agent-review:* namespace: every sweep recomputes the
# whole label set so stale flags (infra, major, phase2-trivy, agent-held) come
# off the moment they stop applying. No persistent "done" marker — the verdict
# label IS the state.
ALL_AGENT_LABELS = VERDICT_LABELS + (
    "agent-review:infra",
    "agent-review:major",
    "agent-review:phase2-trivy",
    "agent-review:agent-held",
)


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name, "").strip()
    return float(raw) if raw else default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


def _dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _is_infra(*fields: str) -> bool:
    p = " ".join(f.lower() for f in fields if f)
    return any(k in p for k in INFRA_PACKAGES)


# --- GitLab API --------------------------------------------------------------


class GitLab:
    def __init__(self, base: str, token: str, project: str) -> None:
        self.base = base.rstrip("/")
        self.project = quote(project, safe="")
        self.http = httpx.AsyncClient(
            base_url=self.base,
            headers={"PRIVATE-TOKEN": token},
            timeout=30.0,
        )

    async def open_renovate_mrs(self) -> list[dict]:
        r = await self.http.get(
            f"/projects/{self.project}/merge_requests",
            params={"state": "opened", "per_page": 100, "order_by": "updated_at"},
        )
        r.raise_for_status()
        return [m for m in r.json() if m["source_branch"].startswith("renovate/")]

    async def add_note(self, iid: int, body: str) -> None:
        r = await self.http.post(f"/projects/{self.project}/merge_requests/{iid}/notes", json={"body": body})
        if r.status_code >= 300:
            LOG.warning("note on !%s failed: %s %s", iid, r.status_code, r.text[:120])

    async def set_labels(self, m: dict, new_labels: list[str]) -> None:
        current = set(m.get("labels") or [])
        new = sorted((current - set(ALL_AGENT_LABELS)) | set(new_labels))
        r = await self.http.put(f"/projects/{self.project}/merge_requests/{m['iid']}", json={"labels": ",".join(new)})
        if r.status_code >= 300:
            LOG.warning("labels on !%s failed: %s %s", m["iid"], r.status_code, r.text[:120])

    async def approve(self, iid: int) -> None:
        r = await self.http.post(f"/projects/{self.project}/merge_requests/{iid}/approve")
        # 201 = approval created; 405/409 = approvals disabled or already approved
        if r.status_code >= 300:
            LOG.warning("approve on !%s failed: %s %s", iid, r.status_code, r.text[:120])
        else:
            LOG.info("approved !%s (%s)", iid, r.status_code)


# --- Deterministic gates ------------------------------------------------------


AGENT_HELD_LABEL = "agent-review:agent-held"


def protect_prior_agent_hold(v: dict, prior_labels: list[str]) -> dict:
    """A judgment-unavailable pass must not overwrite a prior agent hold.

    Live finding (2026-09-19): the review sweep held tracearr v2.4.0 on
    regression report #1193; a later sweep whose A2A turn timed out fell back
    to deterministic verdicts and re-passed it. The merge-stage agent caught
    the flip-flop — this keeps the review record from lying in the first
    place. A successful agent turn clears the marker on its next pass.
    """
    if v["verdict"] == "pass" and AGENT_HELD_LABEL in (prior_labels or []):
        v = dict(v)
        v["verdict"] = "hold"
        v["reason"] = (
            "Prior agent hold stands — this sweep's judgment turn was unavailable "
            "(A2A failure); next successful sweep re-judges it."
        )
    return v


def hard_verdict(f: dict, dep: Dep, cooldown_h: float, infra_cooldown_h: float) -> dict:
    """Gates the agent may not upgrade past. Returns verdict dict."""
    verdict, reason, flags = "pass", "", []
    is_infra = _is_infra(dep.pkg or "", dep.title, dep.branch)
    if dep.update_type == "digest":
        reason = "Digest refresh (same tag, rebuilt image) - CVE-rebuild class, no cooldown."
        flags.append("agent-review:phase2-trivy")
    elif f.get("superseded"):
        verdict, reason = (
            "hold",
            f"Superseded: newer {f.get('latest_version', 'version')} is out; Renovate will retarget.",
        )
    elif f.get("osv_new", {}).get("count"):
        verdict = "block"
        reason = f"OSV lists {f['osv_new']['count']} vuln(s) for the new version: {f['osv_new'].get('ids')}"
    elif f.get("release_at") is None:
        verdict, reason = "hold", "Could not determine upstream release age - human look needed."
    else:
        age_h = f["age_h"]
        gate_h = infra_cooldown_h if (is_infra and dep.update_type == "major") else cooldown_h
        if age_h < gate_h:
            verdict = "hold"
            ready = _dt(f["release_at"]) + timedelta(hours=gate_h)
            reason = f"Cooldown: {age_h:.1f}h old, gate is {gate_h:g}h (eligible ~{ready:%Y-%m-%d %H:%M}Z)."
        elif dep.update_type == "major":
            verdict = "hold"
            reason = "Major bump - breaking-change/DB-migration risk, human review required."
            flags.append("agent-review:major")
        else:
            reason = (
                f"release age {age_h:.1f}h cleared the {gate_h:g}h gate; no superseder; "
                f"OSV {f.get('osv_new', {}).get('count', 'n/a')} hits."
            )
    if is_infra:
        flags.append("agent-review:infra")
    return {"iid": dep.iid, "verdict": verdict, "reason": reason, "flags": flags}


# --- A2A judgment turn --------------------------------------------------------


def looks_like_tool_stub_text(text: str) -> bool:
    t = text.strip()
    return bool(t) and t.startswith("{") and '"name"' in t and '"arguments"' in t


async def agent_judgment(a2a_url: str, prompt: str, continuation: str, max_turns: int, timeout_s: float) -> str:
    """Send the fact sheet to the agent, return its final text (may be empty)."""
    timeout = httpx.Timeout(timeout_s, connect=15.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as httpx_client:
        resolver = A2ACardResolver(httpx_client=httpx_client, base_url=a2a_url)
        card = await resolver.get_agent_card()
        client = ClientFactory(config=ClientConfig(httpx_client=httpx_client)).create(card=card)
        context_id = None
        collected: list[str] = []
        for turn in range(max_turns):
            text = prompt if turn == 0 else continuation
            msg = Message(
                message_id=str(uuid4()),
                role=Role.ROLE_USER,
                parts=[Part(text=text)],
                context_id=context_id,
            )
            last_state, saw_text, next_context = None, False, None
            try:
                async for event in client.send_message(SendMessageRequest(message=msg)):
                    if event.HasField("message"):
                        t = (get_message_text(event.message) or "").strip()
                        if t and not looks_like_tool_stub_text(t):
                            collected.append(t)
                            saw_text = True
                    elif event.HasField("artifact_update"):
                        t = (get_artifact_text(event.artifact_update.artifact) or "").strip()
                        if t:
                            collected.append(t)
                            saw_text = True
                    elif event.HasField("task"):
                        c = getattr(event.task, "context_id", None)
                        if c:
                            next_context = c
                    elif event.HasField("status_update"):
                        last_state = TaskState.Name(event.status_update.status.state).removeprefix("TASK_STATE_")
            except Exception as e:  # noqa: BLE001
                LOG.warning("A2A turn %s transport error: %s", turn + 1, e)
                return ""
            if next_context:
                context_id = next_context
            state = (last_state or "").lower()
            if state in ("failed", "canceled", "cancelled"):
                LOG.warning("A2A task state %s", state)
                return ""
            if state == "completed" and saw_text:
                break
        return "\n".join(collected)


_JSON_BLOCK = re.compile(r"```(?:json)?\s*(\[.*?\])\s*```", re.DOTALL)


def parse_agent_verdicts(text: str) -> list[dict]:
    if not text:
        return []
    m = _JSON_BLOCK.search(text) or (
        re.search(r"(\[\s*\{.*\}\s*\])", text, re.DOTALL) if text.lstrip().startswith("[") else None
    )
    if not m:
        return []
    try:
        out = json.loads(m.group(1))
        return out if isinstance(out, list) else []
    except json.JSONDecodeError:
        return []


# --- Fact collection orchestration --------------------------------------------


async def collect_fact(http: httpx.AsyncClient, dep: Dep, gh_token: str) -> dict:
    """All deterministic facts for one dependency update."""
    f: dict = {"iid": dep.iid}
    update = dep.update_type or ""
    pkg = dep.pkg or ""
    src = dep.declared_source

    # image label check (also validates the declared source, Jackett-style traps)
    image_match = re.match(r"^(?:ghcr\.io/|docker\.io/library/|library/)?([\w.-]+(?:/[\w.-]+)+)", pkg)
    if image_match and "ghcr.io/" in pkg and dep.old and dep.new:
        try:
            ref = pkg.split("@")[0]
            tag = ref.split(":")[1] if ":" in ref else dep.new
            cfg = await facts.ghcr_config(http, ref.split(":")[0], tag)
            if cfg.get("label_source"):
                f["image_label_source"] = cfg["label_source"].replace("https://github.com/", "")
                f["source_mismatch"] = bool(src and src.lower() not in (f["image_label_source"] or "").lower())
        except Exception as e:  # noqa: BLE001
            LOG.warning("image label check for !%s failed: %s", dep.iid, e)

    if update == "digest":
        return f

    new_ver = (dep.new or "").lstrip("v")
    repo = src

    # GitHub-hosted: release list for age + superseded
    if repo and "/" in repo:
        rels = await facts.github_releases(http, repo, gh_token)
        mine = next((r for r in rels if facts._matches_release(r["tag"], new_ver)), None) if rels else None
        if mine is None:
            # no matching release: rolling-tag repos keep versions in tags (whisparr);
            # helm sources point at chart repos (agent resolves the app repo instead)
            tag_date = await facts.github_tag_date(http, repo, gh_token)
            if tag_date:
                f["release_at"] = tag_date
                f["release_tag"] = "newest tag"
        else:
            f["release_at"] = mine["published"]
            f["release_tag"] = mine["tag"]
            latest_stable = next((r for r in rels if not r["prerelease"]), None)
            if latest_stable and latest_stable["tag"] != mine["tag"]:
                tgt, lat = facts._ver_tuple(mine["tag"]), facts._ver_tuple(latest_stable["tag"])
                if tgt is not None and lat is not None and lat > tgt:
                    f["superseded"] = True
                    f["latest_version"] = latest_stable["tag"]

    # PyPI fallback for pypi-datasource deps (uv/promptfoo/a2a-sdk style)
    if f.get("release_at") is None and pkg and "/" not in pkg and "." in pkg:
        pd = await facts.pypi_date(http, pkg, dep.new or "")
        if pd:
            f["release_at"] = pd
            f["release_tag"] = dep.new

    # OSV for version-field (pypi-ecosystem) deps
    if pkg and "/" not in pkg and "." in pkg:
        f["osv_new"] = await facts.osv_query(http, pkg, dep.new or "")
        f["osv_old"] = await facts.osv_query(http, pkg, dep.old or "")

    # Docker Hub tag date for library images (alpine/nginx/redis/python/...)
    if not f.get("release_at") and "/" not in pkg and ":" not in pkg:
        dh = await facts.dockerhub_date(http, pkg, new_ver)
        if dh:
            f["release_at"] = dh
            f["release_tag"] = new_ver

    if f.get("release_at"):
        f["age_h"] = round((datetime.now(UTC) - _dt(f["release_at"])).total_seconds() / 3600, 1)

    # Issue scan anchored on the release (14d window for majors — rolling tags)
    if repo and "/" in repo:
        since = f.get("release_at") or ""
        if dep.update_type == "major":
            since = (datetime.now(UTC) - timedelta(days=14)).isoformat()
        if since:
            f["issue_scan"] = await facts.github_issue_scan(http, repo, since, gh_token)
    return f


# --- MR note -------------------------------------------------------------------


def build_note(dep: Dep, f: dict, verdict: dict, agent_note: str | None, dep_sha: str = "") -> str:
    v = verdict["verdict"].upper()
    lines = [
        "## 🤖 Agent dependency review",
        f"**Verdict: {v}** — {verdict.get('reason') or ''}",
        "",
        "| signal | result |",
        "|---|---|",
        f"| package | `{dep.pkg}` {dep.old} → **{dep.new}** ({dep.update_type}) |",
    ]
    if f.get("release_at"):
        lines.append(f"| upstream release | {f.get('release_tag')} @ {f['release_at'][:16]}Z ({f['age_h']}h old) |")
    else:
        lines.append("| upstream release | unknown |")
    if f.get("superseded"):
        lines.append(f"| still latest | **no** — {f.get('latest_version')} is out |")
    else:
        lines.append("| still latest | yes |")
    if f.get("osv_new") is not None:
        c = f["osv_new"].get("count", "?")
        osv_cell = "clean" if not c else f"⚠ {c} vuln(s): {f['osv_new'].get('ids')}"
        lines.append(f"| OSV (new version) | {osv_cell} |")
    scan = f.get("issue_scan")
    if scan and not scan.get("error"):
        lines.append(f"| upstream issues since release | {scan.get('total', '?')} new (top by 👍) |")
        for it in (scan.get("top") or [])[:3]:
            lines.append(f"|   #{it['n']} ({it['state']}, +{it['p1']}) | {it['title'][:72]} |")
    if f.get("image_label_source"):
        flag = " ⚠ **mismatch — declared source looks wrong**" if f.get("source_mismatch") else ""
        lines.append(f"| source | declared `{dep.declared_source}`, image label `{f['image_label_source']}`{flag} |")
    if agent_note:
        lines += ["", f"**Agent judgment:** {agent_note}"]
    lines += [
        "",
        f"reviewed-sha: {dep_sha}",
        "",
        "_Automated dependency-review sweep. Merge decisions stay with the operator._",
    ]
    return "\n".join(lines)


# --- Main ------------------------------------------------------------------------


async def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout)
    gl = GitLab(
        os.environ.get("GITLAB_API", "https://gitlab.com/api/v4"),
        os.environ["GITLAB_TOKEN"],
        os.environ.get("GITLAB_PROJECT", "Apocrathia/homelab"),
    )
    gh_token = os.environ.get("GITHUB_TOKEN", "")
    cooldown_h = _env_float("COOLDOWN_HOURS", DEFAULT_COOLDOWN_H)
    infra_cooldown_h = _env_float("INFRA_COOLDOWN_HOURS", DEFAULT_INFRA_COOLDOWN_H)
    approve_on_pass = _env_bool("APPROVE_ON_PASS", True)
    dry_run = _env_bool("DRY_RUN", False)
    sweep_cutoff = datetime.now(UTC) - timedelta(minutes=FRESHNESS_WINDOW_MIN)

    mrs = await gl.open_renovate_mrs()
    LOG.info("open renovate MRs: %s", len(mrs))

    fresh = []
    for m in mrs:
        labels = set(m.get("labels") or [])
        if labels & set(VERDICT_LABELS) and _dt(m["updated_at"]) < sweep_cutoff:
            continue  # already reviewed this cycle, no activity since
        fresh.append(m)
    LOG.info("MRs needing review: %s (rest already labeled + quiet)", len(fresh))
    if not fresh:
        return 0

    deps = [parse_dep(m) for m in fresh]
    async with httpx.AsyncClient(timeout=30.0) as http:
        sem = asyncio.Semaphore(4)

        async def one(dep: Dep) -> dict:
            async with sem:
                try:
                    return await collect_fact(http, dep, gh_token)
                except Exception as e:  # noqa: BLE001
                    LOG.warning("fact collection for !%s failed: %s", dep.iid, e)
                    return {"iid": dep.iid}

        results = await asyncio.gather(*[one(d) for d in deps])
    fs = {r["iid"]: r for r in results}

    verdicts = {d.iid: hard_verdict(fs.get(d.iid, {}), d, cooldown_h, infra_cooldown_h) for d in deps}

    # agent judgment pass
    agent_verdicts: dict[int, dict] = {}
    agent_notes: dict[int, str] = {}
    a2a_url = os.environ.get("A2A_URL", "").strip()
    if a2a_url:
        prompt_tmpl = Path(os.environ.get("PROMPT_PATH", "/scripts/task.md")).read_text(encoding="utf-8")
        continuation = Path(os.environ.get("CONTINUATION_PATH", "/scripts/continuation.md")).read_text(encoding="utf-8")
        sheet = [
            {
                **{
                    "pkg": d.pkg,
                    "old": d.old,
                    "new": d.new,
                    "update_type": d.update_type,
                    "declared_source": d.declared_source,
                },
                **fs.get(d.iid, {}),
                "deterministic": verdicts[d.iid],
            }
            for d in deps
        ]
        prompt = prompt_tmpl + "\n\n## MR fact sheet\n\n```json\n" + json.dumps(sheet, indent=1) + "\n```\n"
        text = await agent_judgment(
            a2a_url,
            prompt,
            continuation,
            int(_env_float("MAX_TURNS", 6)),
            _env_float("HTTP_TIMEOUT_S", 300.0),
        )
        for av in parse_agent_verdicts(text):
            try:
                agent_verdicts[int(av["iid"])] = av
            except (KeyError, TypeError, ValueError):
                continue
        LOG.info("agent verdicts parsed: %s", len(agent_verdicts))

    for dep in deps:
        v = verdicts[dep.iid]
        av = agent_verdicts.get(dep.iid)
        if not av:
            # judgment unavailable: keep prior agent holds (see protect_prior_agent_hold)
            verdicts[dep.iid] = v = protect_prior_agent_hold(v, dep.labels)
        if av:
            # agent may only downgrade a pass; hard gates always win
            if v["verdict"] == "pass" and av.get("verdict") in ("hold", "block"):
                v["verdict"] = av["verdict"]
                v["flags"].append(AGENT_HELD_LABEL)
            # agent may resolve unknown release dates (helm chart sources, dead repos);
            # cooldown is then re-checked deterministically against that date
            if v["verdict"] == "hold" and av.get("release_at_corrected") and dep.update_type != "major":
                try:
                    age_h = round((datetime.now(UTC) - _dt(str(av["release_at_corrected"]))).total_seconds() / 3600, 1)
                    if age_h >= cooldown_h and not fs.get(dep.iid, {}).get("superseded"):
                        fs[dep.iid]["release_at"] = str(av["release_at_corrected"])
                        fs[dep.iid]["age_h"] = age_h
                        v = verdicts[dep.iid] = hard_verdict(fs[dep.iid], dep, cooldown_h, infra_cooldown_h)
                except (ValueError, TypeError):
                    LOG.warning("bad release_at_corrected for !%s", dep.iid)
            if av.get("reason"):
                agent_notes[dep.iid] = str(av["reason"])[:400]
            for fl in av.get("flags") or []:
                if isinstance(fl, str):
                    v["flags"].append(fl)

    for m in fresh:
        dep = next(d for d in deps if d.iid == m["iid"])
        f = fs.get(dep.iid, {})
        v = verdicts[dep.iid]
        note = build_note(dep, f, v, agent_notes.get(dep.iid), m.get("sha") or "")
        if v["verdict"] == "pass":
            v["flags"] = [fl for fl in v["flags"] if fl != AGENT_HELD_LABEL]
        labels = [f"agent-review:{v['verdict']}"] + v["flags"]
        if dry_run:
            LOG.info("DRY RUN !%s -> %s (%s)\n%s\n---", dep.iid, v["verdict"].upper(), dep.pkg, note)
            continue
        await gl.add_note(dep.iid, note)
        await gl.set_labels(m, labels)
        if approve_on_pass and v["verdict"] == "pass":
            await gl.approve(dep.iid)
        LOG.info("!%s -> %s (%s)", dep.iid, v["verdict"].upper(), dep.pkg)

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
