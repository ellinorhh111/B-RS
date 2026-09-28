"""Henter børsmeldinger, selskapsnyheter, sektornyheter og kursmålforslag.

Kildestatus (vises i widgeten):
  mfn          – børsmeldinger (MFN.se, dekker både Oslo og Stockholm)
  google_news  – selskapsnyheter (Google News, norsk + svensk)
  google_sektor – sektorfeed (Google News)
  rss_<avis>   – direkte avisfeeder; VALGFRIE: feiler de, dekkes de av Google News
"""
from __future__ import annotations

import hashlib
import logging
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from . import suggestions as sugg_mod
from .csvio import read_rows
from .sources import news_rss, web
from .store import Store

log = logging.getLogger(__name__)

COMPANY_NEWS_INTERVAL = timedelta(minutes=15)
SECTOR_NEWS_INTERVAL = timedelta(minutes=60)
KEEP_DAYS = 60
TARGET_WORDS_QUERY = "kursmål OR hever OR senker OR riktkurs OR \"target price\""


@dataclass
class CompanyNewsConfig:
    ticker: str
    mfn: str | None
    search: list[str]  # søkefraser til Google News
    must: list[str]  # minst ett av disse må stå i tittelen
    exclude: list[str] = None  # titler med disse ordene forkastes (støy, f.eks. produktnavn)


def _split(s: str | None) -> list[str]:
    return [p.strip() for p in (s or "").split("|") if p.strip()]


def read_company_config(path: Path) -> list[CompanyNewsConfig]:
    if not path.exists():
        return []
    out = []
    for r in read_rows(path):
        t = (r.get("ticker") or "").upper()
        if t:
            out.append(CompanyNewsConfig(t, r.get("mfn") or None, _split(r.get("sokeord")), _split(r.get("trefford")),
                                         _split(r.get("utelat"))))
    return out


def read_sector_config(path: Path) -> list[tuple[str, str, str]]:
    if not path.exists():
        return []
    return [(r.get("sprak", "no") or "no", r.get("tema", ""), r["sok"]) for r in read_rows(path)
            if r.get("sok") and (r.get("sprak") or "no") in news_rss.GOOGLE_LOCALES]


def title_key(title: str) -> str:
    """Normalisert tittel for duplikatsjekk: små bokstaver, uten tegnsetting og «TICKER:»-prefiks.

    (Kildenavnet « - E24» fjernes allerede i RSS-parseren for Google News.)"""
    t = unicodedata.normalize("NFKC", title).lower()
    t = re.sub(r"^(?:[a-z0-9]{2,6}:\s*)", "", t)  # «SBNOR: »-prefiks fra Newsweb
    t = re.sub(r"[^\wæøåäö]+", " ", t)
    return " ".join(t.split())[:90]


def news_id(scope: str, ticker: str | None, title: str, published: datetime | None) -> str:
    """Samme tittel samme dag = samme sak (fra flere kilder). Gjentatte meldinger med lik
    tittel på ulike dager (f.eks. «Mandatory notification of trade») holdes adskilt."""
    day = published.date().isoformat() if published else ""
    return hashlib.sha1(f"{scope}|{ticker or ''}|{title_key(title)}|{day}".encode("utf-8")).hexdigest()[:16]


def relevant(title: str, must: list[str], exclude: list[str] | None = None) -> bool:
    """Tittelen må nevne selskapet (et av trefford) og ikke inneholde et utelat-ord."""
    t = title.lower()
    if exclude and any(x.lower() in t for x in exclude):
        return False
    return not must or any(m.lower() in t for m in must)


def _row(scope, ticker, kind, item: news_rss.NewsItem, lang=None, topic=None) -> dict:
    return {"id": news_id(scope, ticker, item.title, item.published), "scope": scope, "ticker": ticker, "kind": kind,
            "title": news_rss.clean_title(item.title), "source": item.source, "link": item.link,
            "published": item.published, "lang": lang, "topic": topic}


