# `.gitlab/scripts/` — CI job scripts

Three Python helpers for the MR change-summary CI job.
`mr_change_summary_prompt.py` renders the agent prompt from `CI_*`
variables, filtering the MR diff to version-pin hunks; the invoke side,
`mr_change_summary_invoke.py`, calls the `mr-summary-agent` over A2A,
posts the MR note, and skips inference when a hash trailer says the
filtered diff has not changed. `mr_change_summary_prompt_test.py` is the
stdlib-only self-test for the filter.

> **Navigation**: [← Home](../README.md)
