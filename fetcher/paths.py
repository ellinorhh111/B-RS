"""Filstier. Alt ligger under prosjektmappen (standard ~/portefolje-widget).

Kan overstyres med miljøvariabelen PORTEFOLJE_ROOT (brukes av testene).
"""
from __future__ import annotations

import os
import shutil
from pathlib import Path


def root() -> Path:
    env = os.environ.get("PORTEFOLJE_ROOT")
    return Path(env) if env else Path(__file__).resolve().parent.parent


def defaults_dir() -> Path:
    # Standardfilene ligger alltid i koden, uavhengig av PORTEFOLJE_ROOT.
    return Path(__file__).resolve().parent.parent / "defaults"


def config_dir() -> Path:
    return root() / "config"


def data_dir() -> Path:
    return root() / "data"


def db_path() -> Path:
    return data_dir() / "portefolje.db"


def json_path() -> Path:
    return data_dir() / "data.json"


def log_path() -> Path:
    return data_dir() / "logs" / "fetcher.log"


def ensure_dirs() -> None:
    """Lager config/ og data/ og kopierer inn standardfiler som mangler.

    Eksisterende filer i config/ røres aldri – de er dine.
    """
    config_dir().mkdir(parents=True, exist_ok=True)
    (data_dir() / "logs").mkdir(parents=True, exist_ok=True)
    for src in defaults_dir().glob("*"):
        dst = config_dir() / src.name
        if src.is_file() and not dst.exists():
            shutil.copy2(src, dst)
