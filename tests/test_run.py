import json
from datetime import datetime, timedelta, timezone

from fetcher import main, paths, verify
from fetcher.sources.prices_base import Quote, TickerInfo
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


NOW = datetime(2026, 9, 28, 10, 0, tzinfo=timezone.utc)


def read_json():
    return json.loads(paths.json_path().read_text(encoding="utf-8"))


def test_run_writes_json(root):
    main.run(force=True, source=FakeSource(missing={"NOBA.ST"}), now=NOW)
    d = read_json()
    c = {x["ticker"]: x for x in d["selskaper"]}
    assert c["PROT.OL"]["kurs"] == 110.0 and c["PROT.OL"]["endring_pct"] == 10.0
    assert c["NOBA.ST"]["kurs"] is None  # mangler → null, ingen krasj
    assert c["SBNOR.OL"]["mitt_kursmal"] is None
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
