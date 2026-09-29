import json
from datetime import datetime, timedelta, timezone

from fetcher import alerts
from fetcher.sources import rates
from fetcher.store import Store


def test_parse_norges_bank_sdmx():
    body = json.dumps({"data": {"dataSets": [{"series": {"0:0:0": {"observations": {
        "0": ["3.90"], "1": ["3.95"], "2": ["4.02"]}}}}],
        "structure": {"dimensions": {"observation": [{"values": [
            {"id": "2026-09-24"}, {"id": "2026-09-25"}, {"id": "2026-09-28"}]}]}}}}).encode()
    y = rates.parse_norges_bank(body)
    # (4,02 − 3,95) × 100 = +7 bp
    assert (y.rente, y.forrige, y.dato, y.endring_bp) == (4.02, 3.95, "2026-09-28", 7.0)


def test_parse_norges_bank_picks_10y_among_many():
    body = json.dumps({"data": {"dataSets": [{"series": {
        "0:0:0": {"observations": {"0": ["3.50"], "1": ["3.55"]}},   # B / 3M / TBIL
        "0:1:1": {"observations": {"0": ["3.95"], "1": ["4.02"]}},   # B / 10Y / GBON
        "0:2:1": {"observations": {"0": ["3.70"], "1": ["3.72"]}}}}],  # B / 5Y / GBON
        "structure": {"dimensions": {
            "series": [{"id": "FREQ", "values": [{"id": "B"}]},
                       {"id": "TENOR", "values": [{"id": "3M"}, {"id": "10Y"}, {"id": "5Y"}]},
                       {"id": "INSTRUMENT_TYPE", "values": [{"id": "TBIL"}, {"id": "GBON"}]}],
            "observation": [{"values": [{"id": "2026-09-25"}, {"id": "2026-09-28"}]}]}}}}).encode()
    y = rates.parse_norges_bank(body)
    assert (y.rente, y.forrige, y.endring_bp, y.dato) == (4.02, 3.95, 7.0, "2026-09-28")


def test_parse_riksbank():
    body = json.dumps([{"date": "2026-09-25", "value": 3.29}, {"date": "2026-09-24", "value": 3.31}]).encode()
    y = rates.parse_riksbank(body)
    assert (y.rente, y.forrige, y.endring_bp) == (3.29, 3.31, -2.0)


def test_crossing():
    assert alerts._crossed(437, 442, 440) == "opp"   # (−3)·(+2) < 0
    assert alerts._crossed(442, 437, 440) == "ned"
    assert alerts._crossed(441, 445, 440) is None
    assert alerts._crossed(None, 445, 440) is None
    assert alerts._crossed(437, 442, None) is None


NOW = datetime(2026, 9, 28, 10, 0, tzinfo=timezone.utc)


def _data(price, chg):
    return {"selskaper": [{"ticker": "PROT.OL", "navn": "Protector Forsikring", "kurs": price, "endring_pct": chg,
                           "valuta": "NOK", "mitt": {"kursmal": 440.0}, "megler": {"snitt": None}}]}


def test_alerts_move_cross_filing_dedup(tmp_path, monkeypatch):
    sent = []
    monkeypatch.setattr(alerts, "notify", lambda t, m, s="": sent.append((t, s, m)))
    st = Store(tmp_path / "db.sqlite")
    # 1. kjøring: kurs 437, +1 % → ingenting (første kurs, ingen krysning mulig)
    assert alerts.send(alerts.collect(_data(437.0, 1.0), [], [], st, NOW), st, NOW) == 0
    # 2. kjøring: kurs 452, +4,4 % → stor bevegelse + krysset mitt kursmål oppover + ny børsmelding
    filing = {"id": "abc", "ticker": "PROT.OL", "title": "Q3 results", "source": "Newsweb",
              "published": NOW - timedelta(hours=1)}
    old = {"id": "old", "ticker": "PROT.OL", "title": "Gammel", "source": "Newsweb", "published": NOW - timedelta(days=5)}
    n = alerts.send(alerts.collect(_data(452.0, 4.4), [filing, old], [], st, NOW + timedelta(minutes=5)), st, NOW)
    assert n == 3
    titles = [t for t, _, _ in sent]
    assert "Protector Forsikring +4,4 %" in titles
    assert any("krysset mitt kursmål" in t for t in titles) and any(t.startswith("BØRSMELDING") for t in titles)
    # 3. kjøring samme dag: samme bevegelse gir ikke nytt varsel
    assert alerts.send(alerts.collect(_data(453.0, 4.6), [filing], [], st, NOW + timedelta(minutes=10)), st, NOW) == 0


def test_applescript_escaping():
    assert alerts._as_string('Si "hei" \\ ok') == '"Si \\"hei\\" \\\\ ok"'


def test_market_panel_in_json(root):
    from test_run import NOW as RUN_NOW, FakeSource, read_json
    from fetcher import main

    main.run(force=True, source=FakeSource(), now=RUN_NOW)
    m = read_json()["marked"]
    assert [p["navn"] for p in m["poster"]] == ["OSEBX", "OMXS30", "USD/NOK", "EUR/NOK", "SEK/NOK"]
    assert m["poster"][0]["kurs"] == 110.0 and m["poster"][0]["endring_pct"] == 10.0
