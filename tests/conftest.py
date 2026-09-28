import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def root(tmp_path, monkeypatch):
    """Isolert prosjektmappe med standardfilene kopiert inn."""
    monkeypatch.setenv("PORTEFOLJE_ROOT", str(tmp_path))
    from fetcher import paths

    paths.ensure_dirs()
    return tmp_path


GOOGLE_RSS = """<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Google News</title>
<item><title>Pareto hever kursmålet på Protector til 480 kroner - E24</title><link>https://news.google.com/rss/articles/a1</link>
<pubDate>Mon, 28 Sep 2026 08:15:00 GMT</pubDate><source url="https://e24.no">E24</source></item>
<item><title>Pareto hever kursmålet på Protector til 480 kroner - Finansavisen</title><link>https://news.google.com/rss/articles/a2</link>
<pubDate>Mon, 28 Sep 2026 08:40:00 GMT</pubDate><source url="https://www.finansavisen.no">Finansavisen</source></item>
<item><title>Sparebanken Norge med sterkt kvartal - DN</title><link>https://news.google.com/rss/articles/a3</link>
<pubDate>Sun, 27 Sep 2026 10:00:00 GMT</pubDate><source url="https://www.dn.no">DN</source></item>
<item><title>Protector Pro sykkelhjelm testet - Tek</title><link>https://news.google.com/rss/articles/a4</link>
<pubDate>Sun, 27 Sep 2026 09:00:00 GMT</pubDate><source url="https://tek.no">Tek</source></item>
</channel></rss>""".encode()

MFN_RSS = """<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>MFN</title>
<item><title>PROT: Protector Forsikring ASA - Mandatory notification of trade</title>
<link>https://mfn.se/ob/a/protector-forsikring/mandatory-1</link><pubDate>Mon, 28 Sep 2026 06:00:00 GMT</pubDate></item>
<item><title>PROT: Protector Forsikring ASA - Mandatory notification of trade</title>
<link>https://mfn.se/ob/a/protector-forsikring/mandatory-2</link><pubDate>Fri, 25 Sep 2026 06:00:00 GMT</pubDate></item>
</channel></rss>""".encode()

DI_RSS = """<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Riksbanken lämnar styrräntan oförändrad</title><link>https://www.di.se/1</link>
<pubDate>Mon, 28 Sep 2026 07:30:00 GMT</pubDate></item>
<item><title>Noba ökar utlåningen i Tyskland</title><link>https://www.di.se/2</link>
<pubDate>Mon, 28 Sep 2026 07:40:00 GMT</pubDate></item>
<item><title>Volvo Cars ny elbil</title><link>https://www.di.se/3</link>
<pubDate>Mon, 28 Sep 2026 07:50:00 GMT</pubDate></item>
</channel></rss>""".encode()

NEWSWEB_JSON = json.dumps({"header": {"result.val": 0}, "data": {"messages": [
    {"messageId": 1001, "title": "Mandatory notification of trade", "issuerSign": "PROT", "issuerName": "Protector Forsikring ASA",
     "category": [{"category_no": "MELDEPLIKTIG HANDEL"}], "publishedTime": "2026-09-28T06:00:00.000Z"},
    {"messageId": 1002, "title": "Mandatory notification of trade", "issuerSign": "PROT",
     "category": [{"category_no": "MELDEPLIKTIG HANDEL"}], "publishedTime": "2026-09-25T06:00:00.000Z"},
    {"messageId": 1003, "title": "Rentefastsettelse", "issuerSign": "SBNOR",
     "category": [{"category_no": "ANNEN INFORMASJONSPLIKTIG REGULATORISK INFORMASJON"}],
     "publishedTime": "2026-09-28T10:30:00.000Z"},
    {"messageId": 1006, "title": "Q2 2026", "issuerSign": "MING", "issuerName": "SpareBank 1 SMN",
     "publishedTime": "2026-09-10T06:00:00Z"},
    {"messageId": 1007, "title": "Rentefastsettelse", "issuerSign": "SPABOL", "issuerName": "Sparebanken Øst Boligkreditt AS",
     "publishedTime": "2026-09-10T06:00:00Z"},
    {"messageId": 1008, "title": "Q2", "issuerSign": "GJF", "issuerName": "Gjensidige Forsikring ASA",
     "publishedTime": "2026-09-11T06:00:00Z"},
    {"messageId": 1009, "title": "Q2", "issuerSign": "XBANKOBL", "issuerName": "Obligasjonsbank ASA",
     "publishedTime": "2026-09-11T06:00:00Z"},
    {"messageId": 1004, "title": "Major Shareholder Disclosure", "issuerSign": "GENO", "issuerName": "General Oceans ASA",
     "category": [{"category_no": "FLAGGING"}], "publishedTime": "2026-09-28T15:16:57.226Z"},
    {"messageId": 1005, "title": "Test", "issuerSign": "PROT", "test": True, "publishedTime": "2026-09-28T15:00:00Z"},
]}}).encode()

NASDAQ_RSS = """<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>NOBA Bank Group AB (publ) is included in OMXS30 index</title><link>https://view.news.eu.nasdaq.com/view?id=1</link>
<pubDate>Mon, 28 Sep 2026 12:00:00 GMT</pubDate></item>
<item><title>Trading halt in Some Other AB</title><link>https://view.news.eu.nasdaq.com/view?id=2</link>
<pubDate>Mon, 28 Sep 2026 12:30:00 GMT</pubDate></item>
</channel></rss>""".encode()

ROBOTS_OK = b"User-agent: *\nAllow: /\n"


@pytest.fixture(autouse=True)
def fake_web(monkeypatch):
    """Ingen ekte nettverkskall i testene. Returnerer eksempel-feeder per vert."""
    from fetcher.sources import web

    web._robots.clear()
    calls = []

    def fake_get(url):
        calls.append(url)
        if url.endswith("/robots.txt"):
            if "finansavisen" in url:
                return 200, b"User-agent: *\nDisallow: /\n"
            return 200, ROBOTS_OK
        if "api3.oslo.oslobors.no" in url:
            return 200, NEWSWEB_JSON
        if "api.news.eu.nasdaq.com" in url:
            return 200, NASDAQ_RSS
        if "e24.no" in url:
            return 200, GOOGLE_RSS  # vanlig RSS-format (uten <source> brukes kildenavnet)
        if "di.se" in url:
            return 200, DI_RSS
        return 404, b""

    monkeypatch.setattr(web, "_get", fake_get)
    return calls
