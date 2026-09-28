"""RSS/Atom for nyheter. Kun RSS – ingen skraping av nettsider.

Avisenes egne RSS-feeder brukes når robots.txt tillater det (sjekkes med
`python -m fetcher probe`). MFN.se og Google News ble vurdert, men robots.txt
forbyr automatisk henting av RSS der («Disallow: *.rss$» / «Disallow: /»).
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit

from . import web


@dataclass
class NewsItem:
    title: str
    link: str
    source: str  # visningsnavn, f.eks. «E24» eller «MFN»
    published: datetime | None  # UTC


# --- adresser -----------------------------------------------------------------

# Avisenes egne RSS-feeder: navn → (adresse, språk). Brukes bare hvis robots.txt
# tillater dem. E24 og DI er bekreftet (probe 28.09.2026). DN og Finansavisen har
# ingen RSS vi har funnet; legg dem til her hvis du finner en adresse som virker.
DIRECT_FEEDS = {
    "E24": ("https://e24.no/rss2/", "no"),
    "Dagens Industri": ("https://www.di.se/rss", "sv"),
}

# --- parsing ------------------------------------------------------------------

def _text(el: ET.Element | None) -> str:
    return (el.text or "").strip() if el is not None else ""


def _date(s: str) -> datetime | None:
    if not s:
        return None
    try:
        d = parsedate_to_datetime(s)  # RSS: «Mon, 28 Sep 2026 14:27:00 GMT»
    except (TypeError, ValueError):
        try:
            d = datetime.fromisoformat(s.replace("Z", "+00:00"))  # Atom: ISO 8601
        except ValueError:
            return None
    return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _strip_ns(root: ET.Element) -> None:
    for el in root.iter():
        if isinstance(el.tag, str) and "}" in el.tag:
            el.tag = el.tag.split("}", 1)[1]


def parse_feed(xml: bytes, default_source: str) -> list[NewsItem]:
    """Tolker RSS 2.0 eller Atom. Ugyldig XML gir ValueError."""
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as e:
        raise ValueError(f"ikke gyldig RSS/XML: {e}") from e
    _strip_ns(root)
    items: list[NewsItem] = []
    if root.tag == "rss" or root.find("channel") is not None:
        for it in root.iter("item"):
            title = _text(it.find("title"))
            src_el = it.find("source")
            source = _text(src_el) or default_source
            # Google News legger « - Kilde» på slutten av tittelen.
            if src_el is not None and title.endswith(" - " + source):
                title = title[: -len(" - " + source)]
            items.append(NewsItem(title, _text(it.find("link")), source, _date(_text(it.find("pubDate")))))
    elif root.tag == "feed":
        for e in root.iter("entry"):
            link_el = e.find("link")
            link = link_el.get("href", "") if link_el is not None else ""
            items.append(NewsItem(_text(e.find("title")), link, default_source,
                                  _date(_text(e.find("published")) or _text(e.find("updated")))))
    else:
        raise ValueError(f"ukjent feed-format <{root.tag}>")
    return [i for i in items if i.title and i.link.startswith(("http://", "https://"))]


def fetch_feed(url: str, source: str) -> list[NewsItem]:
    return parse_feed(web.fetch(url), source)


def host_label(url: str) -> str:
    return urlsplit(url).netloc.removeprefix("www.")


_WS = re.compile(r"\s+")


def clean_title(t: str) -> str:
    return _WS.sub(" ", t).strip()
