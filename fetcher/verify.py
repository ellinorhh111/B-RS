"""Sjekker at hver ticker i portfolio.csv gir data for RIKTIG selskap.

Sjekker per ticker:
  1. Kursleverandøren har data (navn og kurs)
  2. Valuta stemmer med kolonnen «valuta»
  3. Børs stemmer med suffikset (.OL = Oslo, .ST = Stockholm)
  4. Navnet hos leverandøren ligner navnet i portfolio.csv
  5. Forvekslingsvern: Yahoo-navnet inneholder «SpareBank 1» uten at ditt navn gjør det
     (fanger f.eks. SB1NO = SpareBank 1 Sør-Norge i stedet for Sparebanken Norge)
  6. Kursen er fersk (siste handel innen 7 dager)

Rapporten skrives også til data/verify_report.txt så den er lett å lime inn.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import timedelta

from . import paths
from .csvio import Holding, read_portfolio
from .sources import PriceSource, get_price_source
from .sources.prices_base import TickerInfo
from .store import utcnow

EXCHANGE_BY_SUFFIX = {".OL": ("oslo", "osl"), ".ST": ("stockholm", "sto")}
STOPWORDS = {"asa", "ab", "publ", "the", "group", "holding", "bank", "as", "ltd"}


def _words(s: str) -> list[str]:
    s = unicodedata.normalize("NFC", s or "").lower()
    return [w for w in re.findall(r"[\wæøåäö]+", s) if w not in STOPWORDS]


def check(h: Holding, info: TickerInfo) -> list[tuple[bool, str]]:
    res: list[tuple[bool, str]] = []
    res.append((info.found, "data funnet" if info.found else f"ingen data: {info.error}"))
    if not info.found and not info.name:
        return res

    if h.valuta:
        ok = (info.currency or "").upper() == h.valuta
        res.append((ok, f"valuta {info.currency} (forventet {h.valuta})"))

    suffix = "." + h.ticker.rsplit(".", 1)[-1] if "." in h.ticker else ""
    expected = EXCHANGE_BY_SUFFIX.get(suffix)
    if expected:
        ex = (info.exchange or "").lower()
        ok = any(e in ex for e in expected)
        res.append((ok, f"børs «{info.exchange}» (forventet {expected[0].title()})"))
    else:
        res.append((False, f"ukjent suffiks {suffix!r} – bare .OL og .ST er støttet"))

    mine, theirs = _words(h.navn), set(_words(info.name or ""))
    hits = [w for w in mine if w in theirs]
    ok = bool(mine) and mine[0] in theirs and len(hits) >= max(1, len(mine) // 2)
    res.append((ok, f"navn «{info.name}» vs «{h.navn}»"))

    their_name = (info.name or "").lower()
    if "sparebank 1" in their_name and "sparebank 1" not in h.navn.lower():
        res.append((False, "FORVEKSLING: Yahoo-navnet er en SpareBank 1-bank, men ditt navn er ikke det"))

    if info.market_time:
        age = utcnow() - info.market_time
        res.append((age < timedelta(days=7), f"siste kurs {info.price} {info.currency} "
                    f"({info.market_time:%Y-%m-%d %H:%M} UTC)"))
    return res


def verify_portfolio(source: PriceSource | None = None) -> int:
    paths.ensure_dirs()
    source = source or get_price_source()
    holdings = read_portfolio(paths.config_dir() / "portfolio.csv")
    lines = [f"Verifisering mot {source.name} – {utcnow():%Y-%m-%d %H:%M} UTC", ""]
    all_ok = True
    for h in holdings:
        info = source.describe(h.ticker)
        results = check(h, info)
        ticker_ok = all(ok for ok, _ in results)
        all_ok &= ticker_ok
        lines.append(f"{'✓' if ticker_ok else '✗'} {h.ticker}  ({h.navn})")
        lines += [f"    {'ok ' if ok else 'FEIL'}  {msg}" for ok, msg in results]
        lines.append("")
    lines.append("ALLE TICKERE OK" if all_ok else "NOEN TICKERE FEILET – se over")
    report = "\n".join(lines)
    print(report)
    (paths.data_dir() / "verify_report.txt").write_text(report + "\n", encoding="utf-8")
    return 0 if all_ok else 1
