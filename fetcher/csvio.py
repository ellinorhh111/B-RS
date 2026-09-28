"""Lesing og skriving av CSV-filene du redigerer selv (Excel/Numbers).

Norsk Excel og Numbers bruker ofte semikolon som skilletegn og komma som
desimaltegn. Vi LESER derfor begge varianter (skilletegn gjettes fra
overskriftsraden) og SKRIVER alltid semikolon + UTF-8 med BOM, slik at
Excel på Mac viser æ/ø/å riktig når filen dobbeltklikkes.
"""
from __future__ import annotations

import csv
import io
import logging
import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

log = logging.getLogger(__name__)

WRITE_DELIMITER = ";"
EMPTY_MARKERS = {"", "-", "–", "—", "n/a", "na"}


def _norm(s: str) -> str:
    # macOS kan lagre «ø» som o + kombinerende tegn (NFD). NFC gjør at
    # «mitt_kursmål» alltid matcher, uansett hvilket program som lagret filen.
    return unicodedata.normalize("NFC", s).strip()


def _sniff_delimiter(header_line: str) -> str:
    counts = {d: header_line.count(d) for d in (";", ",", "\t")}
    return max(counts, key=counts.get) if max(counts.values()) > 0 else WRITE_DELIMITER


def read_rows(path: Path) -> list[dict[str, str]]:
    """Leser en CSV-fil til en liste av dict med normaliserte kolonnenavn (små bokstaver).

    Tomme rader og rader som starter med # hoppes over.
    """
    text = path.read_text(encoding="utf-8-sig")
    lines = [ln for ln in text.splitlines() if ln.strip() and not ln.lstrip().startswith("#")]
    if not lines:
        return []
    delim = _sniff_delimiter(lines[0])
    reader = csv.reader(io.StringIO("\n".join(lines)), delimiter=delim)
    header = [_norm(h).lower() for h in next(reader)]
    rows = []
    for raw in reader:
        if not any(c.strip() for c in raw):
            continue
        raw = raw + [""] * (len(header) - len(raw))
        rows.append({h: _norm(v) for h, v in zip(header, raw)})
    return rows


def append_row(path: Path, header: list[str], row: dict[str, object]) -> None:
    """Legger til én rad. Oppretter filen med overskrift hvis den ikke finnes.

    Bruker samme skilletegn som filen allerede har, slik at en fil du har
    lagret fra Excel med komma ikke blir blandet.
    """
    delim = WRITE_DELIMITER
    if path.exists() and path.stat().st_size > 0:
        first = path.read_text(encoding="utf-8-sig").splitlines()[0]
        delim = _sniff_delimiter(first)
        needs_newline = not path.read_bytes().endswith(b"\n")
        with path.open("a", encoding="utf-8", newline="") as f:
            if needs_newline:
                f.write("\n")
            csv.writer(f, delimiter=delim).writerow([_fmt(row.get(h)) for h in header])
    else:
        with path.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f, delimiter=delim)
            w.writerow(header)
            w.writerow([_fmt(row.get(h)) for h in header])


def _fmt(v: object) -> str:
    if v is None:
        return ""
    if isinstance(v, float):
        # Skriv desimalkomma, som norsk Excel forventer.
        return f"{v:.2f}".rstrip("0").rstrip(".").replace(".", ",")
    if isinstance(v, (date, datetime)):
        return v.strftime("%Y-%m-%d")
    return str(v)


def parse_number(s: str | None) -> float | None:
    """Tolker «1 234,50», «1234.5», «kr 120», «–» osv. Tom/ugyldig → None."""
    if s is None:
        return None
    t = s.strip().lower()
    if t in EMPTY_MARKERS:
        return None
    t = re.sub(r"[\s  ]|kr|nok|sek|%", "", t)
    if "," in t and "." in t:
        # Det siste skilletegnet er desimaltegnet: 1.234,5 eller 1,234.5
        if t.rfind(",") > t.rfind("."):
            t = t.replace(".", "").replace(",", ".")
        else:
            t = t.replace(",", "")
    else:
        t = t.replace(",", ".")
    try:
        return float(t)
    except ValueError:
        log.warning("Klarte ikke å tolke tallet %r – behandles som tomt", s)
        return None


def parse_date(s: str | None) -> date | None:
    """Godtar 2026-09-28, 28.09.2026, 28/09/2026 og 28.09.26. Tom → None."""
    if not s or s.strip() in EMPTY_MARKERS:
        return None
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%d.%m.%y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            pass
    log.warning("Klarte ikke å tolke datoen %r – behandles som tom", s)
    return None


@dataclass
class Holding:
    ticker: str
    navn: str
    bors: str
    valuta: str
    mitt_kursmal: float | None
    dato_kursmal: date | None
    kommentar: str


def read_portfolio(path: Path) -> list[Holding]:
    out = []
    for r in read_rows(path):
        ticker = r.get("ticker", "").upper()
        if not ticker:
            continue
        out.append(
            Holding(
                ticker=ticker,
                navn=r.get("navn") or ticker,
                bors=r.get("børs", ""),
                valuta=(r.get("valuta") or "").upper(),
                mitt_kursmal=parse_number(r.get("mitt_kursmål")),
                dato_kursmal=parse_date(r.get("dato_kursmål")),
                kommentar=r.get("kommentar", ""),
            )
        )
    return out
