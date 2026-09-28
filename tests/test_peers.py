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
