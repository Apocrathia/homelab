---
title: "OpenTAXII feed sources: MISP push + OpenCanary triage (no public TAXII 2.1 feeds)"
kind: feature
status: open
severity: medium
source: agent
found_at: 2026-10-18
area: security
---

# OpenTAXII feed sources: MISP push + OpenCanary triage

## Problem / desired state

OpenTAXII is deployed and bootstrapped (TAXII 2.1 api root + public
`stix-feed` collection), and the OpenCTI taxii2 import connector wiring is in
flight (`feat/opentaxii-opencti-connector`). But nothing feeds the TAXII 2.1
collection, so the staging hub still carries no content.

Research (2026-10-19, primary-source cited:
`.scratch/opentaxii-setup/research.md`) verified:

- No reliable anonymous free public TAXII 2.1 feed exists to poll. CIRCL
  `cib.circl.lu` appears defunct (no live endpoint, no archive; UNVERIFIED
  globally — research host has flaky DNS), CISA AIS 2.0 requires participant
  registration + FBCA client cert + static IP allowlist, abuse.ch explicitly
  refuses STIX/TAXII exports, TAXIIstand demo is dead.
- OpenTAXII 0.10 keeps TAXII 1.x and TAXII 2.1 storage disjoint
  (`data_collections`/`content_blocks` vs `opentaxii_api_root`/
  `opentaxii_collection`/`opentaxii_stixobject`). TAXII 1.x inbox content
  never appears in a TAXII 2.1 collection, so TAXII 1.x sources are invisible
  to the OpenCTI connector. There is no `opentaxii-fetch-data` tool.
- The only load path the connector can see: TAXII 2.1
  `POST /taxii2/<root>/collections/<id-or-alias>/objects/`
  (`application/taxii+json;version=2.1` envelope, 202 + job status), or
  out-of-band CLI/stdin import.

Desired state: real content flows into the `stix-feed` collection via a
GitOps-managed mechanism:

1. **MISP → OpenTAXII push**: MISP's TAXII 2.1 client push (url, base64
   auth, api root, collection config — misp-project.org TAXII push blog).
   Community data can enter via MISP's own free MISP-format feeds (CIRCL
   feed-osint) first. Note the existing MISP → OpenCTI direct connector
   (REST) already covers MISP→OpenCTI; this path adds the staging-hub route
   and would need a deliberate scoping decision to avoid double-import.
2. **OpenCanary triage → STIX push**: the security README's aspirational
   path — a triage script/scripted job reading canary alerts (Loki-side
   today), building STIX 2.1 indicator bundles, POSTing to the collection.
   This is the operator-prioritized signal source ("feed any opencanary
   signals in").

## Acceptance

- `stix-feed` collection ingests real content (psql `opentaxii_stixobject`
  count > 0; `GET /taxii2/<root>/collections/<id>/objects/` returns objects).
- connector-taxii2 imports that content into OpenCTI (objects visible in
  OpenCTI; connector logs show successful poll).
- The feed mechanism is GitOps-managed (CronJob / MISP sync config / scripted
  push under `flux/manifests/`), not a manual curl.
- OpenCanary alerts ingested end-to-end within one polling cycle of
  generation (for the canary lane).
- READMEs updated (opentaxii + security threat-intel flow).

## Feedback loop

- `kubectl exec -n opentaxii deploy/opentaxii -- ... GET
/taxii2/9d2329b4-6a06-4f01-9c94-a2c3e6d1a501/collections/` (headers:
  `Accept: application/taxii+json;version=2.1`)
- `kubectl exec -n opentaxii opentaxii-postgres-1 -- psql -U postgres -d
opentaxii -c "select count(*) from opentaxii_stixobject"`
- OpenCTI connector logs (`kubectl logs -n opencti deploy/opencti-taxii2`)
- `yamllint` / prettier on manifest changes; `kustomize build` on the app dir

## Implementation hint

Bootstrap live state: api root `9d2329b4-6a06-4f01-9c94-a2c3e6d1a501`
("Default", public), collection `952c801c-e4c8-4316-a565-5f97221e799f`
("stix-feed", public read + write). Collections are URL-addressable by alias
(`opentaxii-add-collection -a`), which a stable push job should use instead
of the UUID. Write access needs `is_public_write` (already set) or an
account (`opentaxii-create-account`; management API only exposes
`/management/auth` + `/management/health`). POST envelope validation honors
`allow_custom_properties`. Full source citations in
`.scratch/opentaxii-setup/research.md`.

## Notes

Research caveat: the research host had flaky external DNS; "defunct" findings
for CIRCL/TAXIIstand are corroborated via official docs and archive indexes,
not live probes. No secrets in this file; DB credentials live in 1Password
item `vaults/Secrets/items/opentaxii-secrets`.
