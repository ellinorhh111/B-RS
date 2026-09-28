"""peers.csv og overrides.csv.

peers.csv    ticker; navn; børs; type (bank/forbruksbank/forsikring); ekb (ja/nei); merknad
overrides.csv ticker; eierbrøk; pb; pe; direkteavkastning; roe; dato; kommentar

«ekb» = egenkapitalbevis (sparebank med grunnfond). For disse er Yahoos P/B og P/E
feil, se calc.adjust_equity_certificate(). Eierbrøken legger du inn i overrides.csv.
Alle kolonner i overrides.csv unntatt ticker kan stå tomme.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from .csvio import parse_date, parse_number, read_rows

TYPES = ("bank", "forbruksbank", "forsikring")
_EKB_NAME = re.compile(r"spare\s?bank", re.I)


def looks_like_equity_certificate(name: str) -> bool:
    """Sparebank som IKKE er ASA har egenkapitalbevis (f.eks. «SpareBank 1 SMN», «Sparebanken Norge»).
    Sparebanker som er omdannet til ASA har vanlige aksjer («Bien Sparebank ASA», «SpareBank 1 Sør-Norge ASA»).
    Dette er en tommelfingerregel – kolonnen ekb i peers.csv kan overstyre den."""
    return bool(_EKB_NAME.search(name or "")) and not re.search(r"\bASA\b", name or "")


@dataclass
class Peer:
    ticker: str
    navn: str
    bors: str
    type: str
    ekb: bool
    merknad: str


@dataclass
class Override:
    ticker: str
    eierbrok: float | None  # brøk, 0,645 = 64,5 %
    pb: float | None
    pe: float | None
    div_yield: float | None  # brøk
    roe: float | None  # brøk
    dato: str | None
    kommentar: str


def _fraction(s: str | None) -> float | None:
    """«64,5 %», «64,5» og «0,645» → 0,645. Med %-tegn, eller tall over 1, tolkes som prosent."""
    v = parse_number(s)
    if v is None:
        return None
    return v / 100 if ("%" in (s or "") or v > 1) else v


def _yes(s: str | None) -> bool | None:
    t = (s or "").strip().lower()
    if t in ("ja", "j", "yes", "y", "1", "x"):
        return True
    if t in ("nei", "n", "no", "0"):
        return False
    return None


def read_peers(path: Path) -> list[Peer]:
    if not path.exists():
        return []
    out = []
    for r in read_rows(path):
        t = (r.get("ticker") or "").upper()
        typ = (r.get("type") or "bank").lower()
        if not t or typ not in TYPES:
            continue
        navn = r.get("navn") or t
        ekb = _yes(r.get("ekb"))
        out.append(Peer(t, navn, r.get("bors", ""), typ,
                        looks_like_equity_certificate(navn) if ekb is None else ekb, r.get("merknad", "")))
    return out


def read_overrides(path: Path) -> dict[str, Override]:
    if not path.exists():
        return {}
    out = {}
    for r in read_rows(path):
        t = (r.get("ticker") or "").upper()
        if not t:
            continue
        d = parse_date(r.get("dato"))
        out[t] = Override(t, _fraction(r.get("eierbrok")), parse_number(r.get("pb")), parse_number(r.get("pe")),
                          _fraction(r.get("direkteavkastning")), _fraction(r.get("roe")),
                          d.isoformat() if d else None, r.get("kommentar", ""))
    return out
