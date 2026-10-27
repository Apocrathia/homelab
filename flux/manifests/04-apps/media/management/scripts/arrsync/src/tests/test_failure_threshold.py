"""Failure-threshold behavior for arrsync.sync_all."""

import arrsync


class _AlwaysFailsRefresh(arrsync.ArrClient):
    """Concrete client whose refresh always fails; nothing else runs."""

    def __init__(self):
        super().__init__(arrsync.ArrConfig(name="Fake", url="http://fake", api_key="k", api_version="v3"))

    def list_items(self):
        return [{"id": i, "title": f"item-{i}"} for i in range(20)]

    def refresh_item(self, item_id: int) -> bool:
        return False

    def rename_item(self, item_id: int) -> bool:
        return True

    def get_rename_previews(self, item_id: int) -> list:
        return []

    def _get_item_name(self, item: dict) -> str:
        return item["title"]


def test_sync_all_aborts_at_threshold(monkeypatch):
    monkeypatch.setattr(arrsync, "FAILURE_THRESHOLD", 3)
    result = _AlwaysFailsRefresh().sync_all()
    assert result.aborted
    assert result.failure_count == 3


def test_sync_all_below_threshold_tolerated(monkeypatch):
    monkeypatch.setattr(arrsync, "FAILURE_THRESHOLD", 50)
    result = _AlwaysFailsRefresh().sync_all()
    assert not result.aborted
    assert result.failure_count == 20
