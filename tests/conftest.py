import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def root(tmp_path, monkeypatch):
    """Isolert prosjektmappe med standardfilene kopiert inn."""
    monkeypatch.setenv("PORTEFOLJE_ROOT", str(tmp_path))
    from fetcher import paths

    paths.ensure_dirs()
    return tmp_path
