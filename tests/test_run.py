import json
from datetime import datetime, timedelta, timezone

from fetcher import main, paths, verify
from fetcher.sources.prices_base import Consensus, Quote, TickerInfo
from fetcher.csvio import Holding


class FakeSource:
    name = "yahoo"

    def __init__(self, fail=False, missing=()):
        self.fail, self.missing = fail, set(missing)

    def quotes(self, tickers):
        if self.fail:
            raise ConnectionError("nett nede")
        out = {t: Quote(t, 110.0, 100.0, "SEK" if t.endswith(".ST") else "NOK", None, daily_closes=[("2026-09-25", 100.0)])
               for t in tickers if t not in self.missing}
        return out, {t: "ingen data" for t in self.missing}

    def consensus(self, tickers):
        self.consensus_calls = getattr(self, "consensus_calls", 0) + 1
        if self.fail:
            raise ConnectionError("nett nede")
        # PROT har dekning, de andre ikke (typisk for små nordiske aksjer).
        return {t: Consensus(t, 132.0, 130.0, 150.0, 100.0, 4, "buy", 2.1, "NOK")
                for t in tickers if t == "PROT.OL"}, {}


NOW = datetime(2026, 9, 28, 10, 0, tzinfo=timezone.utc)


def read_json():
    return json.loads(paths.json_path().read_text(encoding="utf-8"))


def test_run_writes_json(root):
    main.run(force=True, source=FakeSource(missing={"NOBA.ST"}), now=NOW)
    d = read_json()
    c = {x["ticker"]: x for x in d["selskaper"]}
    assert c["PROT.OL"]["kurs"] == 110.0 and c["PROT.OL"]["endring_pct"] == 10.0
    assert c["NOBA.ST"]["kurs"] is None  # mangler → null, ingen krasj
    assert c["SBNOR.OL"]["mitt"]["kursmal"] is None and c["SBNOR.OL"]["mitt"]["oppside_pct"] is None
    # Konsensus 132 mot kurs 110 → (132 − 110) / 110 = 20 % → grønn
    assert c["PROT.OL"]["konsensus"]["oppside_pct"] == 20.0
    assert c["PROT.OL"]["konsensus"]["farge"] == "gronn"
    assert c["PROT.OL"]["konsensus"]["anbefaling"] == "kjøp"
    assert c["SBNOR.OL"]["konsensus"] is None
    assert c["SBNOR.OL"]["megler"]["snitt"] is None
    assert any("NOBA.ST" in e for e in d["feil"])
    assert d["utdatert_etter"] > d["siste_henting"]


def test_failure_keeps_cached_prices_and_flags_source(root):
    main.run(force=True, source=FakeSource(), now=NOW)
    main.run(force=True, source=FakeSource(fail=True), now=NOW + timedelta(minutes=5))
    d = read_json()
    prot = next(x for x in d["selskaper"] if x["ticker"] == "PROT.OL")
    assert prot["kurs"] == 110.0  # siste kjente kurs
    assert prot["hentet"].startswith("2026-09-28T10:00")
    yahoo = next(s for s in d["kilder"] if s["navn"] == "yahoo")
    assert yahoo["ok"] is False and "nett nede" in yahoo["feil"]
    assert yahoo["sist_ok"].startswith("2026-09-28T10:00")


def test_skip_when_not_due(root):
    evening = datetime(2026, 9, 28, 18, 0, tzinfo=timezone.utc)
    main.run(force=True, source=FakeSource(), now=evening)
    mtime = paths.json_path().stat().st_mtime_ns
    main.run(source=FakeSource(fail=True), now=evening + timedelta(minutes=10))
    assert paths.json_path().stat().st_mtime_ns == mtime


def test_verify_catches_sparebank1_confusion():
    h = Holding("SBNOR.OL", "Sparebanken Norge", "Oslo Børs", "NOK", None, None, "")
    wrong = TickerInfo("SB1NO.OL", True, name="SpareBank 1 Sør-Norge ASA", exchange="Oslo", currency="NOK",
                       price=150.0)
    right = TickerInfo("SBNOR.OL", True, name="Sparebanken Norge", exchange="Oslo", currency="NOK", price=150.0)
    assert not all(ok for ok, _ in verify.check(h, wrong))
    assert all(ok for ok, _ in verify.check(h, right))


