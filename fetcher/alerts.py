"""macOS-varsler (Varslingssenteret) for mine selskaper.

Varsles:
  1. Dagsbevegelse over ±3 %            – én gang per selskap, retning og dag
  2. Ny børsmelding                      – én gang per melding (bare meldinger < 24 t gamle)
  3. Nytt kursmålforslag fra en overskrift – én gang per forslag
  4. Kursen krysser mitt kursmål eller meglersnittet – én gang per retning og dag

Krysning: kursen har krysset kursmålet K mellom forrige kjøring (kurs P0) og nå (P1) hvis
  (P0 − K) × (P1 − K) < 0,  dvs. P0 og P1 ligger på hver sin side av K.
  Eksempel: K = 440, P0 = 437, P1 = 442 → (−3) × (+2) = −6 < 0 → krysset oppover.

Varsler som allerede er sendt, lagres i SQLite (tabellen alerts_sent), så de ikke gjentas.
Varslene sendes med «osascript», som er innebygd i macOS (ingen ekstra programmer).
"""
from __future__ import annotations

import logging
import subprocess
import sys
from datetime import datetime, timedelta

from . import schedule
from .store import Store

log = logging.getLogger(__name__)

MOVE_THRESHOLD_PCT = 3.0
MAX_PER_RUN = 6  # flere enn dette samles i ett sammendrag, så du ikke får en flom


def _as_string(s: str) -> str:
    """Tekst som trygg AppleScript-streng (escaper \\ og ")."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def notify(title: str, message: str, subtitle: str = "") -> None:
    """Sender et varsel til macOS Varslingssenter. På andre systemer logges det bare."""
    log.info("VARSEL: %s – %s %s", title, subtitle, message)
    if sys.platform != "darwin":
        return
    script = f"display notification {_as_string(message[:240])} with title {_as_string(title[:80])}"
    if subtitle:
        script += f" subtitle {_as_string(subtitle[:120])}"
    script += ' sound name "default"'
    try:
        subprocess.run(["osascript", "-e", script], check=False, timeout=10, capture_output=True)
    except (OSError, subprocess.SubprocessError) as e:
        log.warning("Kunne ikke sende varsel: %s", e)


def _no(v: float, d: int = 2) -> str:
    """Norsk tallformat: 1234.5 → «1 234,50»."""
    return f"{v:,.{d}f}".replace(",", " ").replace(".", ",")


def _crossed(p0: float | None, p1: float | None, k: float | None) -> str | None:
    if p0 is None or p1 is None or not k:
        return None
    if (p0 - k) * (p1 - k) < 0 or (p0 != k and p1 == k):
        return "opp" if p1 >= k else "ned"
    return None


def collect(data: dict, new_filings: list[dict], new_suggestions: list, store: Store,
            now: datetime) -> list[tuple[str, str, str, str]]:
    """Returnerer varsler som (nøkkel, tittel, undertittel, tekst). Nøkkelen hindrer gjentakelse."""
    day = now.astimezone(schedule.OSLO).date().isoformat()
    names = {c["ticker"]: c["navn"] for c in data.get("selskaper", [])}
    out = []
    for c in data.get("selskaper", []):
        t, chg, price = c["ticker"], c.get("endring_pct"), c.get("kurs")
        if chg is not None and abs(chg) >= MOVE_THRESHOLD_PCT:
            d = "opp" if chg > 0 else "ned"
            out.append((f"move|{t}|{day}|{d}", f"{c['navn']} {'+' if chg > 0 else '−'}{_no(abs(chg), 1)} %",
                        "Stor bevegelse i dag", f"Kurs {_no(price)} {c.get('valuta') or ''}".strip()))
        prev = store.get_meta(f"alert_price|{t}")
        p0 = float(prev) if prev else None
        for label, k in (("mitt kursmål", (c.get("mitt") or {}).get("kursmal")),
                         ("meglersnittet", (c.get("megler") or {}).get("snitt"))):
            d = _crossed(p0, price, k)
            if d:
                out.append((f"cross|{t}|{label}|{d}|{day}", f"{c['navn']} krysset {label}",
                            f"{'Opp' if d == 'opp' else 'Ned'} gjennom {_no(k)}", f"Kurs nå {_no(price)}"))
        if price is not None:
            store.set_meta(f"alert_price|{t}", str(price))
    for f in new_filings:
        pub = f.get("published")
        if f.get("ticker") in names and (pub is None or now - pub < timedelta(hours=24)):
            out.append((f"filing|{f['id']}", f"BØRSMELDING: {names[f['ticker']]}", f.get("source") or "",
                        f["title"]))
    for s in new_suggestions:
        pub = datetime.fromisoformat(s.publisert) if s.publisert else None
        if pub is not None and now - pub > timedelta(days=3):
            continue  # gamle overskrifter (f.eks. ved første kjøring) varsles ikke
        out.append((f"sugg|{s.id}", f"Kursmålforslag: {names.get(s.ticker, s.ticker)}",
                    f"{s.meglerhus or 'Ukjent meglerhus'} {s.retning or ''} til {_no(s.kursmal)}".replace("  ", " "),
                    s.tittel))
    return out


def send(alerts: list[tuple[str, str, str, str]], store: Store, now: datetime) -> int:
    """Sender varsler som ikke er sendt før. Returnerer antall sendt."""
    fresh = [a for a in alerts if not store.alert_sent(a[0])]
    for key, *_ in fresh:
        store.mark_alert(key, now)
    if len(fresh) > MAX_PER_RUN:
        notify("Portefølje", f"{len(fresh)} nye hendelser – se widgeten", ", ".join(a[1] for a in fresh[:3]) + " …")
        return len(fresh)
    for _, title, subtitle, message in fresh:
        notify(title, message, subtitle)
    return len(fresh)
