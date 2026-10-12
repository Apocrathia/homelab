# ruff: noqa: S101
"""Cross-stage contract check: notes produced by build_note must parse with the
merge stage's regexes (see dependency-merge/src/invoke.py _VERDICT_RE etc.).
Run from src/: uv run python selfcheck.py"""

import re

import invoke as inv

dep = inv.Dep(
    iid=4790,
    title="chore(deps): test",
    branch="renovate/test-1.x",
    updated_at="2026-09-19T10:00:00Z",
    pkg="library/test",
    update_type="digest",
    old="aaaa1111",
    new="bbbb2222",
)
f = {
    "osv_new": {"count": 0, "ids": []},
    "issue_scan": {
        "total": 1,
        "top": [{"n": 1, "state": "open", "title": "x", "created": "2026-09-19", "p1": 0, "comments": 0}],
    },
}
v = {
    "iid": 4790,
    "verdict": "pass",
    "reason": "Digest refresh (same tag, rebuilt image) - CVE-rebuild class, no cooldown.",
    "flags": ["agent-review:phase2-trivy"],
}
sha = "cf91dd1b59873c8421708d974232874d588fbc8b"
note = inv.build_note(dep, f, v, "looked clean", sha)

# must match dependency-merge/src/invoke.py: _VERDICT_RE / _SHA_RE / _UTYPE_RE
assert re.search(r"\*\*Verdict: (PASS|HOLD|BLOCK)\*\*\s*[—-]?\s*(.*)", note).group(1) == "PASS"
assert re.search(r"reviewed-sha: ([0-9a-f]{40})", note).group(1) == sha
assert re.search(r"→ \*\*[^*]+\*\* \((digest|patch|minor|major)\)", note)

# infra detection: talos-class deps always flagged, incl. installer/kubelet images
for pkg in (
    "siderolabs/talos",
    "ghcr.io/siderolabs/installer",
    "ghcr.io/siderolabs/kubelet",
    "talosctl",
    "siderolabs/talos",
):
    assert inv._is_infra(pkg, "", "renovate/x"), pkg
assert inv._is_infra("", "chore(deps): Update dependency siderolabs/talos to v1.14.1", "renovate/siderolabs-talos-1.x")
assert not inv._is_infra(
    "ghcr.io/unpoller/unpoller", "chore(deps): Update unpoller", "renovate/ghcr.io-unpoller-unpoller-5.x"
)
print("STAGE-1 CONTRACT CHECKS PASS")

# agent-hold protection: fallback pass must not overwrite a prior agent hold
v_pass = {"iid": 1, "verdict": "pass", "reason": "", "flags": []}
kept = inv.protect_prior_agent_hold(v_pass, ["agent-review:pass", "agent-review:agent-held", "agent-review:done"])
assert kept["verdict"] == "hold", kept
v_no_label = inv.protect_prior_agent_hold(dict(v_pass), ["agent-review:pass"])
assert v_no_label["verdict"] == "pass", v_no_label
v_holding = inv.protect_prior_agent_hold({"iid": 1, "verdict": "hold", "reason": "", "flags": []}, [])
assert v_holding["verdict"] == "hold", v_holding
print("AGENT-HOLD PROTECTION CHECKS PASS")

# agent-invented flags: only whitelisted vocabulary becomes labels; the rest is note text
assert inv.ALLOWED_FLAGS <= set(inv.ALL_AGENT_LABELS)
assert "agent-review:regression" not in inv.ALLOWED_FLAGS
assert "agent-review:source-mismatch" not in inv.ALLOWED_FLAGS
print("FLAG WHITELIST CHECKS PASS")

# pick_review_note: finds the sweep-owned note among decoys, returns None
# without one, and picks the first (newest — caller passes desc-ordered)
# when several sweep notes exist
sweep_new = {"id": 11, "body": "## 🤖 Agent dependency review\n**Verdict: PASS**\nreviewed-sha: " + "a" * 40}
sweep_old = {"id": 10, "body": "## 🤖 Agent dependency review\n**Verdict: HOLD**\nreviewed-sha: " + "b" * 40}
human = {"id": 12, "body": "bump whenever, looks fine to me"}
renovate = {"id": 13, "body": "chore(deps): update dependency x to 1.2.3"}
assert inv.pick_review_note([human, sweep_new, renovate]) is sweep_new
assert inv.pick_review_note([human, renovate]) is None
assert inv.pick_review_note([sweep_new, sweep_old, human]) is sweep_new
print("PICK-REVIEW-NOTE CHECKS PASS")

