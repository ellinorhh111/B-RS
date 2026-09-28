import json
from datetime import datetime, timezone

from fetcher import main, news, paths
from fetcher.sources import news_rss, web

from test_run import NOW, FakeSource, read_json


def test_parse_google_news_strips_source_suffix():
    from conftest import GOOGLE_RSS

    items = news_rss.parse_feed(GOOGLE_RSS, "Google News")
    assert items[0].title == "Pareto hever kursmålet på Protector til 480 kroner"
    assert items[0].source == "E24"
    assert items[0].published == datetime(2026, 9, 28, 8, 15, tzinfo=timezone.utc)


def test_parse_atom():
    atom = b"""<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Noba Q3</title>
    <link href="https://x.se/1"/><updated>2026-09-28T07:00:00Z</updated></entry></feed>"""
    [i] = news_rss.parse_feed(atom, "X")
    assert i.title == "Noba Q3" and i.link == "https://x.se/1" and i.published.hour == 7


def test_invalid_xml_raises_valueerror():
    import pytest

    with pytest.raises(ValueError):
        news_rss.parse_feed(b"<html>ikke rss", "X")


def test_robots_disallow_is_respected(fake_web):
    import pytest

    with pytest.raises(web.NotAllowed):
        web.fetch("https://www.finansavisen.no/rss")
    assert "https://www.finansavisen.no/rss" not in fake_web  # selve feeden ble aldri hentet


def test_dedupe_same_story_same_day_but_not_repeated_filings():
    a = news.news_id("selskap", "PROT.OL", "Pareto hever kursmålet", datetime(2026, 9, 28, 8, tzinfo=timezone.utc))
    b = news.news_id("selskap", "PROT.OL", "Pareto hever kursmålet!", datetime(2026, 9, 28, 9, tzinfo=timezone.utc))
    c = news.news_id("selskap", "PROT.OL", "Pareto hever kursmålet", datetime(2026, 9, 25, 8, tzinfo=timezone.utc))
    assert a == b and a != c
    # Ulike Newsweb-meldinger med felles start holdes adskilt
    d = news.news_id("selskap", "PROT.OL", "Protector Forsikring ASA - Share buy-back", None)
    e = news.news_id("selskap", "PROT.OL", "Protector Forsikring ASA - Mandatory notification", None)
    assert d != e


def test_full_run_news_filings_suggestions(root):
    main.run(force=True, source=FakeSource(), now=NOW)
    d = read_json()
    prot = next(c for c in d["selskaper"] if c["ticker"] == "PROT.OL")
    titles = [n["tittel"] for n in prot["nyheter"]]
    # Samme sak fra E24 og Finansavisen vises én gang; sykkelhjelmen filtreres bort (irrelevant)
    assert titles.count("Pareto hever kursmålet på Protector til 480 kroner") == 1
    assert not any("sykkelhjelm" in t for t in titles)
    filings = [n for n in prot["nyheter"] if n["type"] == "børsmelding"]
    assert len(filings) == 2 and filings[0]["kilde"] == "Newsweb via MFN"
    assert d["siste_nyheter"][0]["tid"] >= d["siste_nyheter"][-1]["tid"]  # nyest først
    assert len(d["sektor"]) > 0
    # Kursmålforslag: kurs 110 i FakeSource → 480 er > 4x → forkastes som urimelig.
    assert d["forslag"] == []
    mfn = next(s for s in d["kilder"] if s["navn"] == "mfn")
    assert mfn["ok"] is True
    rss = [s for s in d["kilder"] if s["navn"].startswith("rss_")]
    assert rss and all(s["valgfri"] for s in rss)


class PricedSource(FakeSource):
    def quotes(self, tickers):
        out, err = super().quotes(tickers)
        for q in out.values():
            q.price, q.prev_close = 432.8, 428.0
        return out, err


def test_suggestion_confirm_and_dismiss(root):
    main.run(force=True, source=PricedSource(), now=NOW)
    [s] = read_json()["forslag"]
    assert (s["ticker"], s["kursmal"], s["meglerhus"], s["retning"]) == ("PROT.OL", 480, "Pareto Securities", "hever")
    r = main.handle_suggestion("bekreft", s["id"], now=NOW)
    assert r["ok"], r
    d = read_json()
    assert d["forslag"] == []
    prot = next(c for c in d["selskaper"] if c["ticker"] == "PROT.OL")
    assert prot["megler"]["snitt"] == 480 and prot["megler"]["siste"][0]["dato"] == "2026-09-28"
    # Ny kjøring skal ikke gjenskape forslaget
    main.run(force=True, source=PricedSource(), now=NOW)
    assert read_json()["forslag"] == []


def test_suggestion_dismiss(root):
    main.run(force=True, source=PricedSource(), now=NOW)
    [s] = read_json()["forslag"]
    assert main.handle_suggestion("forkast", s["id"], now=NOW)["ok"]
    assert read_json()["forslag"] == []
    assert "Pareto" not in (root / "config" / "broker_targets.csv").read_text(encoding="utf-8-sig")


def test_news_source_failure_does_not_stop_prices(root, monkeypatch):
    def down(url):
        raise OSError("nett nede")

    monkeypatch.setattr(web, "_get", down)
    main.run(force=True, source=FakeSource(), now=NOW)
    d = read_json()
    assert next(c for c in d["selskaper"] if c["ticker"] == "PROT.OL")["kurs"] == 110.0
    mfn = next(s for s in d["kilder"] if s["navn"] == "mfn")
    assert mfn["ok"] is False and "robots.txt utilgjengelig" in mfn["feil"]


def test_direct_feed_gives_company_and_sector_news(root):
    main.run(force=True, source=FakeSource(), now=NOW)
    d = read_json()
    di_sector = [n for n in d["sektor"] if n["kilde"] == "Dagens Industri"]
    got = {(n["tittel"], n["tema"]) for n in di_sector}
    assert ("Riksbanken lämnar styrräntan oförändrad", "Ränta") in got
    assert ("Noba ökar utlåningen i Tyskland", "Utlåning") in got  # utlånsvekst er sektorrelevant
    noba = next(c for c in d["selskaper"] if c["ticker"] == "NOBA.ST")
    assert any(n["tittel"] == "Noba ökar utlåningen i Tyskland" for n in noba["nyheter"])
    assert not any("Volvo" in n["tittel"] for n in d["sektor"])


def test_old_config_is_migrated_with_backup(tmp_path, monkeypatch):
    monkeypatch.setenv("PORTEFOLJE_ROOT", str(tmp_path))
    (tmp_path / "config").mkdir()
    old = tmp_path / "config" / "sektorsok.csv"
    old.write_text("språk;tema;søk\nno;Rente;Norges Bank rentemøte\n", encoding="utf-8")
    paths.ensure_dirs()
    assert "nøkkelord" in old.read_text(encoding="utf-8-sig").splitlines()[0]
    assert (tmp_path / "config" / "sektorsok.csv.bak").exists()


def test_deep_probe_runs_offline(root, capsys):
    from fetcher import probe

    assert probe.deep_probe() == 0
    out = capsys.readouterr().out
    assert "NEWSWEB API" in out and (root / "data" / "probe_dyp.txt").exists()
