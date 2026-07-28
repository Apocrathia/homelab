---
title: "Tdarr flows: storage-first multipass and size-guard fix"
kind: feature
status: open
severity: high
source: human
found_at: 2026-07-26
found_by: alignment
area: apps
slice: hitl
---

# Tdarr flows: storage-first multipass and size-guard fix

## Problem / desired state

Tdarr custom flows
(`flux/manifests/04-apps/media/management/tdarr/flows/`) optimize for
**storage savings** via computationally expensive codecs. That goal is
undermined today:

1. **Size verify rejects good encodes.** Flow 3 uses
   `Tdarr_Plugin_a9he_New_file_size_check` with bounds **8%–200%**. Successful
   remux→x265 encodes that land under 8% of original (e.g. ~6.2 GB → ~482 MB /
   7%) are marked `Transcode error` and discarded; the large original is kept.
   Historical job reports show this class repeatedly (~116 "not within limits"
   hits). The 200% upper bound also allows growth, which conflicts with a
   storage-first policy.

2. **Low-bitrate SD grows under CRF 20 / main10.** Already-efficient SD sources
   (e.g. Jerry Springer S28 / Specials: ~400–900 kb/s H.264 or DivX) re-encoded
   at `libx265` CRF 20 `veryslow` `main10` grew **104–172%** (~39 files,
   ~3.2 GB net). The 8–200% guard passed those outputs and replaced the
   smaller originals. Bitrate caps alone will not re-queue them: after growth
   they are still well under the 720p ≤4 Mbps “done” line.

3. **No durable "small enough" stop for re-scans.** Libraries should be safe to
   re-run indefinitely. Efficient HEVC should be left alone; fat or
   under-floored HEVC should be eligible for another pass with more aggressive
   CRF — including files already wrongly grown by an earlier CRF 20 pass.

4. **Edge cases burn cycles or fail the mux.** BR-DISK / disc images (`.iso`,
   `.m2ts`) cannot be handled by this pipeline and should be skipped. Unsupported
   subtitle codecs (e.g. `mov_text` into MKV) fail the encode; convert first,
   drop on failure.

**Desired behavior (aligned):**

| Rule                       | Policy                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary goal               | Storage savings                                                                                                                                     |
| No-grow                    | Keep output only if not meaningfully larger (**≤101%**; blocks runaway growth)                                                                      |
| Size verify                | **2% / 101%** (sanity floor + remux wiggle; reject real growth)                                                                                     |
| HD+ first pass             | Existing path: CRF from library `quality_level` (typically **20**), `veryslow`; 10-bit allowed when source warrants it                              |
| SD first pass              | Height **≤576**: start CRF **26**, profile **main** / **8-bit** (no `main10`/`p010le`); same `veryslow`                                             |
| Done (HD+)                 | Already HEVC **and** overall bitrate under per-resolution cap (720p≤4 / 1080p≤10 / 4K≤25 Mbps — keep current table)                                 |
| Done (SD)                  | Already HEVC **and** stored CRF / `quality_level` at floor **28** (bitrate secondary; SD under 4 Mbps is not “done” if still below CRF floor)       |
| Multipass                  | Step CRF **+2** (20→22→24… or 26→28) up to floor **28**, `veryslow`. HD+: when over bitrate cap. SD: until CRF floor **28**. No-grow still applies. |
| Already-grown HEVC         | Eligible for multipass (e.g. CRF 20 SD Springer → 22→…→28) so size can come back down; do not treat “HEVC + under HD bitrate cap” as done for SD    |
| BR-DISK / `.iso` / `.m2ts` | Skip forever (manual remux path later, out of scope)                                                                                                |
| Unsupported subs           | Try convert; if that fails, drop and continue                                                                                                       |

## Repro

Size-guard false negative (observed 2026-07-25):

1. Queue a large Bluray remux (e.g. ~6 GB h264 + FLAC anime episode) through
   `01 → 02 → 03`.
2. Video encode completes successfully (ffmpeg exit 0, ~480 MB output).
3. Flow 3 "Verify output file size (8-200% of original)" fails:
   `New file size not within limits … which is 7% of original … lowerBound is 8%`.
