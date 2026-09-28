"""Børsmeldinger.

Oslo: Newsweb (Euronext Oslo Børs) – samme JSON-tjeneste som newsweb.oslobors.no
      bruker selv. robots.txt tillater den (probe 28.09.2026). Den er ikke et
      dokumentert, offentlig API, så formatet kan endre seg; vi henter derfor lite
      og sjelden (siste dager), og all tolkning er samlet her.
      Tjenesten kan ikke filtrere på ticker, så vi henter alle meldinger i perioden
      og plukker ut dem med riktig «issuerSign» (tickeren uten .OL).

Stockholm: Nasdaq Nordics offisielle RSS for børsvarsler (mainMarketNotices).
      Inneholder Nasdaqs egne varsler om selskapene (handelsstopp, notering osv.),
      IKKE selskapenes egne pressemeldinger – de går via MFN, som ikke tillater
      automatisk henting (robots.txt: «Disallow: *.rss$»).
"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone

from . import web
from .news_rss import NewsItem, fetch_feed

NEWSWEB_LIST = "https://api3.oslo.oslobors.no/v1/newsreader/list?fromDate={frm}&toDate={to}"
NEWSWEB_MESSAGE = "https://newsweb.oslobors.no/message/{id}"
NASDAQ_NOTICES = "https://api.news.eu.nasdaq.com/news/rss/mainMarketNotices"


def _dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None
    return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)


def parse_newsweb(body: bytes) -> list[dict]:
    """Returnerer meldinger som dict: sign, tittel, kategori, publisert, lenke."""
    return parse_newsweb_page(body)[0]


def parse_newsweb_page(body: bytes) -> tuple[list[dict], bool]:
    """(meldinger, overflow). overflow=True betyr at Newsweb kuttet listen."""
    try:
        data = json.loads(body)
        messages = data["data"]["messages"]
        overflow = bool(data["data"].get("overflow"))
    except (ValueError, KeyError, TypeError, AttributeError) as e:
        raise ValueError(f"uventet svar fra Newsweb: {e}") from e
    out = []
    for m in messages:
        mid = m.get("messageId") or m.get("id")
        title = (m.get("title") or "").strip()
        sign = (m.get("issuerSign") or "").upper()
        if not (mid and title and sign) or m.get("test"):
            continue
        cats = m.get("category") or []
        out.append({
            "sign": sign,
            "utsteder": (m.get("issuerName") or "").strip(),
            "tittel": title,
            "kategori": (cats[0].get("category_no") if cats and isinstance(cats[0], dict) else None),
            "publisert": _dt(m.get("publishedTime")),
            "lenke": NEWSWEB_MESSAGE.format(id=mid),
        })
    return out, overflow


def _fetch_period(frm: date, to: date) -> list[dict]:
    """Henter perioden. Er listen kuttet (overflow), deles perioden i to til den ikke er det
    (ned til én dag). Da mister vi ikke meldinger på travle dager."""
    msgs, overflow = parse_newsweb_page(web.fetch(NEWSWEB_LIST.format(frm=frm.isoformat(), to=to.isoformat())))
    if not overflow or frm >= to:
        return msgs
    mid = frm + (to - frm) // 2
    return _fetch_period(frm, mid) + _fetch_period(mid + timedelta(days=1), to)


def newsweb_items(tickers: list[str], frm: date, to: date) -> dict[str, list[tuple[NewsItem, str | None]]]:
    """Newsweb-meldinger per Oslo-ticker: {ticker: [(NewsItem, kategori)]}."""
    wanted = {t.rsplit(".", 1)[0].upper(): t for t in tickers if t.upper().endswith(".OL")}
    if not wanted:
        return {}
    out: dict[str, list] = {t: [] for t in wanted.values()}
    seen = set()
    for m in _fetch_period(frm, to):
        if m["lenke"] in seen:
            continue
        seen.add(m["lenke"])
        t = wanted.get(m["sign"])
        if t:
            out[t].append((NewsItem(m["tittel"], m["lenke"], "Newsweb", m["publisert"]), m["kategori"]))
    return out


def nasdaq_notices() -> list[NewsItem]:
    return fetch_feed(NASDAQ_NOTICES, "Nasdaq Stockholm (børsvarsel)")