# verdict-pin contract: agent downgrades stamp agent-pin:<v>@<sha> in the note;
# _PIN_RE round-trips the marker, passes never pin, and the merge-stage regexes
# still hit (dependency-merge parses these notes unchanged)
pin_sha = "cf91dd1b59873c8421708d974232874d588fbc8b"
assert inv.parse_pin(note) is None  # pass note carries no pin
reason0 = "tenzir v6.20.0-rc.1 has a data-loss regression upstream"
v_pin = inv.apply_pin(
    {"iid": 4790, "verdict": "pass", "reason": "gate cleared", "flags": []},
    {"verdict": "hold", "sha": pin_sha},
    reason0,
)
note_pin = inv.build_note(dep, f, v_pin, None, pin_sha, ("hold", pin_sha))
assert inv.parse_pin(note_pin) == {"verdict": "hold", "sha": pin_sha}
assert re.search(r"\*\*Verdict: (PASS|HOLD|BLOCK)\*\*\s*[—-]?\s*(.*)", note_pin).group(1) == "HOLD"
assert re.search(r"reviewed-sha: ([0-9a-f]{40})", note_pin).group(1) == pin_sha
assert re.search(r"→ \*\*[^*]+\*\* \((digest|patch|minor|major)\)", note_pin)
assert inv.parse_pin("agent-pin: hold@deadbeef") is None  # short sha can never pin

# severity matrix: effective verdict = max(deterministic, pin); OSV block always wins
assert (
    inv.apply_pin({"verdict": "pass", "reason": "r", "flags": []}, {"verdict": "hold", "sha": "a" * 40}, "x")["verdict"]
    == "hold"
)
assert (
    inv.apply_pin({"verdict": "pass", "reason": "r", "flags": []}, {"verdict": "block", "sha": "a" * 40}, "x")[
        "verdict"
    ]
    == "block"
)
assert (
    inv.apply_pin({"verdict": "hold", "reason": "r", "flags": []}, {"verdict": "block", "sha": "a" * 40}, "x")[
        "verdict"
    ]
    == "block"
)
det_block = inv.apply_pin(
    {"verdict": "block", "reason": "OSV hit", "flags": []}, {"verdict": "hold", "sha": "a" * 40}, "x"
)
assert det_block["verdict"] == "block" and det_block["reason"] == "OSV hit"  # det block carries verdict+reason

# pinned carry: agent-held label set, original agent reason preserved + round-trips
assert inv.AGENT_HELD_LABEL in v_pin["flags"]
assert [f"agent-review:{v_pin['verdict']}"] + v_pin["flags"] == ["agent-review:hold", "agent-review:agent-held"]
assert v_pin["reason"] == f"Prior agent hold stands (branch unchanged since review): {reason0}"
assert inv.parse_prior_reason(note_pin) == reason0  # wrapper unwinds across sweeps
v_pin2 = inv.apply_pin(
    {"verdict": "pass", "reason": "gate cleared", "flags": []},
    inv.parse_pin(note_pin),
    inv.parse_prior_reason(note_pin),
)
assert v_pin2["reason"].count("Prior agent") == 1  # second sweep re-wraps without nesting
old_note = (
    "## 🤖 Agent dependency review\n**Verdict: HOLD** — gate cleared\n\n"
    "**Agent judgment:** regression upstream #1193\n\nreviewed-sha: " + "c" * 40
)
assert inv.parse_prior_reason(old_note) == "regression upstream #1193"  # pre-pin note: verbatim agent words win
fb = inv.apply_pin({"verdict": "pass", "reason": "r", "flags": []}, {"verdict": "block", "sha": "a" * 40}, "")
assert (
    fb["reason"]
    == "Prior agent block stands (branch unchanged since review): original agent reason unavailable in prior note"
)
print("PIN CONTRACT CHECKS PASS")
