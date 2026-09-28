"""Kommandolinje:

  python -m fetcher run [--force]   hent data (launchd bruker denne)
  python -m fetcher verify          sjekk at tickerne i portfolio.csv gir riktige data
  python -m fetcher export          skriv data.json på nytt fra cache (uten nett)
"""
from __future__ import annotations

import argparse
import fcntl
import logging
from datetime import datetime

from . import export, logsetup, paths, schedule
from .csvio import Holding, read_portfolio
from .sources import PriceSource, get_price_source
from .store import Store, utcnow

log = logging.getLogger("fetcher")


def load_holdings(store: Store, now: datetime, errors: list[str]) -> list[Holding]:
    try:
        holdings = read_portfolio(paths.config_dir() / "portfolio.csv")
        store.set_source_status("portfolio.csv", True, now)
        return holdings
    except Exception as e:  # noqa: BLE001
        log.exception("Kunne ikke lese portfolio.csv")
        store.set_source_status("portfolio.csv", False, now, str(e))
        errors.append(f"portfolio.csv: {e}")
        return []


def run(force: bool = False, source: PriceSource | None = None, now: datetime | None = None) -> int:
    now = now or utcnow()
    store = Store(paths.db_path())
    ok, reason = schedule.should_run(now, store.last_run(), force)
    if not ok:
        log.info("Hopper over: %s", reason)
        return 0
    log.info("Starter henting (%s)", reason)

    errors: list[str] = []
    holdings = load_holdings(store, now, errors)
    tickers = [h.ticker for h in holdings]

    if tickers:
        source = source or get_price_source()
        try:
            quotes, qerrors = source.quotes(tickers)
            store.save_quotes(quotes, source.name, now)
            for t, msg in qerrors.items():
                errors.append(f"{source.name} {t}: {msg}")
            if quotes:
                store.set_source_status(source.name, True, now,
                                        "; ".join(f"{t}: {m}" for t, m in qerrors.items()) or None)
            else:
                first = next(iter(qerrors.values()), "ingen kurser hentet")
                store.set_source_status(source.name, False, now, first)
            log.info("Kurser: %d ok, %d feilet", len(quotes), len(qerrors))
        except Exception as e:  # noqa: BLE001 – vis siste kjente data i stedet for å krasje
            log.exception("Kurskilden feilet")
            store.set_source_status(source.name, False, now, f"{type(e).__name__}: {e}")
            errors.append(f"{source.name}: {e}")

    store.set_last_run(now)
    export.write(export.build(store, holdings, now, errors), paths.json_path())
    log.info("data.json skrevet (%d feil)", len(errors))
    return 0


def export_only() -> int:
    now = utcnow()
    store = Store(paths.db_path())
    errors: list[str] = []
    holdings = load_holdings(store, now, errors)
    export.write(export.build(store, holdings, now, errors), paths.json_path())
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="fetcher")
    p.add_argument("-v", "--verbose", action="store_true")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="hent data")
    r.add_argument("--force", action="store_true", help="hent uansett tidspunkt")
    sub.add_parser("verify", help="sjekk tickere mot kursleverandøren")
    sub.add_parser("export", help="skriv data.json fra cache")
    args = p.parse_args(argv)

    logsetup.setup(verbose=args.verbose or args.cmd == "verify")

    if args.cmd == "verify":
        from .verify import verify_portfolio

        return verify_portfolio()

    # Lås: hindrer at en manuell kjøring og launchd skriver samtidig.
    lock = open(paths.data_dir() / ".lock", "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        log.warning("En annen kjøring pågår – avslutter")
        return 0
    try:
        return run(force=args.force) if args.cmd == "run" else export_only()
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
        lock.close()
