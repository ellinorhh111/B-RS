"""`python -m fetcher probe`: sjekker hver nyhetskilde FØR den tas i bruk.

For hver adresse: tillater robots.txt henting? Svarer den? Er det gyldig RSS?
Hvor mange saker, og hva er den nyeste? Rapporten skrives også til
data/probe_report.txt, så den er lett å lime inn.
"""
from __future__ import annotations

import re
from datetime import timedelta
from html import unescape
from urllib.parse import urljoin, urlsplit

from . import news, paths
from .sources import filings, news_rss, web
from .store import utcnow


def _check(label: str, url: str, rss: bool = True) -> list[str]:
    host = urlsplit(url).netloc
    try:
        d = web.check(url)
    except web.FetchError as e:
        return [f"✗ {label}", f"    {host}: {e}"]
    rule = d.rule or "ingen regel traff"
    if not d.allowed:
        return [f"✗ {label}", f"    robots.txt på {host} TILLATER IKKE {urlsplit(url).path}", f"    avgjørende regel: {rule}"]
    try:
        body = web.fetch(url)
        if not rss:
            return [f"✓ {label}", f"    robots.txt tillater ({rule}) · svarer HTTP 200, {len(body)} byte"]
        items = news_rss.parse_feed(body, label)
    except (web.FetchError, ValueError) as e:
        return [f"✗ {label}", f"    robots.txt tillater ({rule}), men: {e}"]
    newest = max((i for i in items if i.published), key=lambda i: i.published, default=None)
    lines = [f"✓ {label}", f"    robots.txt tillater ({rule}) · {len(items)} saker"]
    if newest:
        lines.append(f"    nyeste: {newest.published:%Y-%m-%d %H:%M} UTC – {newest.title[:90]}")
    return lines


# Sider der vi leter etter RSS-lenker (én side per vert, robots.txt respekteres).
DEEP_PAGES = {
    "DN": "https://www.dn.no/",
    "Finansavisen": "https://www.finansavisen.no/",
    "E24": "https://e24.no/",
    "Dagens Industri": "https://www.di.se/",
}

_FEED_LINK = re.compile(r"""(?:href|src)=["']([^"']*(?:rss|feed|atom)[^"']*)["']""", re.I)


def _find_feeds(label: str, url: str) -> list[str]:
    try:
        d = web.check(url)
        if not d.allowed:
            return [f"✗ {label}: robots.txt tillater ikke ({d.rule})"]
        html = web.fetch(url).decode("utf-8", errors="replace")
    except (web.FetchError, web.NotAllowed) as e:
        return [f"✗ {label}: {e}"]
    links = sorted({urljoin(url, unescape(m)) for m in _FEED_LINK.findall(html)})
    if not links:
        return [f"– {label}: fant ingen RSS-lenker på siden ({len(html)} tegn)"]
    return [f"✓ {label}: {len(links)} mulige feed-lenker"] + [f"    {u}" for u in links[:25]]


def deep_probe() -> int:
    """Leter etter RSS-lenker på avisenes forsider (for å finne feeds til DN/Finansavisen)."""
    paths.ensure_dirs()
    lines = [f"Dyp kildesjekk – {utcnow():%Y-%m-%d %H:%M} UTC", "", "RSS-LENKER PÅ FORSIDER"]
    for label, url in DEEP_PAGES.items():
        lines += _find_feeds(label, url)
    report = "\n".join(lines)
    print(report)
    (paths.data_dir() / "probe_dyp.txt").write_text(report + "\n", encoding="utf-8")
    return 0


def probe() -> int:
    paths.ensure_dirs()
    cfgs = news.read_company_config(paths.config_dir() / "nyhetskilder.csv")
    tickers = [c.ticker for c in cfgs]
    today = utcnow().date()
    lines = [f"Kildesjekk – {utcnow():%Y-%m-%d %H:%M} UTC", "", "BØRSMELDINGER OSLO (Newsweb)"]
    url = filings.NEWSWEB_LIST.format(frm=(today - timedelta(days=14)).isoformat(), to=today.isoformat())
    try:
        d = web.check(url)
        if not d.allowed:
            lines += [f"✗ Newsweb: robots.txt tillater ikke ({d.rule})"]
        else:
            per = filings.newsweb_items(tickers, today - timedelta(days=14), today)
            lines += [f"✓ Newsweb: robots.txt tillater ({d.rule or 'ingen regel traff'})"]
            for t, items in per.items():
                lines.append(f"    {t}: {len(items)} meldinger siste 14 dager"
                             + (f" – nyeste: {items[0][0].title[:70]}" if items else ""))
    except (web.FetchError, web.NotAllowed, ValueError) as e:
        lines += [f"✗ Newsweb: {e}"]
    lines += ["", "BØRSVARSLER STOCKHOLM (Nasdaq)"]
    lines += _check("Nasdaq mainMarketNotices", filings.NASDAQ_NOTICES)
    lines += ["", "AVISFEEDER (selskapsnyheter, sektor, kursmålforslag)"]
    for name, (url, _lang) in news_rss.DIRECT_FEEDS.items():
        lines += _check(name, url)
    lines += ["", "10-ÅRIGE STATSRENTER"]
    from .sources import rates

    for land, url in (("Norges Bank", rates.NORGES_BANK_10Y.format(frm=(today - timedelta(days=14)).isoformat())),
                      ("Riksbanken", rates.RIKSBANK_10Y.format(frm=(today - timedelta(days=14)).isoformat()))):
        try:
            d = web.check(url)
            if not d.allowed:
                lines += [f"✗ {land}: robots.txt tillater ikke ({d.rule})"]
                continue
            body = web.fetch(url)
            y = (rates.parse_norges_bank if land == "Norges Bank" else rates.parse_riksbank)(body)
            lines += [f"✓ {land}: {y.rente:.2f} % ({y.dato}), endring {y.endring_bp} bp"]
        except (web.FetchError, web.NotAllowed, ValueError) as e:
            lines += [f"✗ {land}: {e}", f"    adresse: {url}"]
            try:
                lines += ["    svar (første 400 tegn): " + web._get(url)[1][:400].decode("utf-8", "replace").replace("\n", " ")]
            except Exception:  # noqa: BLE001
                pass
    lines += ["", "IKKE I BRUK (robots.txt forbyr): MFN.se («Disallow: *.rss$»), Google News («Disallow: /»)"]
    report = "\n".join(lines)
    print(report)
    (paths.data_dir() / "probe_report.txt").write_text(report + "\n", encoding="utf-8")
    return 0
