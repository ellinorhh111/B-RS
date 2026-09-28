"""`python -m fetcher probe`: sjekker hver nyhetskilde FØR den tas i bruk.

For hver adresse: tillater robots.txt henting? Svarer den? Er det gyldig RSS?
Hvor mange saker, og hva er den nyeste? Rapporten skrives også til
data/probe_report.txt, så den er lett å lime inn.
"""
from __future__ import annotations

from urllib.parse import urlsplit

from . import news, paths
from .sources import news_rss, web
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


def probe() -> int:
    paths.ensure_dirs()
    cfgs = news.read_company_config(paths.config_dir() / "nyhetskilder.csv")
    lines = [f"Kildesjekk – {utcnow():%Y-%m-%d %H:%M} UTC", "", "BØRSMELDINGER (MFN.se)"]
    for c in cfgs:
        if c.mfn:
            lines += _check(f"MFN {c.ticker} ({c.mfn})", news_rss.mfn_feed_url(c.mfn))
    lines += ["", "SELSKAPSNYHETER (Google News)"]
    for c in cfgs:
        if c.search:
            q = news_rss.or_query(c.search)
            lines += _check(f"Google News {c.ticker} norsk", news_rss.google_news_url(q, "no"))
            lines += _check(f"Google News {c.ticker} svensk", news_rss.google_news_url(q, "sv"))
    lines += ["", "SEKTOR (Google News, to eksempler)"]
    for lang, topic, q in news.read_sector_config(paths.config_dir() / "sektorsok.csv")[:1] + \
            [x for x in news.read_sector_config(paths.config_dir() / "sektorsok.csv") if x[0] == "sv"][:1]:
        lines += _check(f"Sektor {topic} ({lang})", news_rss.google_news_url(q, lang, days=7))
    lines += ["", "DIREKTE AVISFEEDER (valgfrie – dekkes ellers av Google News)"]
    for name, (url, _lang) in news_rss.DIRECT_FEEDS.items():
        lines += _check(name, url)
    lines += ["", "ALTERNATIVE KILDER (kandidater – brukes ikke ennå)"]
    for name, url in news_rss.PROBE_CANDIDATES.items():
        lines += _check(name, url, rss=not ("JSON" in name or url.endswith("/feed")))
    report = "\n".join(lines)
    print(report)
    (paths.data_dir() / "probe_report.txt").write_text(report + "\n", encoding="utf-8")
    return 0