4. Job verdict: `transcodeError`; original file unchanged.

Evidence: Tdarr `jobsjsondb` + `DB2/JobReports/<footprintId>/*.txt` (e.g.
footprint `905LSX-VCb` / job `KlO7KpW61`).

Size-guard false allow / SD growth (observed on Jerry Springer library):

1. Queue low-bitrate SD H.264 (~150 MB, ~400 kb/s video) through Flow 3.
2. Encode at CRF 20 `main10` completes; output ~170% of original.
3. Size check (8–200%) passes; original replaced with larger HEVC.

Evidence: e.g. footprint `Aug7Oc3ZlY` — “New file has size 268.181 MB which is
170% of original file size: 156.940 MB”; then `replaceOriginalFile`.

## Acceptance

- Flow 3 size check uses **lowerBound 2** and **upperBound 101** (or equivalent
  sanity floor + tiny remux wiggle). Successful sub-8% remux compressions
  proceed to Flow 4 and replace the original.
- Outputs **>101%** of original size are rejected (original kept).
- SD (height ≤576) first encodes use CRF **≥26** and **8-bit main**; they do
  not use `main10`/`p010le` by default.
- Re-scanning does not re-encode HD+ HEVC under the existing bitrate caps;
  HD+ over the cap and SD HEVC below CRF floor **28** are eligible for stepped
  CRF multipass (from stored `quality_level`, floor 28).
- Already-grown SD HEVC from earlier CRF 20 passes (e.g. Springer S28) get
  another pass and can replace only when the new file is smaller.
- BR-DISK / `.iso` / `.m2ts` (and equivalent disc containers) are skipped
  without a failed encode loop.
- Files with unsupported-for-MKV subtitle codecs attempt conversion; on
  conversion failure, subs are dropped and the rest of the pipeline continues.
- Tracked flow JSON under `flows/` and `flows/README.md` match the live import
  contract (IDs / `goToFlow` wiring unchanged unless intentionally revised).

## Feedback loop

- Diff / review `flows/03-video.json` (and related) against acceptance bounds.
- After import into Tdarr: re-queue a previously rejected remux that landed
  ~7% of original; expect `Transcode success` and original replaced.
- Confirm a deliberately oversize output path still fails before replace.
- Re-queue one grown Springer SD HEVC (CRF 20 era); expect a higher-CRF pass
  and replace only if smaller — or keep current file if still not smaller at
  floor 28.
- Spot-check job reports for one BR-DISK path (skip, not ffmpeg failure) and
  one `mov_text` MP4 path (convert or drop, not mux error).
- `prettier --check` on any changed markdown; yamllint N/A for flow JSON unless
  project tooling covers it.

## Implementation hint

Flows live in
`flux/manifests/04-apps/media/management/tdarr/flows/` (manual UI import;
not GitOps-applied). Quickest unblock is the size-bound change in Flow 3;
SD CRF/bit-depth branching, multipass CRF persistence across scans, BR-DISK
skip, and subtitle handling are follow-on flow edits — prefer a living plan
under `docs/plans/` once implementation starts. How CRF / `quality_level`
“pass N” is stored (file/library variable vs other) is required for SD
re-shrink and remains an implementation detail left open by alignment.

## Notes

- Alignment 2026-07-25/26: storage-first; dual gate (no-grow + bitrate done);
  SD CRF floor + 8-bit first pass; HEVC re-shrink via multipass; skip disc
  images; convert-then-drop subs.
- Do not retune HD bitrate caps (4/10/25 Mbps) in the same lap as the
  size-guard fix — keep until there is before/after evidence. SD “done” is
  CRF-floor-based, not a new Mbps row, unless later evidence says otherwise.
- Related failure classes (7d sample ~339 Transcode errors, 2026-07-27):
  `mov_text`→MKV (~209); HEVC/`gbrp` cover as 2nd video (~84 — codec-name
  drop misses these); old 8% size rejects (~13, fixed by 2% floor); ffprobe
  unreadable / disc; exotic audio (`adpcm_ima_qt`, `pcm_bluray`); 0-byte
  source size check; rare Plex notify false errors.
