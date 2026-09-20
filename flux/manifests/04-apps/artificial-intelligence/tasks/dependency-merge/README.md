# dependency-merge-sweep

Second stage of the dependency-review pipeline. Runs at :50, 30 minutes
behind the [:20 review sweep](../dependency-review) (`git-agent`), and acts
on its output:

```text
:20  dependency-review-sweep  (git-agent)     verdicts, labels, approvals
:50  dependency-merge-sweep    (homelab-agent) merge green, triage the rest
```

## Phase A — merge what the review passed

Mechanical gates (runner, no LLM), in order:

1. **infra-class hard block** — branch/title match against `INFRA_KEYWORDS`
   (talos, siderolabs, kubelet, authentik, tailscale, litellm, cnpg,
   longhorn, rabbitmq, redis, kube-prometheus). Label-independent: a
   Talos-class bump can reboot the cluster these agents run on, so it never
   reaches the merge list even if mislabeled.
2. `agent-review:pass` label present (the sweep recomputes the whole
   `agent-review:*` set every run — stale flags come off automatically)
3. **no** `agent-review:major` / `agent-review:infra` flag — those are the
   operator's, always
4. review note's `reviewed-sha` matches the current MR head — retargeted MRs
   go back to the review sweep, never merged stale
5. update type in `MERGE_UPDATE_TYPES` (default `digest,patch,minor`)
6. `detailed_merge_status` mergeable, no conflicts
7. head-sha pipeline `success`
8. approved (if the approvals API says otherwise)

Only then does the **homelab-agent** get the candidate list for go/no-go:
cluster health check via its tools, package-sanity pass, skip-on-doubt. The
runner executes the merges it approves (`should_remove_source_branch`).
With `A2A_URL` unreachable, nothing merges — no unjudged merges, ever.

## Phase B — daily triage digest → Discord (07:50 America/Denver)

Everything NOT merged gets handed to the homelab-agent once a day. It posts
one digest to Discord `#notifications` (its own discord-mcp tools, guild
`996790779257290772` — same channel as the other scheduled reports):
ready-to-merge / decide / waiting / stuck. The runner only accepts the
merge as delivered when the agent's `send_message` actually succeeded and
the confirmation JSON says so.

## Configuration

| env                  | default              | notes                                                          |
| -------------------- | -------------------- | -------------------------------------------------------------- |
| `MERGE_UPDATE_TYPES` | `digest,patch,minor` | the auto-merge line; majors/infra are hard-excluded regardless |
| `DRY_RUN`            | `false`              | log actions, mutate nothing                                    |
| `A2A_URL`            | homelab-agent        | empty = no merges (review-only)                                |

## Secrets

Reuses the sibling task's OnePasswordItem
(`dependency-review-secrets` → `vaults/Secrets/items/gitlab-mcp-secrets`).
The token must hold merge rights on the project; if protected-branch rules
reject the merge, the job logs the 403 and the MR lands in the digest.
