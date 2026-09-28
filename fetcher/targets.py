"""Dine manuelle kursmål fra meglerhusene (config/broker_targets.csv).

Kolonner: dato, ticker, meglerhus, kursmål, anbefaling, forrige_kursmål, notat

Filen kan redigeres i Excel/Numbers ELLER via skjemaet i widgeten
(som kaller `python -m fetcher add-target`). Ugyldige rader hoppes over
og vises som advarsel i widgeten i stedet for å stoppe alt.
"""
from __future__ import annotations

import base64
import fcntl
import json
import unicodedata
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

from . import calc
from .csvio import append_row, parse_date, parse_number, read_rows

HEADER = ["dato", "ticker", "meglerhus", "kursmål", "anbefaling", "forrige_kursmål", "notat"]

# Godtatte skrivemåter for anbefaling → normalisert verdi.
RECOMMENDATIONS = {
    "kjøp": "kjøp", "kjop": "kjøp", "kjøpe": "kjøp", "buy": "kjøp", "köp": "kjøp", "outperform": "kjøp",
    "overweight": "kjøp", "akkumuler": "kjøp", "accumulate": "kjøp",
    "hold": "hold", "nøytral": "hold", "noytral": "hold", "neutral": "hold", "behåll": "hold",
    "market perform": "hold", "equal weight": "hold",
    "selg": "selg", "sell": "selg", "sälj": "selg", "underperform": "selg", "underweight": "selg",
    "reduser": "selg", "reduce": "selg",
}

# Forslag i skjemaet (du kan skrive inn andre navn).
KNOWN_BROKERS = [
    "ABG Sundal Collier", "Arctic Securities", "Carnegie", "Clarksons Securities", "Danske Bank",
    "DNB Carnegie", "Fearnley Securities", "Handelsbanken", "Kepler Cheuvreux", "Nordea",
    "Norne Securities", "Pareto Securities", "Redeye", "SB1 Markets", "SEB", "Swedbank",
]

# Kursmål utenfor dette intervallet (som multiplum av dagens kurs) avvises som trolig tastefeil.
SANITY_MIN, SANITY_MAX = 0.25, 4.0


@dataclass
class BrokerTarget:
    dato: date
    ticker: str
    meglerhus: str
    kursmal: float
    anbefaling: str | None
    forrige: float | None
    notat: str
    row_no: int  # radnummer i filen (brukes som «nyest» ved lik dato)


def _broker_key(name: str) -> str:
    return " ".join(unicodedata.normalize("NFC", name).lower().split())


def normalize_recommendation(s: str | None) -> str | None:
    if not s or not s.strip():
        return None
    return RECOMMENDATIONS.get(s.strip().lower())


def read_targets(path: Path) -> tuple[list[BrokerTarget], list[str]]:
    """Leser filen. Returnerer (gyldige kursmål, advarsler for ugyldige rader)."""
    if not path.exists():
        return [], []
    out, warnings = [], []
    for i, r in enumerate(read_rows(path), start=2):  # rad 1 er overskriften
        problems = []
        d = parse_date(r.get("dato"))
        ticker = (r.get("ticker") or "").upper()
        broker = (r.get("meglerhus") or "").strip()
        target = parse_number(r.get("kursmal"))
        rec_raw = r.get("anbefaling")
        rec = normalize_recommendation(rec_raw)
        if d is None:
            problems.append("mangler/ugyldig dato")
        if not ticker:
            problems.append("mangler ticker")
        if not broker:
            problems.append("mangler meglerhus")
        if target is None or target <= 0:
            problems.append("mangler/ugyldig kursmål")
        if rec_raw and rec is None:
            problems.append(f"ukjent anbefaling «{rec_raw}» (bruk kjøp/hold/selg)")
        fatal = d is None or not ticker or not broker or target is None or target <= 0
        if fatal:
            warnings.append(f"broker_targets.csv rad {i}: {', '.join(problems)} – hoppet over")
            continue
        if problems:  # bare anbefalingen er ugyldig → behold kursmålet
            warnings.append(f"broker_targets.csv rad {i}: {', '.join(problems)}")
        out.append(BrokerTarget(d, ticker, broker, target, rec, parse_number(r.get("forrige_kursmal")),
                                r.get("notat", ""), i))
    return out, warnings


