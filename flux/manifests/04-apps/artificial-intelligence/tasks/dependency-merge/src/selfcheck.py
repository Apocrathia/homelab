# ruff: noqa: S101
import invoke as inv

note_body = """## \N{ROBOT FACE} Agent dependency review
**Verdict: PASS** \N{EM DASH} Digest refresh (same tag, rebuilt image) - CVE-rebuild class, no cooldown.

| package | `docker/library/alpine` 5b02b42 \N{RIGHTWARDS ARROW} **294b683** (digest) |

reviewed-sha: cf91dd1b59873c8421708d974232874d588fbc8b
"""
verdict = inv._VERDICT_RE.search(note_body)
sha = inv._SHA_RE.search(note_body)
utype = inv._UTYPE_RE.search(note_body)
assert verdict and verdict.group(1) == "PASS", verdict
assert sha and sha.group(1) == "cf91dd1b59873c8421708d974232874d588fbc8b", sha
assert utype and utype.group(1) == "digest", utype
dec = inv.parse_agent_json('noise\n```json\n[{"iid": 4790, "action": "merge", "reason": "ok"}]\n```')
assert dec and dec[0]["action"] == "merge", dec
# major note must not match the digest gate
note_major = note_body.replace("(digest)", "(major)")
assert inv._UTYPE_RE.search(note_major).group(1) == "major"
print("ALL PATH CHECKS PASS:", verdict.group(1), utype.group(1), dec[0]["action"])
