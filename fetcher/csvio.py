"""Lesing og skriving av CSV-filene du redigerer selv (Excel/Numbers).

Norsk Excel og Numbers bruker ofte semikolon som skilletegn og komma som
desimaltegn. Vi LESER derfor begge varianter (skilletegn gjettes fra
overskriftsraden) og SKRIVER alltid semikolon + UTF-8 med BOM, slik at
Excel på Mac viser æ/ø/å riktig når filen dobbeltklikkes.

Tegnkoding: Excel på Mac kan lagre CSV som UTF-8, Mac Roman eller Windows-1252,
og en UTF-8-fil uten BOM åpnes som Mac Roman («kursmål» vises som «kursm√•l»).
Vi tåler alle disse variantene og reparerer slike ødelagte tegn ved innlesing.
Kolonnenavn sammenlignes uten æ/ø/å, så «kursmål», «kursmal» og «Kursmål» er likt.
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


BOM = b"\xef\xbb\xbf"
NORDIC = set("æøåÆØÅäöÄÖ")
MOJIBAKE_MARKERS = ("√", "Ã", "Â")


def fix_mojibake(s: str) -> str:
    """Reparerer UTF-8 som er lest som Mac Roman/Windows-1252 og lagret på nytt.

    Eksempel: «kursm√•l» → «kursmål», «kjÃ¸p» → «kjøp».
    """
    if not any(m in s for m in MOJIBAKE_MARKERS):
        return s
    for enc in ("mac_roman", "cp1252"):
        try:
            return s.encode(enc).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
    return s


def decode_bytes(b: bytes) -> str:
    """UTF-8 (med/uten BOM) først; ellers den av Mac Roman/Windows-1252 som gir flest æøå."""
    if b.startswith(BOM):
        return b[len(BOM):].decode("utf-8")
    try:
        return b.decode("utf-8")
    except UnicodeDecodeError:
        cands = [b.decode(enc, errors="replace") for enc in ("mac_roman", "cp1252")]
        return max(cands, key=lambda t: sum(ch in NORDIC for ch in t))


def read_text(path: Path) -> str:
    return fix_mojibake(decode_bytes(path.read_bytes()))


def _norm(s: str) -> str:
    # macOS kan lagre «ø» som o + kombinerende tegn (NFD). NFC gjør at
    # «mitt_kursmål» alltid matcher, uansett hvilket program som lagret filen.
    return unicodedata.normalize("NFC", s).strip()


_FOLD = str.maketrans({"å": "a", "ø": "o", "æ": "ae", "ä": "a", "ö": "o"})


def column_key(h: str) -> str:
    """Kolonnenavn → nøkkel uten æ/ø/å/mellomrom: «Mitt kursmål» → «mitt_kursmal»."""
    return "_".join(_norm(h).lower().translate(_FOLD).split())


def normalize_file(path: Path) -> bool:
    """Skriver filen om til UTF-8 med BOM (og reparerer ødelagte æøå) hvis nødvendig.

    Returnerer True hvis filen ble endret. Innholdet ellers røres ikke.
    """
    raw = path.read_bytes()
    text = read_text(path)
    new = BOM + text.encode("utf-8")
    if new == raw:
        return False
    path.write_bytes(new)
    return True


def _sniff_delimiter(header_line: str) -> str:
    counts = {d: header_line.count(d) for d in (";", ",", "\t")}
    return max(counts, key=counts.get) if max(counts.values()) > 0 else WRITE_DELIMITER


def read_rows(path: Path) -> list[dict[str, str]]:
    """Leser en CSV-fil til en liste av dict med kolonnenøkler fra column_key().

    Tomme rader og rader som starter med # hoppes over.
    """
    text = read_text(path)
    lines = [ln for ln in text.splitlines() if ln.strip() and not ln.lstrip().startswith("#")]
    if not lines:
        return []
    delim = _sniff_delimiter(lines[0])
    reader = csv.reader(io.StringIO("\n".join(lines)), delimiter=delim)
    header = [column_key(h) for h in next(reader)]
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
        # Skriv hele filen på nytt som UTF-8 med BOM, slik at Excel alltid åpner den riktig.
        text = read_text(path)
        delim = _sniff_delimiter(text.splitlines()[0])
        if not text.endswith("\n"):
            text += "\n"
        buf = io.StringIO()
        csv.writer(buf, delimiter=delim, lineterminator="\n").writerow([_fmt(row.get(h)) for h in header])
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_bytes(BOM + (text + buf.getvalue()).encode("utf-8"))
        tmp.replace(path)
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
                bors=r.get("bors", ""),
                valuta=(r.get("valuta") or "").upper(),
                mitt_kursmal=parse_number(r.get("mitt_kursmal")),
                dato_kursmal=parse_date(r.get("dato_kursmal")),
                kommentar=r.get("kommentar", ""),
            )
        )
    return out
