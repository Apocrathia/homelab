#!/usr/bin/env python3
"""Merge + triage sweep behind the dependency-review job.

Phase A (merge): open renovate MRs labeled agent-review:pass by the review
sweep, gated hard (reviewed sha match, green pipeline, mergeable, no
major/infra flags, update type allowed) — judgment turn with homelab-agent
(cluster context) — then merge via the GitLab API.

Phase B (triage): everything not merged gets a daily digest note on the
Renovate Dependency Dashboard issue, grouped and prioritized by the
homelab agent for the operator's morning review.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

import httpx
from a2a.client import ClientConfig, ClientFactory
from a2a.client.card_resolver import A2ACardResolver
from a2a.helpers.proto_helpers import get_artifact_text, get_message_text
from a2a.types import Message, Part, Role, SendMessageRequest, TaskState

LOG = logging.getLogger("dependency-merge")

DEFAULT_MERGE_TYPES = ("digest", "patch", "minor")
DIGEST_HOUR_UTC = 13  # 13:50Z == 07:50 America/Denver (MDT)

NO_MERGE_FLAGS = ("agent-review:major", "agent-review:infra")
# Label-independent hard blocklist: infra-class deps (Talos and friends) can
# take the cluster — and the agents themselves — offline if merged by an agent.
# Checked against branch + title BEFORE any label logic; a mislabeled MR
# still cannot slip through.
INFRA_KEYWORDS = (
    "talos",
    "siderolabs",
    "kubelet",
    "factory.talos.dev",
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


def _infra_class(*fields: str) -> bool:
    p = " ".join(f.lower() for f in fields if f)
    return any(k in p for k in INFRA_KEYWORDS)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


def _dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


class GitLab:
    def __init__(self, base: str, token: str, project: str) -> None:
        self.http = httpx.AsyncClient(base_url=base.rstrip("/"), headers={"PRIVATE-TOKEN": token}, timeout=30.0)
        self.project = quote(project, safe="")

    async def open_renovate_mrs(self) -> list[dict]:
        r = await self.http.get(
            f"/projects/{self.project}/merge_requests",
            params={"state": "opened", "per_page": 100, "order_by": "updated_at"},
        )
        r.raise_for_status()
        return [m for m in r.json() if m["source_branch"].startswith("renovate/")]

    async def review_note(self, iid: int) -> dict | None:
        """Latest dependency-review note (contains verdict + reviewed-sha)."""
        r = await self.http.get(
            f"/projects/{self.project}/merge_requests/{iid}/notes",
            params={"per_page": 50, "sort": "desc", "order_by": "created_at"},
        )
        if r.status_code >= 300:
            return None
        for n in r.json():
            body = n.get("body") or ""
            if "Agent dependency review" in body and "reviewed-sha:" in body:
                verdict = _VERDICT_RE.search(body)
                sha = _SHA_RE.search(body)
                utype = _UTYPE_RE.search(body)
                pkg = re.search(r"\| package \| `([^`]+)`", body)
                return {
                    "pkg": pkg.group(1) if pkg else "",
                    "verdict": verdict.group(1).lower() if verdict else "",
                    "reason": (verdict.group(2) or "").strip() if verdict else "",
                    "sha": sha.group(1) if sha else "",
                    "utype": utype.group(1) if utype else "",
                    "created_at": n.get("created_at", ""),
                }
        return None

    async def head_pipeline_status(self, sha: str) -> str | None:
        r = await self.http.get(f"/projects/{self.project}/pipelines", params={"sha": sha, "per_page": 3})
        if r.status_code >= 300 or not r.json():
            return None
        return r.json()[0].get("status")

    async def approved(self, iid: int) -> bool | None:
        r = await self.http.get(f"/projects/{self.project}/merge_requests/{iid}/approvals")
        if r.status_code >= 300:
            return None  # approvals feature unavailable — merge API is the authority
        return bool(r.json().get("approved"))

    async def merge(self, iid: int, sha: str) -> bool:
        r = await self.http.post(
            f"/projects/{self.project}/merge_requests/{iid}/merge",
            json={"sha": sha, "should_remove_source_branch": True},
        )
        if r.status_code == 200:
            LOG.info("merged !%s", iid)
            return True
        LOG.warning("merge !%s failed: %s %s", iid, r.status_code, r.text[:150])
        return False

    async def close(self) -> None:
        await self.http.aclose()


def looks_like_tool_stub_text(text: str) -> bool:
    t = text.strip()
    return bool(t) and t.startswith("{") and '"name"' in t and '"arguments"' in t


async def agent_turn(a2a_url: str, prompt: str, continuation: str, max_turns: int, timeout_s: float) -> str:
    """One multi-turn A2A conversation; returns the accumulated text."""
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
                return ""
            if state == "completed" and saw_text:
                break
        return "\n".join(collected)


_JSON_BLOCK = re.compile(r"```(?:json)?\s*(\[[^`]*?\])\s*```", re.DOTALL)
# stage-1 note rows look like: | package | `pkg` old → **new** (digest) |
_UTYPE_RE = re.compile(r"→ \*\*[^*]+\*\* \((digest|patch|minor|major)\)")
_VERDICT_RE = re.compile(r"\*\*Verdict: (PASS|HOLD|BLOCK)\*\*\s*[—-]?\s*(.*)")
_SHA_RE = re.compile(r"reviewed-sha: ([0-9a-f]{40})")


def parse_agent_json(text: str) -> list[dict]:
    if not text:
        return []
    m = _JSON_BLOCK.search(text)
    if not m:
        return []
    try:
        out = json.loads(m.group(1))
        return out if isinstance(out, list) else []
    except json.JSONDecodeError:
        return []


def update_type_of(note: dict | None) -> str:
    """digest | patch | minor | major — captured from the review note's package row."""
    return (note or {}).get("utype") or ""


