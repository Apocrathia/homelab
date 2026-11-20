#!/usr/bin/env python3
"""Self-test for mr_change_summary_invoke's pure failure helpers.

Stdlib-only, assert-based. Run from the repo root:

    python3 .gitlab/scripts/mr_change_summary_invoke_test.py

The module under test imports a2a-sdk and httpx at module scope (neither
is stdlib). When they are not installed, inert stubs are injected so the
pure helpers can still be imported and checked on a bare python.
"""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("mr_change_summary_invoke.py")

# Reason -> exit code, mirroring the buckets in the module docstring:
# invocation-side failures exit 1, verification-side failures exit 2.
EXPECTED_EXIT_CODES = {
    "agent-unreachable": 1,
    "budget-exhausted": 1,
    "transport-failures": 1,
    "no-completion": 1,
    "note-missing": 1,
    "trailer-write-failed": 2,
    "bad-input": 2,
}


def _stub_module(name: str, **attrs: object) -> None:
    module = types.ModuleType(name)
    for attr, value in attrs.items():
        setattr(module, attr, value)
    sys.modules[name] = module


def _install_stubs_if_missing() -> None:
    try:
        import httpx  # noqa: F401
    except ImportError:
        sys.modules["httpx"] = types.ModuleType("httpx")
    try:
        import a2a.types  # noqa: F401
    except ImportError:

        class _Role:
            ROLE_USER = "ROLE_USER"

        class _TaskState:
            @staticmethod
            def Name(value: object) -> str:
                return str(value)

        _stub_module("a2a")
        _stub_module("a2a.client", ClientConfig=object, ClientFactory=object)
        _stub_module("a2a.client.card_resolver", A2ACardResolver=object)
        _stub_module("a2a.helpers")
        _stub_module(
            "a2a.helpers.proto_helpers",
            get_artifact_text=lambda artifact: None,
            get_message_text=lambda message: None,
        )
        _stub_module(
            "a2a.types",
            Message=object,
            Part=object,
            Role=_Role,
            SendMessageRequest=object,
            TaskState=_TaskState,
        )


def _load_invoke():
    _install_stubs_if_missing()
    spec = importlib.util.spec_from_file_location(
        "mr_change_summary_invoke", MODULE_PATH
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    invoke = _load_invoke()

    # failure_reason_line: exact tagged format from the bar.
    line = invoke.failure_reason_line("agent-unreachable", "agent card fetch failed")
    assert line == (
        "=== mr-change-summary failed: agent-unreachable"
        " — agent card fetch failed ==="
    ), line

    # Every reason round-trips through the same format.
    for reason in EXPECTED_EXIT_CODES:
        line = invoke.failure_reason_line(reason, "some detail")
        assert line == (
            f"=== mr-change-summary failed: {reason} — some detail ==="
        ), line

    # exit_code_for: invocation-side 1, verification-side 2, all seven reasons.
    for reason, code in EXPECTED_EXIT_CODES.items():
        assert invoke.exit_code_for(reason) == code, reason

    # DEBUG_TRACEBACKS gate (default off; 1/true/yes turn it on).
    assert not invoke._env_truthy("")
    assert not invoke._env_truthy("0")
    assert not invoke._env_truthy("off")
    assert invoke._env_truthy("1")
    assert invoke._env_truthy("True")
    assert invoke._env_truthy(" YES ")

    print("mr_change_summary_invoke_test: all assertions passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
