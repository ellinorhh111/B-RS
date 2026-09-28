from datetime import datetime, timezone

import pandas as pd

from fetcher.sources.prices_yahoo import quote_from_history

TZ = "Europe/Oslo"


def df(rows):
    idx = pd.DatetimeIndex([pd.Timestamp(d, tz=TZ) for d, _ in rows])
    return pd.DataFrame({"Close": [c for _, c in rows]}, index=idx)


def ts(s):
    return int(datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp())


def test_intraday_with_todays_bar():
    q = quote_from_history("PROT.OL", df([("2026-09-24", 100.0), ("2026-09-25", 102.0), ("2026-09-28", 104.0)]),
                           {"regularMarketPrice": 105.0, "regularMarketTime": ts("2026-09-28T10:00:00"),
                            "exchangeTimezoneName": TZ, "currency": "NOK"})
    assert q.price == 105.0 and q.prev_close == 102.0
    assert round(q.change_pct, 4) == round((105 - 102) / 102 * 100, 4)


def test_today_bar_missing_uses_last_bar_as_prev():
    q = quote_from_history("PROT.OL", df([("2026-09-24", 100.0), ("2026-09-25", 102.0)]),
                           {"regularMarketPrice": 101.0, "regularMarketTime": ts("2026-09-28T08:00:00"),
                            "exchangeTimezoneName": TZ})
    assert q.prev_close == 102.0


def test_weekend_shows_last_trading_day_change():
    q = quote_from_history("PROT.OL", df([("2026-09-24", 100.0), ("2026-09-25", 102.0)]),
                           {"regularMarketPrice": 102.0, "regularMarketTime": ts("2026-09-25T15:25:00"),
                            "exchangeTimezoneName": TZ})
    assert q.prev_close == 100.0


def test_no_data_returns_none():
    assert quote_from_history("X.OL", pd.DataFrame(), {}) is None


def test_nan_rows_skipped():
    q = quote_from_history("X.OL", df([("2026-09-24", 100.0), ("2026-09-25", float("nan"))]), {})
    assert q.price == 100.0 and q.prev_close is None and q.change_pct is None


def test_consensus_from_info():
    from fetcher.sources.prices_yahoo import consensus_from_info

    c = consensus_from_info("PROT.OL", {"targetMeanPrice": 450.0, "targetHighPrice": 500, "targetLowPrice": 380,
                                        "targetMedianPrice": 455, "numberOfAnalystOpinions": 5,
                                        "recommendationKey": "buy", "recommendationMean": 2.0, "currency": "NOK"})
    assert (c.mean, c.high, c.low, c.n_analysts, c.recommendation) == (450.0, 500, 380, 5, "buy")
    # Ingen dekning: Yahoo gir ofte recommendationKey="none" og ingen kursmål
    assert consensus_from_info("SBNOR.OL", {"recommendationKey": "none", "currency": "NOK"}) is None
    # NaN/0 behandles som manglende
    c2 = consensus_from_info("X.OL", {"targetMeanPrice": float("nan"), "numberOfAnalystOpinions": 2})
    assert c2.mean is None and c2.n_analysts == 2