def _skip(remaining: list[dict], m: dict, why: str) -> None:
    LOG.info("skip !%s: %s", m["iid"], why)
    remaining.append({**m, "_why": why})


async def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout)
    gl = GitLab(
        os.environ.get("GITLAB_API", "https://gitlab.com/api/v4"),
        os.environ["GITLAB_TOKEN"],
        os.environ.get("GITLAB_PROJECT", "Apocrathia/homelab"),
    )
    a2a_url = os.environ.get("A2A_URL", "").strip()
    dry_run = _env_bool("DRY_RUN", False)
    merge_types = tuple(
        t.strip().lower()
        for t in os.environ.get("MERGE_UPDATE_TYPES", ",".join(DEFAULT_MERGE_TYPES)).split(",")
        if t.strip()
    )
    max_turns = int(float(os.environ.get("MAX_TURNS", "6")))
    timeout_s = float(os.environ.get("HTTP_TIMEOUT_S", "300"))

    mrs = await gl.open_renovate_mrs()
    LOG.info("open renovate MRs: %s", len(mrs))

    # --- Phase A: candidate gates -----------------------------------------
    candidates: list[dict] = []
    remaining: list[dict] = []
    for m in mrs:
        if _infra_class(m["source_branch"], m["title"]):
            _skip(remaining, m, "infra-class — operator only (hard block)")
            continue
        labels = set(m.get("labels") or [])
        if "agent-review:pass" not in labels:
            _skip(remaining, m, "not reviewed / verdict not pass")
            continue
        if labels & set(NO_MERGE_FLAGS):
            _skip(remaining, m, "major/infra flagged — operator review")
            continue
        note = await gl.review_note(m["iid"])
        if not note or note["verdict"] != "pass" or not note["sha"]:
            _skip(remaining, m, "review note missing/ambiguous")
            continue
        if note["sha"] != m.get("sha"):
            _skip(remaining, m, "head moved since review — re-review next sweep")
            continue
        utype = update_type_of(note)
        if utype not in merge_types:
            remaining.append({**m, "_why": f"update type {utype or '?'} not in auto-merge set"})
            continue
        if m.get("has_conflicts") or m.get("detailed_merge_status") not in ("mergeable", None):
            _skip(remaining, m, f"not mergeable ({m.get('detailed_merge_status')})")
            continue
        pipe = await gl.head_pipeline_status(m["sha"])
        if pipe != "success":
            _skip(remaining, m, f"pipeline {pipe or 'none'}")
            continue
        appr = await gl.approved(m["iid"])
        if appr is False:
            _skip(remaining, m, "not approved")
            continue
        candidates.append(
            {
                **m,
                "_note_reason": note["reason"],
                "_utype": utype,
                "_note_pkg": note.get("pkg", ""),
                "_approved": appr,
            }
        )

    LOG.info("merge candidates: %s, remaining: %s", len(candidates), len(remaining))

    # --- Phase A2: homelab-agent go/no-go + merge --------------------------
    merged: list[dict] = []
    if candidates and a2a_url:
        prompt_tmpl = Path(os.environ.get("PROMPT_PATH", "/scripts/task.md")).read_text(encoding="utf-8")
        continuation = Path(os.environ.get("CONTINUATION_PATH", "/scripts/continuation.md")).read_text(encoding="utf-8")
        sheet = [
            {
                "iid": c["iid"],
                "title": c["title"],
                "pkg": c["_note_pkg"],
                "reason": c["_note_reason"],
                "update_type": c["_utype"],
            }
            for c in candidates
        ]
        prompt = prompt_tmpl + "\n\n## Merge candidates\n\n```json\n" + json.dumps(sheet, indent=1) + "\n```\n"
        text = await agent_turn(a2a_url, prompt, continuation, max_turns, timeout_s)
        decisions = {int(d["iid"]): d for d in parse_agent_json(text) if "iid" in d}
        for c in candidates:
            d = decisions.get(c["iid"], {})
            action = str(d.get("action", "")).lower()
            if action not in ("merge", "skip"):
                _skip(remaining, c, f"agent judgment: {d.get('reason', 'no decision')}")
                continue
            if action == "skip":
                _skip(remaining, c, f"agent held: {str(d.get('reason'))[:120]}")
                continue
            if dry_run:
                LOG.info("DRY RUN would merge !%s (%s)", c["iid"], c["title"][:60])
                merged.append(c)
                continue
            if await gl.merge(c["iid"], c["sha"]):
                merged.append(c)
            else:
                _skip(remaining, c, "merge API failed")
    elif candidates:
        for c in candidates:
            _skip(remaining, c, "A2A unavailable — no unjudged merges")

    # --- Phase B: daily triage digest ---------------------------------------
    hour_utc = datetime.now(UTC).hour
    if remaining and hour_utc == DIGEST_HOUR_UTC and a2a_url:
        try:
            tri_tmpl = Path(os.environ.get("TRIAGE_PROMPT_PATH", "/scripts/triage.md")).read_text(encoding="utf-8")
            rows = [
                {
                    "iid": m["iid"],
                    "title": m["title"][:100],
                    "why": m["_why"],
                    "labels": [lb for lb in (m.get("labels") or []) if lb.startswith("agent-review")],
                }
                for m in remaining
            ]
            tprompt = tri_tmpl + "\n\n## Remaining MRs\n\n```json\n" + json.dumps(rows, indent=1) + "\n```\n"
            ttext = await agent_turn(a2a_url, tprompt, continuation, max_turns, timeout_s)
            confirm = parse_agent_json(ttext)
            posted = any(str(c.get("posted")).lower() == "true" for c in confirm if isinstance(c, dict))
            if dry_run:
                LOG.info("DRY RUN triage digest for Discord #notifications (%s MRs)", len(rows))
            elif posted:
                LOG.info("triage digest posted to Discord #notifications")
            else:
                LOG.warning("triage digest NOT confirmed posted: %s", (confirm or ttext)[-300:])
        except Exception as e:  # noqa: BLE001
            LOG.warning("triage phase failed: %s", e)

    await gl.close()
    LOG.info("done: merged %s, remaining %s", len(merged), len(remaining))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