def summarize(targets: list[BrokerTarget], ticker: str, price: float | None, today: date) -> dict:
    """Siste kursmål per meglerhus, meglersnitt, oppside og full historikk for én ticker."""
    mine = [t for t in targets if t.ticker == ticker]
    # Nyest først: dato, deretter radnummer (senere rad = nyere ved samme dato).
    mine.sort(key=lambda t: (t.dato, t.row_no), reverse=True)

    def row(t: BrokerTarget, previous: float | None) -> dict:
        age = (today - t.dato).days
        return {
            "meglerhus": t.meglerhus,
            "kursmal": t.kursmal,
            "anbefaling": t.anbefaling,
            "dato": t.dato.isoformat(),
            "alder_dager": age,
            "gammel": age > calc.OLD_TARGET_DAYS,
            "forrige": previous,
            "endring_pct": calc.to_pct(calc.pct_change(t.kursmal, previous)),
            "oppside_pct": calc.to_pct(calc.upside(t.kursmal, price)),
            "notat": t.notat or None,
        }

    # Forrige kursmål: kolonnen i filen hvis utfylt, ellers meglerhusets forrige rad.
    history, latest = [], {}
    by_broker: dict[str, list[BrokerTarget]] = {}
    for t in mine:
        by_broker.setdefault(_broker_key(t.meglerhus), []).append(t)
    for t in mine:
        rows = by_broker[_broker_key(t.meglerhus)]
        idx = rows.index(t)
        previous = t.forrige if t.forrige is not None else (rows[idx + 1].kursmal if idx + 1 < len(rows) else None)
        r = row(t, previous)
        history.append(r)
        latest.setdefault(_broker_key(t.meglerhus), r)

    latest_rows = sorted(latest.values(), key=lambda r: r["dato"], reverse=True)
    avg = calc.broker_average([r["kursmal"] for r in latest_rows])
    up = calc.upside(avg, price)
    return {
        "snitt": None if avg is None else round(avg, 2),
        "antall": len(latest_rows),
        "antall_ferske": sum(1 for r in latest_rows if not r["gammel"]),
        "oppside_pct": calc.to_pct(up),
        "farge": calc.color(up),
        "siste": latest_rows,
        "historikk": history,
    }


def known_brokers(targets: list[BrokerTarget]) -> list[str]:
    names = {_broker_key(b): b for b in KNOWN_BROKERS}
    for t in targets:
        names.setdefault(_broker_key(t.meglerhus), t.meglerhus)
    return sorted(names.values(), key=str.lower)


def last_target_by_broker(targets: list[BrokerTarget]) -> dict[str, dict[str, float]]:
    """{ticker: {meglerhus: siste kursmål}} – brukes til å forhåndsutfylle «forrige kursmål» i skjemaet."""
    out: dict[str, dict[str, float]] = {}
    for t in sorted(targets, key=lambda t: (t.dato, t.row_no)):
        out.setdefault(t.ticker, {})[t.meglerhus] = t.kursmal
    return out


# --- nytt kursmål fra skjemaet ----------------------------------------------

class TargetError(ValueError):
    pass


def validate_new(payload: dict, tickers: set[str], price: float | None, today: date,
                 existing: list[BrokerTarget]) -> dict:
    """Validerer et nytt kursmål. Returnerer raden som skal skrives, eller kaster TargetError."""
    ticker = str(payload.get("ticker", "")).strip().upper()
    if ticker not in tickers:
        raise TargetError(f"Ukjent ticker «{ticker}» – den må finnes i portfolio.csv")

    broker = " ".join(str(payload.get("meglerhus", "")).split())
    if not broker:
        raise TargetError("Meglerhus mangler")
    if len(broker) > 60:
        raise TargetError("Meglerhus-navnet er for langt (maks 60 tegn)")

    target = parse_number(str(payload.get("kursmal", "")))
    if target is None or target <= 0:
        raise TargetError("Kursmål må være et positivt tall")
    if price and not (SANITY_MIN * price <= target <= SANITY_MAX * price):
        raise TargetError(f"Kursmål {target:g} virker urimelig mot kurs {price:g} – sjekk for tastefeil")

    rec = normalize_recommendation(str(payload.get("anbefaling", "")))
    if payload.get("anbefaling") and rec is None:
        raise TargetError("Anbefaling må være kjøp, hold eller selg")

    d = parse_date(str(payload.get("dato", ""))) if payload.get("dato") else today
    if d is None:
        raise TargetError("Ugyldig dato")
    if d > today + timedelta(days=1):
        raise TargetError("Datoen kan ikke være fram i tid")

    previous = parse_number(str(payload.get("forrige_kursmal", ""))) if payload.get("forrige_kursmal") else None
    note = " ".join(str(payload.get("notat", "")).split())[:300]

    for t in existing:
        if (t.ticker, _broker_key(t.meglerhus), t.dato, t.kursmal) == (ticker, _broker_key(broker), d, target):
            raise TargetError("Dette kursmålet er allerede registrert")

    return {"dato": d, "ticker": ticker, "meglerhus": broker, "kursmål": target,
            "anbefaling": rec or "", "forrige_kursmål": previous, "notat": note}


def add_from_b64(b64: str, path: Path, tickers: set[str], price_lookup, today: date) -> dict:
    """Tar imot skjemadata som base64-kodet JSON (trygt å sende gjennom shell) og skriver raden."""
    try:
        payload = json.loads(base64.b64decode(b64, validate=True).decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError
    except (ValueError, UnicodeDecodeError) as e:
        raise TargetError("Ugyldige skjemadata") from e
    existing, _ = read_targets(path)
    ticker = str(payload.get("ticker", "")).upper()
    row = validate_new(payload, tickers, price_lookup(ticker), today, existing)
    # Lås filen mens vi skriver, i tilfelle to skriveoperasjoner skjer samtidig.
    lock_path = path.with_suffix(".lock")
    with open(lock_path, "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        append_row(path, HEADER, row)
    return row
