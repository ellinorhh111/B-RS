"""Finn og verifiser peers (banker og forsikring på Oslo Børs og Nasdaq Stockholm).

`python -m fetcher peers finn`:
  1. Oslo: henter alle Newsweb-meldinger siste 90 dager og plukker ut utstedere med
     bank/sparebank/forsikring i navnet. Newsweb er Oslo Børs' egen kanal, så listen
     blir komplett (også små sparebanker med egenkapitalbevis). Rene obligasjons-
     utstedere (boligkreditt o.l.) sorteres bort, og de som ikke har aksje/EK-bevis
     hos Yahoo faller ut i steg 3.
  2. Stockholm: fast kandidatliste (ingen tilsvarende åpen kilde), se STOCKHOLM_CANDIDATES.
  3. Hver kandidat sjekkes mot Yahoo: finnes den, riktig valuta/børs, hvilke nøkkeltall finnes.

Resultatet skrives til data/peers_forslag.csv og data/peers_rapport.txt. Ingenting
tas i bruk før du har godkjent listen (den blir da config/peers.csv).
"""
from __future__ import annotations

import csv
import io
import logging
import re
from dataclasses import dataclass
from datetime import timedelta

from . import paths
from .csvio import BOM, read_portfolio
from .sources import filings, get_price_source
from .sources.prices_base import Fundamentals
from .store import utcnow

log = logging.getLogger(__name__)

DISCOVERY_DAYS = 90

RE_FINANCIAL = re.compile(r"spare\s?bank|\bbank\b|bank asa|forsikring|insurance|assurance|storebrand|gjensidige", re.I)
RE_BOND_ONLY = re.compile(r"boligkreditt|næringskreditt|naeringskreditt|kredittforetak|eiendomskreditt|covered", re.I)
RE_INSURANCE = re.compile(r"forsikring|insurance|assurance|storebrand|gjensidige|försäkring|sampo", re.I)
RE_CONSUMER = re.compile(r"instabank|lea bank|morrow|komplett|monobank|bra ?bank|norwegian|nordax|tf bank|resurs|"
                         r"qliro|norion|collector|noba", re.I)

# Stockholm: ticker, navn, type, merknad («?» = usikker på ticker/notering/type).
STOCKHOLM_CANDIDATES = [
    ("SHB-A.ST", "Handelsbanken A", "bank", ""),
    ("SEB-A.ST", "SEB A", "bank", ""),
    ("SWED-A.ST", "Swedbank A", "bank", ""),
    ("NDA-SE.ST", "Nordea Bank", "bank", ""),
    ("AZA.ST", "Avanza Bank", "bank", "? nettmegler med banklisens"),
    ("SAVE.ST", "Nordnet", "bank", "? nettmegler med banklisens"),
    ("NORION.ST", "Norion Bank", "bank", ""),
    ("TFBANK.ST", "TF Bank", "forbruksbank", ""),
    ("RESURS.ST", "Resurs Holding", "forbruksbank", "? kan være avnotert etter oppkjøp"),
    ("QLIRO.ST", "Qliro", "forbruksbank", "?"),
    ("HOFI.ST", "Hoist Finance", "forbruksbank", "? inkasso/porteføljekjøp, ikke forbruksbank"),
    ("SFAB.ST", "Solid Försäkring", "forsikring", "? ticker"),
    ("SAMPO.ST", "Sampo", "forsikring", "? usikker på notering i Stockholm"),
    ("ALBBV.ST", "Ålandsbanken", "bank", "? trolig bare notert i Helsingfors"),
]


@dataclass
class Candidate:
    ticker: str
    navn: str
    bors: str
    type: str
    kilde: str
    merknad: str = ""
    f: Fundamentals | None = None
    feil: str | None = None

    @property
    def ok(self) -> bool:
        f = self.f
        want = "NOK" if self.ticker.endswith(".OL") else "SEK"
        return bool(f and f.price and f.currency == want and (f.quote_type in (None, "EQUITY")))