def test_verify_currency_and_exchange():
    h = Holding("NOBA.ST", "Noba Bank Group", "Nasdaq Stockholm", "SEK", None, None, "")
    good = TickerInfo("NOBA.ST", True, name="NOBA Bank Group AB (publ)", exchange="Stockholm", currency="SEK")
    bad = TickerInfo("NOBA.ST", True, name="NOBA Bank Group AB (publ)", exchange="Stockholm", currency="NOK")
    assert all(ok for ok, _ in verify.check(h, good))
    assert not all(ok for ok, _ in verify.check(h, bad))


def test_consensus_only_every_six_hours(root):
    src = FakeSource()
    main.run(force=True, source=src, now=NOW)
    main.run(source=src, now=NOW + timedelta(minutes=5))
    main.run(source=src, now=NOW + timedelta(hours=6, minutes=1))
    assert src.consensus_calls == 2


def test_consensus_failure_keeps_cache(root):
    main.run(force=True, source=FakeSource(), now=NOW)
    main.run(force=True, source=FakeSource(fail=True), now=NOW + timedelta(hours=7))
    d = read_json()
    prot = next(x for x in d["selskaper"] if x["ticker"] == "PROT.OL")
    assert prot["konsensus"]["snitt"] == 132.0
    k = next(s for s in d["kilder"] if s["navn"] == "yahoo_konsensus")
    assert k["ok"] is False


def _b64(d):
    import base64
    return base64.b64encode(json.dumps(d).encode()).decode()


def test_add_target_via_form_updates_json(root):
    main.run(force=True, source=FakeSource(), now=NOW)
    r = main.add_target(_b64({"ticker": "PROT.OL", "meglerhus": "Pareto Securities", "kursmal": "121,5",
                              "anbefaling": "kjøp", "dato": "2026-09-20", "notat": "Q3 sterk\nny linje"}), now=NOW)
    assert r["ok"], r
    r2 = main.add_target(_b64({"ticker": "PROT.OL", "meglerhus": "DNB Carnegie", "kursmal": "99",
                               "anbefaling": "hold", "dato": "2026-05-01"}), now=NOW)
    assert r2["ok"], r2
    prot = next(x for x in read_json()["selskaper"] if x["ticker"] == "PROT.OL")
    m = prot["megler"]
    # Meglersnitt = (121,5 + 99) / 2 = 110,25 → oppside (110,25 − 110) / 110 = 0,23 %
    assert m["snitt"] == 110.25 and m["antall"] == 2 and m["antall_ferske"] == 1
    assert m["oppside_pct"] == 0.23 and m["farge"] == "gul"
    dnb = next(x for x in m["siste"] if x["meglerhus"] == "DNB Carnegie")
    assert dnb["gammel"] is True and dnb["alder_dager"] == 150
    csv_text = (root / "config" / "broker_targets.csv").read_text(encoding="utf-8-sig")
    assert "2026-09-20;PROT.OL;Pareto Securities;121,5;kjøp;;Q3 sterk ny linje" in csv_text


def test_add_target_rejects_bad_input(root):
    main.run(force=True, source=FakeSource(), now=NOW)
    bad = [
        {"ticker": "DNB.OL", "meglerhus": "X", "kursmal": "100"},              # ikke i porteføljen
        {"ticker": "PROT.OL", "meglerhus": "", "kursmal": "100"},             # mangler meglerhus
        {"ticker": "PROT.OL", "meglerhus": "X", "kursmal": "abc"},            # ikke tall
        {"ticker": "PROT.OL", "meglerhus": "X", "kursmal": "1100"},           # 10x kurs → tastefeil
        {"ticker": "PROT.OL", "meglerhus": "X", "kursmal": "100", "anbefaling": "kanskje"},
        {"ticker": "PROT.OL", "meglerhus": "X", "kursmal": "100", "dato": "2030-01-01"},
    ]
    for payload in bad:
        assert main.add_target(_b64(payload), now=NOW)["ok"] is False, payload
    assert main.add_target("ikke-base64!!", now=NOW)["ok"] is False
    ok = {"ticker": "PROT.OL", "meglerhus": "SEB", "kursmal": "120", "dato": "2026-09-01"}
    assert main.add_target(_b64(ok), now=NOW)["ok"]
    assert main.add_target(_b64(ok), now=NOW)["ok"] is False  # duplikat
    # Shell-tegn i notatet er ufarlige fordi alt går som base64
    evil = {**ok, "kursmal": "121", "notat": "'; rm -rf ~ #"}
    assert main.add_target(_b64(evil), now=NOW)["ok"]
