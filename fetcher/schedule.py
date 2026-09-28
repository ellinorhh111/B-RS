"""Når skal data hentes?

launchd starter skriptet hvert 5. minutt hele døgnet (launchd støtter ikke
ulike intervaller til ulike tider). Denne modulen avgjør om kjøringen
faktisk skal hente data:

  * åpningstid (man–fre 09:00–17:30 norsk tid, ikke børsfridag): hver gang
  * ellers: bare hvis det er gått minst ~60 minutter siden siste henting

Oslo og Stockholm har samme tidssone og nesten samme åpningstid. Vi regner
det som åpningstid hvis MINST én av børsene er åpen.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

OSLO = ZoneInfo("Europe/Oslo")
OPEN = time(9, 0)
CLOSE = time(17, 30)
LAUNCHD_INTERVAL = timedelta(minutes=5)
OFF_HOURS_INTERVAL = timedelta(minutes=60)
# Litt slakk så en kjøring som starter 59:50 etter forrige ikke hoppes over.
SLACK = timedelta(minutes=2)
# Hvor lenge etter forventet neste kjøring widgeten venter før «utdatert».
STALE_GRACE = timedelta(minutes=10)


def _easter(year: int) -> date:
    """Påskedag (gregoriansk), «Anonymous Gregorian algorithm»."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l_ = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l_) // 451
    month, day = divmod(h + l_ - 7 * m + 114, 31)
    return date(year, month, day + 1)


def holidays_oslo(year: int) -> set[date]:
    e = _easter(year)
    return {
        date(year, 1, 1), e - timedelta(days=3), e - timedelta(days=2), e + timedelta(days=1),
        date(year, 5, 1), date(year, 5, 17), e + timedelta(days=39), e + timedelta(days=50),
        date(year, 12, 24), date(year, 12, 25), date(year, 12, 26), date(year, 12, 31),
    }


def holidays_stockholm(year: int) -> set[date]:
    e = _easter(year)
    # Midtsommeraften: fredagen mellom 19. og 25. juni.
    midsummer_eve = next(date(year, 6, d) for d in range(19, 26) if date(year, 6, d).weekday() == 4)
    return {
        date(year, 1, 1), date(year, 1, 6), e - timedelta(days=2), e + timedelta(days=1),
        date(year, 5, 1), e + timedelta(days=39), date(year, 6, 6), midsummer_eve,
        date(year, 12, 24), date(year, 12, 25), date(year, 12, 26), date(year, 12, 31),
    }


def is_trading_day(d: date) -> bool:
    if d.weekday() >= 5:
        return False
    return d not in holidays_oslo(d.year) or d not in holidays_stockholm(d.year)


def is_market_hours(now: datetime) -> bool:
    local = now.astimezone(OSLO)
    return is_trading_day(local.date()) and OPEN <= local.time() <= CLOSE


def should_run(now: datetime, last_run: datetime | None, force: bool = False) -> tuple[bool, str]:
    if force:
        return True, "tvunget (--force)"
    if last_run is None:
        return True, "første kjøring"
    if is_market_hours(now):
        return True, "åpningstid"
    if now - last_run >= OFF_HOURS_INTERVAL - SLACK:
        return True, "utenfor åpningstid, ≥ 60 min siden sist"
    return False, "utenfor åpningstid, < 60 min siden sist"


def next_expected_run(now: datetime) -> datetime:
    """Simulerer launchd-tikkene framover og finner første som faktisk henter."""
    t = now
    for _ in range(12 * 24):
        t = t + LAUNCHD_INTERVAL
        if should_run(t, now)[0]:
            return t
    return now + OFF_HOURS_INTERVAL


def stale_after(now: datetime) -> datetime:
    """Tidspunkt da widgeten skal si at data er utdatert hvis ingen ny henting har skjedd."""
    return next_expected_run(now) + STALE_GRACE
