# `.gitlab/scripts/`: CI job scripts

Three Python files for the MR change-summary CI job.
`mr_change_summary_prompt.py` renders the agent prompt from `CI_*`
variables and the MR diff; `mr_change_summary_invoke.py` calls git-agent
over A2A, posts the MR note, and skips inference when a hash trailer says
the diff has not changed. `mr_change_summary_invoke_test.py` is the
stdlib-only self-test for the invoke script's failure handling.

> **Navigation**: [← Home](../README.md)
