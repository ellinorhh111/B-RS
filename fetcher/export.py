"""Skriver data.json som widgeten leser.

Filen skrives atomisk (først til en midlertidig fil, så rename), slik at
widgeten aldri leser en halvskrevet fil.
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

from . import schedule
from .csvio import Holding
from .store import Store, parse_iso

SCHEMA_VERSION = 1

# Visningsnavn for kildene i widgeten.
SOURCE_LABELS = {"yahoo": "Yahoo Finance (kurser)", "portfolio.csv": "portfolio.csv"}


def _round(v: float | None, n: int = 4) -> float | None:
    return None if v is None else round(v, n)


def build(store: Store, holdings: list[Holding], now: datetime, run_errors: list[str]) -> dict:
    companies = []
    for h in holdings:
        row = store.get_quote(h.ticker)
        price = row["price"] if row else None
        prev = row["prev_close"] if row else None
        change = (price - prev) / prev * 100 if price is not None and prev else None
        companies.append({
            "ticker": h.ticker,
            "navn": h.navn,
            "bors": h.bors,
            "valuta": (row["currency"] if row and row["currency"] else h.valuta) or None,
            "kurs": _round(price),
            "forrige_slutt": _round(prev),
            "endring_pct": _round(change, 3),
            "kurstid": row["market_time"] if row else None,
            "hentet": row["fetched_at"] if row else None,
            "kilde": row["source"] if row else None,
            "mitt_kursmal": h.mitt_kursmal,
            "dato_kursmal": h.dato_kursmal.isoformat() if h.dato_kursmal else None,
            "kommentar": h.kommentar or None,
        })

    sources = []
    for s in store.source_statuses():
        sources.append({
            "navn": s["name"],
            "label": SOURCE_LABELS.get(s["name"], s["name"]),
            "ok": bool(s["ok"]),
            "sist_forsok": s["last_attempt"],
            "sist_ok": s["last_ok"],
            "feil": s["error"],
        })

    last_run = parse_iso(store.get_meta("last_run")) or now
    return {
        "schema": SCHEMA_VERSION,
        "generert": now.astimezone(schedule.OSLO).isoformat(timespec="seconds"),
        "siste_henting": last_run.astimezone(schedule.OSLO).isoformat(timespec="seconds"),
        "utdatert_etter": schedule.stale_after(last_run).astimezone(schedule.OSLO).isoformat(timespec="seconds"),
        "apningstid": schedule.is_market_hours(now),
        "selskaper": companies,
        "kilder": sources,
        "feil": run_errors,
    }


def write(data: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, path)