def classify(name: str) -> str:
    if RE_INSURANCE.search(name):
        return "forsikring"
    if RE_CONSUMER.search(name):
        return "forbruksbank"
    return "bank"


def oslo_candidates() -> list[Candidate]:
    today = utcnow().date()
    msgs = filings._fetch_period(today - timedelta(days=DISCOVERY_DAYS), today)
    by_sign: dict[str, str] = {}
    for m in msgs:
        by_sign.setdefault(m["sign"], m.get("utsteder") or "")
    out = []
    for sign, name in sorted(by_sign.items()):
        if not name or not RE_FINANCIAL.search(name) or RE_BOND_ONLY.search(name):
            continue
        out.append(Candidate(f"{sign}.OL", name, "Oslo Børs", classify(name), "Newsweb"))
    return out


def discover() -> int:
    paths.ensure_dirs()
    mine = {h.ticker for h in read_portfolio(paths.config_dir() / "portfolio.csv")}
    lines = [f"Peer-søk – {utcnow():%Y-%m-%d %H:%M} UTC", ""]
    try:
        cands = oslo_candidates()
        lines.append(f"Oslo: {len(cands)} finansutstedere funnet på Newsweb siste {DISCOVERY_DAYS} dager")
    except Exception as e:  # noqa: BLE001
        log.exception("Newsweb-søk feilet")
        cands = []
        lines.append(f"Oslo: Newsweb-søk feilet ({e}) – ingen Oslo-kandidater")
    cands += [Candidate(t, n, "Nasdaq Stockholm", ty, "kandidatliste", m) for t, n, ty, m in STOCKHOLM_CANDIDATES]
    cands = [c for c in cands if c.ticker not in mine]

    src = get_price_source()
    found, errors = src.fundamentals([c.ticker for c in cands])
    for c in cands:
        c.f, c.feil = found.get(c.ticker), errors.get(c.ticker)

    def pct(v):
        return "–" if v is None else f"{v * 100:.1f}%"

    def num(v):
        return "–" if v is None else f"{v:.2f}"

    ok = [c for c in cands if c.ok]
    bad = [c for c in cands if not c.ok]
    lines += [f"Verifisert mot Yahoo: {len(ok)} OK, {len(bad)} ikke funnet/feil", "",
              "OK (foreslått som peers):",
              f"  {'ticker':<11} {'type':<12} {'P/B':>5} {'P/E':>6} {'dir.avk':>7} {'ROE':>6}  navn (Yahoo) / merknad"]
    for c in sorted(ok, key=lambda c: (c.bors, c.type, c.ticker)):
        f = c.f
        lines.append(f"  {c.ticker:<11} {c.type:<12} {num(f.pb):>5} {num(f.pe):>6} {pct(f.div_yield):>7} {pct(f.roe):>6}"
                     f"  {f.name}{'  ' + c.merknad if c.merknad else ''}")
    lines += ["", "IKKE FUNNET / FEIL (tas ikke med):"]
    for c in bad:
        why = c.feil or (f"valuta {c.f.currency}, type {c.f.quote_type}" if c.f else "ukjent")
        lines.append(f"  {c.ticker:<11} {c.navn[:40]:<40} {why}{'  ' + c.merknad if c.merknad else ''}")

    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";", lineterminator="\n")
    w.writerow(["ticker", "navn", "børs", "type", "merknad"])
    for c in sorted(ok, key=lambda c: (c.bors, c.type, c.ticker)):
        w.writerow([c.ticker, c.f.name or c.navn, c.bors, c.type, c.merknad])
    (paths.data_dir() / "peers_forslag.csv").write_bytes(BOM + buf.getvalue().encode("utf-8"))
    report = "\n".join(lines)
    print(report)
    (paths.data_dir() / "peers_rapport.txt").write_text(report + "\n", encoding="utf-8")
    return 0
