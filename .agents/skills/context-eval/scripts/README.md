# `context-eval/scripts` — grader validation gate

`verify_checks.py` stages every corpus task in a throwaway workspace and
proves each grader can fail before any agent run bills: reference overlay
must score exactly 1.0, bare/naive/decoy overlays below 1.0.
`test_verify_checks.py` is its unittest suite.

> **Navigation**: [← Back to context-eval README](../README.md)
