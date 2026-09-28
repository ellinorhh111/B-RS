"""Høflig nettverkshenting for nyhetskildene.

* Sjekker robots.txt for hver vert før vi henter noe (urllib.robotparser).
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
import urllib.robotparser
from urllib.parse import urlsplit

log = logging.getLogger(__name__)

USER_AGENT = "portefolje-widget/1.0 (personlig bruk; macOS)"
TIMEOUT = 12
ROBOTS_TTL = 24 * 3600  # robots.txt hentes på nytt én gang i døgnet

_robots: dict[str, tuple[float, urllib.robotparser.RobotFileParser | None]] = {}


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


def robots_for(url: str) -> urllib.robotparser.RobotFileParser | None:
    """Henter og cacher robots.txt for verten. None = ingen robots.txt (alt tillatt)."""
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
    if status in (401, 403):
        rp = urllib.robotparser.RobotFileParser()
        rp.disallow_all = True
    elif status >= 400:
        rp = None  # ingen robots.txt ⇒ ingen begrensninger
    else:
        rp = urllib.robotparser.RobotFileParser()
        rp.parse(body.decode("utf-8", errors="replace").splitlines())
    _robots[host] = (time.time(), rp)
    return rp


def allowed(url: str) -> bool:
    rp = robots_for(url)
    return True if rp is None else rp.can_fetch(USER_AGENT, url)


def fetch(url: str) -> bytes:
    """Henter en adresse hvis robots.txt tillater det. Kaster NotAllowed/FetchError."""
    if not allowed(url):
        raise NotAllowed(f"robots.txt tillater ikke {urlsplit(url).netloc}{urlsplit(url).path}")
    try:
        status, body = _get(url)
    except Exception as e:  # noqa: BLE001
        raise FetchError(f"{type(e).__name__}: {e}") from e
    if status != 200:
        raise FetchError(f"HTTP {status}")
    return body
