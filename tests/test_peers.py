from fetcher import peers
from fetcher.sources.prices_base import Fundamentals
from fetcher.sources.prices_yahoo import fundamentals_from_info


def test_fundamentals_yield_computed_and_sanity_checked():
    f = fundamentals_from_info("SBNOR.OL", {"longName": "Sparebanken Norge", "currentPrice": 215.0,
                                            "dividendRate": 16.0, "priceToBook": 1.3, "trailingPE": -4,
                                            "returnOnEquity": 0.14, "dividendYield": 7.44, "currency": "NOK"})
    # 16 / 215 = 0,0744
    assert round(f.div_yield, 4) == 0.0744 and f.pb == 1.3 and f.roe == 0.14
    assert f.pe is None  # negativ P/E vises som «–»
    g = fundamentals_from_info("X.OL", {"longName": "X", "dividendYield": 5.2, "priceToBook": 55})
    assert abs(g.div_yield - 0.052) < 1e-12 and g.pb is None  # prosent → brøk; P/B 55 urimelig


def test_classify():
    assert peers.classify("Gjensidige Forsikring ASA") == "forsikring"
    assert peers.classify("Instabank ASA") == "forbruksbank"
    assert peers.classify("SpareBank 1 SMN") == "bank"


class FakeFund:
    name = "yahoo"

    def fundamentals(self, tickers):
        out, err = {}, {}
        for t in tickers:
            if t == "XBANKOBL.OL" or t.endswith(".ST") and t != "TFBANK.ST":
                err[t] = "Yahoo kjenner ikke tickeren"
                continue
            cur = "SEK" if t.endswith(".ST") else "NOK"
            out[t] = Fundamentals(t, t.split(".")[0] + " ASA", "EQUITY", "Oslo", cur, 100.0, 1.1, 9.0, 0.06, 0.12, 1e10)
        return out, err


def test_discover_uses_newsweb_and_filters(root, monkeypatch, capsys):
    monkeypatch.setattr(peers, "get_price_source", lambda: FakeFund())
    assert peers.discover() == 0
    csv_text = (root / "data" / "peers_forslag.csv").read_text(encoding="utf-8-sig")
    assert "MING.OL" in csv_text and "GJF.OL;" in csv_text and "TFBANK.ST" in csv_text
    assert "SPABOL" not in csv_text  # boligkreditt = bare obligasjoner
    assert "PROT.OL" not in csv_text  # mitt eget selskap
    assert "XBANKOBL" not in csv_text  # ikke hos Yahoo
    assert "GJF.OL;GJF ASA;Oslo Børs;forsikring" in csv_text
    report = capsys.readouterr().out
    assert "IKKE FUNNET" in report and "XBANKOBL.OL" in report


def _write(path, text):
    path.write_text(text, encoding="utf-8")


