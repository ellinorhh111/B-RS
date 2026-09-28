"""Høflig nettverkshenting for nyhetskildene.

* Sjekker robots.txt for hver vert før vi henter noe (RFC 9309, se robots.py).
  Er en adresse ikke tillatt, hentes den ikke, og kilden merkes som
  «ikke tillatt av robots.txt» i widgeten.
* Identifiserer seg med en tydelig User-Agent.
* Korte tidsavbrudd, slik at én treg kilde ikke stopper resten.
"""
from __future__ import annotations

import logging
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit

from . import robots

log = logging.getLogger(__name__)

USER_AGENT = "portefolje-widget/1.0 (personlig bruk; macOS)"
TIMEOUT = 8
ROBOTS_TTL = 24 * 3600  # robots.txt hentes på nytt én gang i døgnet

# vert → (hentet, robots.txt-tekst). "" = ingen robots.txt (alt tillatt); None = alt forbudt.
_robots: dict[str, tuple[float, str | None]] = {}


class NotAllowed(Exception):
    """robots.txt tillater ikke denne adressen."""


class FetchError(Exception):
    pass


def _get(url: str) -> tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""


def robots_text(url: str) -> str | None:
    """Henter og cacher robots.txt for verten (RFC 9309 §2.3):
    404 o.l. = ingen begrensninger (""); 401/403 og 5xx = alt forbudt (None)."""
    parts = urlsplit(url)
    host = f"{parts.scheme}://{parts.netloc}"
    cached = _robots.get(host)
    if cached and time.time() - cached[0] < ROBOTS_TTL:
        return cached[1]
    try:
        status, body = _get(host + "/robots.txt")
    except Exception as e:  # noqa: BLE001
        # Kan vi ikke lese robots.txt (nettfeil), henter vi heller ikke siden – føre var.
        raise FetchError(f"robots.txt utilgjengelig: {e}") from e
    if status in (401, 403) or status >= 500:
        text = None
    elif status >= 400:
        text = ""
    else:
        text = body.decode("utf-8", errors="replace")
    _robots[host] = (time.time(), text)
    return text


def check(url: str) -> robots.Decision:
    text = robots_text(url)
    if text is None:
        return robots.Decision(False, "robots.txt svarer 401/403/5xx – behandles som forbudt")
    return robots.decide(text, url, USER_AGENT)


def allowed(url: str) -> bool:
    return check(url).allowed


def fetch(url: str) -> bytes:
    """Henter en adresse hvis robots.txt tillater det. Kaster NotAllowed/FetchError."""
    d = check(url)
    if not d.allowed:
        raise NotAllowed(f"robots.txt tillater ikke {urlsplit(url).netloc}{urlsplit(url).path} ({d.rule})")
    try:
        status, body = _get(url)
    except Exception as e:  # noqa: BLE001
        raise FetchError(f"{type(e).__name__}: {e}") from e
    if status != 200:
        raise FetchError(f"HTTP {status}")
    return body
