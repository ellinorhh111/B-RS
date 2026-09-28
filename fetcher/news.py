"""Henter børsmeldinger, selskapsnyheter, sektornyheter og kursmålforslag.

Kilder (valgt etter robots.txt-sjekk 28.09.2026, se README):
  newsweb        – børsmeldinger Oslo (Euronext Oslo Børs)
  nasdaq         – Nasdaq Stockholms børsvarsler (handelsstopp, notering o.l.)
  rss_E24, rss_Dagens Industri – avisenes egne RSS: selskapsnyheter, sektorsaker, kursmålforslag

Ikke brukt: MFN.se («Disallow: *.rss$») og Google News («Disallow: /»).
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
from .sources import filings as filings_src
from .sources import news_rss, web
from .store import Store

log = logging.getLogger(__name__)

COMPANY_NEWS_INTERVAL = timedelta(minutes=15)
FILINGS_DAYS = 3  # vanlig henting: siste 3 dager
FILINGS_DAYS_FULL = 30  # første gang / --force: siste 30 dager
REMOVED_SOURCES = ("mfn", "google_news", "google_sektor", "rss_DN", "rss_Finansavisen")
KEEP_DAYS = 60


@dataclass
class CompanyNewsConfig:
    ticker: str
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
            out.append(CompanyNewsConfig(t, _split(r.get("trefford")), _split(r.get("utelat"))))
    return out


def read_sector_keywords(path: Path) -> list[tuple[str, str, list[str]]]:
    """(språk, tema, nøkkelord) per rad – brukes til å plukke sektorsaker fra avisenes egne feeder."""
    if not path.exists():
        return []
    return [(r.get("sprak", "no") or "no", r.get("tema", ""), _split(r.get("nokkelord")))
            for r in read_rows(path) if r.get("nokkelord")]


def sector_topic(title: str, lang: str | None, keywords: list[tuple[str, str, list[str]]]) -> str | None:
    """Første tema der et nøkkelord står i tittelen (samme språk som feeden, hvis kjent)."""
    t = title.lower()
    for kl, topic, words in keywords:
        if lang and kl != lang:
            continue
        if any(re.search(r"\b" + re.escape(w.lower()), t) for w in words):
            return topic
    return None


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
    def filings(self, cfgs: list[CompanyNewsConfig], days: int) -> None:
        tickers = [c.ticker for c in cfgs]
        to = self.now.date()
        frm = to - timedelta(days=days)
        rows: list[dict] = []
        if any(t.endswith(".OL") for t in tickers):
            try:
                for ticker, items in filings_src.newsweb_items(tickers, frm, to).items():
                    rows += [_row("selskap", ticker, "borsmelding", i, "no", cat) for i, cat in items]
                self.store.set_source_status("newsweb", True, self.now)
            except (web.NotAllowed, web.FetchError, ValueError) as e:
                self.store.set_source_status("newsweb", False, self.now, str(e))
                self.errors.append(f"newsweb: {e}")
        st = [c for c in cfgs if not c.ticker.endswith(".OL")]
        if st:
            try:
                notices = filings_src.nasdaq_notices()
                rows += [_row("selskap", c.ticker, "borsmelding", i, "en", "BØRSVARSEL")
                         for i in notices for c in st if relevant(i.title, c.must, c.exclude)]
                self.store.set_source_status("nasdaq", True, self.now)
            except (web.NotAllowed, web.FetchError, ValueError) as e:
                self.store.set_source_status("nasdaq", False, self.now, str(e))
                self.errors.append(f"nasdaq: {e}")
        self.new_filings = self.store.save_news(rows, self.now)
        self._suggest(rows)

    def direct_feeds(self, cfgs: list[CompanyNewsConfig], sector_kw: list[tuple[str, str, list[str]]]) -> None:
        """Avisenes egne RSS-feeder. Titler som nevner et av selskapene blir selskapsnyheter;
        titler med et sektor-nøkkelord (sektorsok.csv) blir sektornyheter."""
        for name, (url, lang) in news_rss.DIRECT_FEEDS.items():
            key = "rss_" + name
            try:
                items = news_rss.fetch_feed(url, name)
            except (web.NotAllowed, web.FetchError, ValueError) as e:
                self.store.set_source_status(key, False, self.now, str(e))
                continue
            rows = [_row("selskap", c.ticker, "nyhet", i) for i in items for c in cfgs if relevant(i.title, c.must, c.exclude)]
            for i in items:
                topic = sector_topic(i.title, lang, sector_kw)
                if topic:
                    rows.append(_row("sektor", None, "nyhet", i, lang, topic))
            self.store.save_news(rows, self.now)
            self.store.set_source_status(key, True, self.now)
            self._suggest(rows)

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


def due(store: Store, key: str, interval: timedelta, now: datetime, force: bool) -> bool:
    from .store import parse_iso

    last = parse_iso(store.get_meta(key))
    return force or last is None or now - last >= interval - timedelta(minutes=1)


def run_all(store: Store, config_dir: Path, now: datetime, errors: list[str], price_lookup,
            force: bool = False) -> NewsRun:
    cfgs = read_company_config(config_dir / "nyhetskilder.csv")
    run = NewsRun(store, now, errors, price_lookup)
    for name in REMOVED_SOURCES:  # rydd bort status for kilder vi ikke lenger bruker
        store.delete_source_status(name)
    full = force or store.get_meta("last_filings") is None
    run.filings(cfgs, FILINGS_DAYS_FULL if full else FILINGS_DAYS)  # hver kjøring
    store.set_meta("last_filings", now.isoformat())
    if due(store, "last_company_news", COMPANY_NEWS_INTERVAL, now, force):
        run.direct_feeds(cfgs, read_sector_keywords(config_dir / "sektorsok.csv"))
        store.set_meta("last_company_news", now.isoformat())
    store.prune_news(now - timedelta(days=KEEP_DAYS))
    log.info("Nyheter: %d nye børsmeldinger, %d nye kursmålforslag", len(run.new_filings), len(run.new_suggestions))
    return run