def test_sector_panel_medians_ekb_overrides_fx(root):
    from test_run import NOW, FakeSource, read_json
    from fetcher import main

    cfg = root / "config"
    _write(cfg / "peers.csv", "ticker;navn;børs;type;ekb;merknad\n"
           "MING.OL;SpareBank 1 SMN;Oslo Børs;bank;;\n"          # EK-bevis (navn uten ASA)
           "DNB.OL;DNB Bank ASA;Oslo Børs;bank;;\n"
           "FFSB.OL;Flekkefjord Sparebank;Oslo Børs;bank;;\n"      # EK-bevis med eierbrøk
           "TFBANK.ST;TF Bank AB;Nasdaq Stockholm;forbruksbank;;\n"
           "GJF.OL;Gjensidige Forsikring ASA;Oslo Børs;forsikring;;\n"
           "SBNOR.OL;Sparebanken Norge;Oslo Børs;bank;;\n")      # mitt eget → ikke dobbelt
    _write(cfg / "overrides.csv", "ticker;eierbrøk;pb;pe;direkteavkastning;roe;dato;kommentar\n"
           "FFSB.OL;12 %;;;;;2026-09-01;Q2-rapport\n"
           "GJF.OL;;3,5;;;;2026-09-01;fra kvartalsrapport\n")

    class Src(FakeSource):
        def quotes(self, tickers):
            out, err = super().quotes(tickers)
            for t, q in out.items():
                q.prev_close = {"DNB.OL": 100.0, "MING.OL": 105.0, "GJF.OL": 112.0}.get(t, 108.0)
                if t == "SEKNOK=X":
                    q.price, q.prev_close = 0.95, 0.95
            return out, err

    main.run(force=True, source=Src(), now=NOW)
    d = read_json()
    rows = {r["ticker"]: r for r in d["peers"]}
    assert sum(1 for r in d["peers"] if r["ticker"] == "SBNOR.OL") == 1 and rows["SBNOR.OL"]["mine"]
    # EK-bevis uten eierbrøk: P/B og P/E skjules; ROE og direkteavkastning vises
    assert rows["MING.OL"]["pb"] is None and rows["MING.OL"]["pe"] is None and rows["MING.OL"]["roe_pct"] == 13.0
    # EK-bevis med eierbrøk 12 %: 1,2 / 0,12 = 10,0 og 10 / 0,12 = 83,33
    assert round(rows["FFSB.OL"]["pb"], 2) == 10.0 and round(rows["FFSB.OL"]["pe"], 2) == 83.33
    assert rows["DNB.OL"]["pb"] == 1.2  # vanlig aksje: Yahoo-tallet brukes
    assert rows["GJF.OL"]["pb"] == 3.5 and rows["GJF.OL"]["kilde"]["pb"] == "manuell"
    # Markedsverdi: 5e10 SEK × 0,95 = 47,5 mrd NOK
    assert rows["TFBANK.ST"]["mcap_mrd_nok"] == 47.5 and d["valuta"]["kurs"] == 0.95
    # Bank-median (uten SBNOR): P/B fra DNB 1,2 og FFSB 10,0 → median 5,6
    assert d["peer_median"]["bank"]["n"] == 3 and round(d["peer_median"]["bank"]["pb"], 2) == 5.6
    # Sektor i dag, banker: DNB +10 %, MING +4,76 %, FFSB/SBNOR/NOBA/TF +1,85 % (likevektet)
    s = d["sektor_i_dag"]
    assert s["bank"]["n"] == 6 and s["beste"][0]["ticker"] == "DNB.OL"
    v = next(c for c in d["selskaper"] if c["ticker"] == "PROT.OL")["verdsettelse"]
    assert v["type"] == "forsikring" and v["fokus"][0] == "pe" and v["median"]["pb"] == 3.5


def test_approve_writes_peers_csv_with_ekb(root, monkeypatch):
    (root / "data" / "peers_forslag.csv").write_text(
        "ticker;navn;børs;type;merknad\nMING.OL;SpareBank 1 SMN;Oslo Børs;bank;\n"
        "BIEN.OL;Bien Sparebank ASA;Oslo Børs;bank;\n", encoding="utf-8")
    assert peers.approve() == 0
    text = (root / "config" / "peers.csv").read_text(encoding="utf-8-sig")
    assert "MING.OL;SpareBank 1 SMN;Oslo Børs;bank;ja;" in text
    assert "BIEN.OL;Bien Sparebank ASA;Oslo Børs;bank;nei;" in text


def test_market_cap_fallback_and_cap_weighted():
    from fetcher import sector
    f = fundamentals_from_info("X.OL", {"longName": "X", "currentPrice": 100.0, "sharesOutstanding": 2e8})
    assert f.market_cap == 2e10  # 100 × 200 mill.
    rows = [{"mcap_mrd_nok": 300, "endring_pct": 1.0}, {"mcap_mrd_nok": 3, "endring_pct": 7.0},
            {"mcap_mrd_nok": None, "endring_pct": 50.0}]
    # (300·1 + 3·7) / 303 = 321 / 303 = 1,0594 – raden uten markedsverdi teller ikke
    assert round(sector._cap_weighted(rows), 4) == 1.0594 and sector._n_cap(rows) == 2
