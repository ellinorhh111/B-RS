from datetime import date, datetime, timedelta

from fetcher.schedule import (OSLO, _easter, is_market_hours, is_trading_day, next_expected_run,
                              should_run)


def oslo(*a):
    return datetime(*a, tzinfo=OSLO)


def test_easter():
    assert _easter(2026) == date(2026, 4, 5)
    assert _easter(2027) == date(2027, 3, 28)


def test_market_hours():
    assert is_market_hours(oslo(2026, 9, 28, 9, 0))
    assert is_market_hours(oslo(2026, 9, 28, 17, 30))
    assert not is_market_hours(oslo(2026, 9, 28, 17, 31))
    assert not is_market_hours(oslo(2026, 9, 26, 12, 0))  # lørdag


def test_holidays():
    assert not is_trading_day(date(2026, 12, 25))  # stengt begge steder
    assert is_trading_day(date(2026, 5, 25))  # 2. pinsedag: Oslo stengt, Stockholm åpen
    assert is_trading_day(date(2026, 6, 6)) is False  # lørdag uansett
    assert not is_trading_day(date(2026, 4, 3))  # langfredag


def test_should_run():
    now = oslo(2026, 9, 28, 20, 0)
    assert should_run(now, None)[0]
    assert should_run(now, now - timedelta(minutes=5), force=True)[0]
    assert not should_run(now, now - timedelta(minutes=30))[0]
    assert should_run(now, now - timedelta(minutes=59))[0]  # slakk
    assert should_run(oslo(2026, 9, 28, 10, 0), oslo(2026, 9, 28, 9, 55))[0]


def test_next_run_after_close_is_one_hour_later():
    # Kjøring 17:30 (siste i åpningstiden) → neste henting ca. 18:30, ikke 17:35.
    t = oslo(2026, 9, 28, 17, 30)
    nxt = next_expected_run(t).astimezone(OSLO)
    assert nxt.hour == 18 and 25 <= nxt.minute <= 30


def test_next_run_evening_before_open():
    t = oslo(2026, 9, 29, 8, 30)
    assert next_expected_run(t).astimezone(OSLO) == oslo(2026, 9, 29, 9, 0)