class NewsRun:
    """Én henting. Samler feil per kilde og lagrer alt i Store."""

    def __init__(self, store: Store, now: datetime, errors: list[str], price_lookup):
        self.store, self.now, self.errors, self.price = store, now, errors, price_lookup
        self.new_filings: list[dict] = []
        self.new_suggestions: list = []

    def _status(self, name: str, errs: list[str], total: int) -> None:
        ok = total == 0 or len(errs) < total  # ok hvis minst én forespørsel lyktes
        self.store.set_source_status(name, ok, self.now, "; ".join(errs[:3]) or None)
        if not ok:
            self.errors.extend(f"{name}: {e}" for e in errs[:3])

    # --- børsmeldinger -----------------------------------------------------
    def filings(self, cfgs: list[CompanyNewsConfig]) -> None:
        errs, rows, total = [], [], 0
        for c in cfgs:
            if not c.mfn:
                continue
            total += 1
            try:
                items = news_rss.fetch_feed(news_rss.mfn_feed_url(c.mfn), "MFN")
                rows += [_row("selskap", c.ticker, "borsmelding",
                              news_rss.NewsItem(i.title, i.link, _filing_source(i.link), i.published))
                         for i in items]
            except (web.NotAllowed, web.FetchError, ValueError) as e:
                errs.append(f"{c.ticker}: {e}")
        self.new_filings = [r for r in self.store.save_news(rows, self.now)]
        self._status("mfn", errs, total)
        self._suggest(rows)

    # --- selskapsnyheter ----------------------------------------------------
    def company_news(self, cfgs: list[CompanyNewsConfig]) -> None:
        errs, rows, total = [], [], 0
        for c in cfgs:
            if not c.search:
                continue
            q = news_rss.or_query(c.search)
            queries = [(q, "no"), (q, "sv"), (f"({q}) ({TARGET_WORDS_QUERY})", "no")]
            for query, lang in queries:
                total += 1
                try:
                    items = news_rss.fetch_feed(news_rss.google_news_url(query, lang), "Google News")
                    rows += [_row("selskap", c.ticker, "nyhet", i, lang) for i in items if relevant(i.title, c.must, c.exclude)]
                except (web.NotAllowed, web.FetchError, ValueError) as e:
                    errs.append(f"{c.ticker}/{lang}: {e}")
        self.store.save_news(rows, self.now)
        self._status("google_news", errs, total)
        self._suggest(rows)

    def direct_feeds(self, cfgs: list[CompanyNewsConfig]) -> None:
        """Avisenes egne RSS-feeder (valgfritt). Bare titler som nevner et av selskapene tas med."""
        for name, url in news_rss.DIRECT_FEEDS.items():
            key = "rss_" + name
            try:
                items = news_rss.fetch_feed(url, name)
            except (web.NotAllowed, web.FetchError, ValueError) as e:
                self.store.set_source_status(key, False, self.now, str(e))
                continue
            rows = [_row("selskap", c.ticker, "nyhet", i) for i in items for c in cfgs if relevant(i.title, c.must, c.exclude)]
            self.store.save_news(rows, self.now)
            self.store.set_source_status(key, True, self.now)
            self._suggest(rows)

    # --- sektor --------------------------------------------------------------
    def sector_news(self, queries: list[tuple[str, str, str]]) -> None:
        errs, rows = [], []
        for lang, topic, q in queries:
            try:
                items = news_rss.fetch_feed(news_rss.google_news_url(q, lang, days=7), "Google News")
                rows += [_row("sektor", None, "nyhet", i, lang, topic) for i in items[:15]]
            except (web.NotAllowed, web.FetchError, ValueError) as e:
                errs.append(f"{topic}: {e}")
        self.store.save_news(rows, self.now)
        self._status("google_sektor", errs, len(queries))

    # --- kursmålforslag -------------------------------------------------------
    def _suggest(self, rows: list[dict]) -> None:
        found = []
        for r in rows:
            if not r.get("ticker"):
                continue
            s = sugg_mod.from_item(r["ticker"], r["title"], r["source"], r["link"],
                                   r["published"].isoformat() if r.get("published") else None,
                                   self.price(r["ticker"]))
            if s:
                found.append(s)
        self.new_suggestions += self.store.save_suggestions(found, self.now)


def _filing_source(link: str) -> str:
    # MFN-lenker med «/ob/» er Newsweb-meldinger fra Oslo Børs.
    return "Newsweb via MFN" if "/ob/" in link else "MFN"


def due(store: Store, key: str, interval: timedelta, now: datetime, force: bool) -> bool:
    from .store import parse_iso

    last = parse_iso(store.get_meta(key))
    return force or last is None or now - last >= interval - timedelta(minutes=1)


def run_all(store: Store, config_dir: Path, now: datetime, errors: list[str], price_lookup,
            force: bool = False) -> NewsRun:
    cfgs = read_company_config(config_dir / "nyhetskilder.csv")
    run = NewsRun(store, now, errors, price_lookup)
    run.filings(cfgs)  # hver kjøring (hvert 5. min i åpningstiden)
    if due(store, "last_company_news", COMPANY_NEWS_INTERVAL, now, force):
        run.company_news(cfgs)
        run.direct_feeds(cfgs)
        store.set_meta("last_company_news", now.isoformat())
    if due(store, "last_sector_news", SECTOR_NEWS_INTERVAL, now, force):
        run.sector_news(read_sector_config(config_dir / "sektorsok.csv"))
        store.set_meta("last_sector_news", now.isoformat())
    store.prune_news(now - timedelta(days=KEEP_DAYS))
    log.info("Nyheter: %d nye børsmeldinger, %d nye kursmålforslag", len(run.new_filings), len(run.new_suggestions))
    return run
