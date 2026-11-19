# `.gitlab/scripts/` — CI job scripts

Two Python helpers for the MR change-summary CI job.
`mr_change_summary_prompt.py` renders the agent prompt from `CI_*`
variables and the MR diff; `mr_change_summary_invoke.py` calls git-agent
over A2A, posts the MR note, and skips inference when a hash trailer says
the diff has not changed.

> **Navigation**: [← Home](../README.md)
