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
