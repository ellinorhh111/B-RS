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
        if "mfn.se" in url and "protector" in url:
            return 200, MFN_RSS
        if "mfn.se" in url:
            return 200, b'<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>'
        if "news.google.com" in url:
            return 200, GOOGLE_RSS
        return 404, b""

    monkeypatch.setattr(web, "_get", fake_get)
    return calls
