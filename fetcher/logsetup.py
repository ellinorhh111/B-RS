from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler

from . import paths


def setup(verbose: bool = False) -> None:
    paths.ensure_dirs()
    fmt = logging.Formatter("%(asctime)s %(levelname)-7s %(name)s: %(message)s")
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    fh = RotatingFileHandler(paths.log_path(), maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    fh.setFormatter(fmt)
    fh.setLevel(logging.DEBUG)
    root.addHandler(fh)
    sh = logging.StreamHandler(sys.stderr)
    sh.setFormatter(fmt)
    sh.setLevel(logging.INFO if verbose else logging.WARNING)
    root.addHandler(sh)
    # Egne moduler logger detaljer (tracebacks) til fil på DEBUG-nivå.
    logging.getLogger("fetcher").setLevel(logging.DEBUG)
    # yfinance er svært pratsom; vi logger feilene selv.
    logging.getLogger("yfinance").setLevel(logging.CRITICAL)
