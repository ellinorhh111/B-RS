"""Kursdata fra Yahoo Finance via yfinance.

yfinance er et uoffisielt bibliotek og kan slutte å virke når Yahoo endrer
nettsiden sin. Derfor er ALL bruk av yfinance samlet i denne filen.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone

from .prices_base import Consensus, Quote, TickerInfo

log = logging.getLogger(__name__)


def _to_utc(v) -> datetime | None:
    """Yahoo gir tid enten som epoch-sekunder eller som pandas Timestamp."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return datetime.fromtimestamp(v, tz=timezone.utc)
    if hasattr(v, "to_pydatetime"):
        v = v.to_pydatetime()
    if isinstance(v, datetime):
        return v.astimezone(timezone.utc) if v.tzinfo else v.replace(tzinfo=timezone.utc)
    return None


def _short(e: Exception, n: int = 160) -> str:
    msg = f"{type(e).__name__}: {e}".split(" See https://")[0]
    return msg if len(msg) <= n else msg[: n - 1] + "…"


def quote_from_history(ticker: str, df, meta: dict) -> Quote | None:
    """Lager et Quote fra dagsdata (DataFrame med 'Close') og Yahoos metadata.

    Siste kurs: 'regularMarketPrice' fra metadata (oppdateres løpende i
    åpningstiden, med ca. 15 min forsinkelse), ellers siste sluttkurs.

    Forrige sluttkurs: sluttkursen for handelsdagen FØR dagen siste kurs
    gjelder. Hvis Yahoo ennå ikke har laget en dagsrad for i dag, men
    regularMarketTime er fra i dag, er forrige sluttkurs = siste rad.
    """
    closes: list[tuple[date, float]] = []
    if df is not None and not df.empty and "Close" in df:
        for idx, val in df["Close"].items():
            if val is None or val != val:  # NaN
                continue
            d = idx.date() if hasattr(idx, "date") else idx
            closes.append((d, float(val)))
    meta = meta or {}
    price = meta.get("regularMarketPrice")
    market_time = _to_utc(meta.get("regularMarketTime"))
    if price is None and closes:
        price = closes[-1][1]
    if price is None:
        return None

    prev_close = None
    if closes:
        last_day = closes[-1][0]
        # Datoen siste kurs gjelder, i børsens lokale tid (samme dag i Oslo/Stockholm).
        tz_name = meta.get("exchangeTimezoneName")
        if market_time and tz_name:
            from zoneinfo import ZoneInfo

            mt_day = market_time.astimezone(ZoneInfo(tz_name)).date()
        else:
            mt_day = last_day
        if mt_day > last_day:
            prev_close = closes[-1][1]
        elif len(closes) >= 2:
            prev_close = closes[-2][1]
    if prev_close is None:
        prev_close = meta.get("chartPreviousClose") if not closes else None

    return Quote(
        ticker=ticker,
        price=float(price),
        prev_close=float(prev_close) if prev_close is not None else None,
        currency=meta.get("currency"),
        market_time=market_time,
        exchange=meta.get("fullExchangeName") or meta.get("exchangeName"),
        name=meta.get("longName") or meta.get("shortName"),
        daily_closes=[(d.isoformat(), c) for d, c in closes],
    )


def _num(v) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f == f and f > 0 else None  # NaN og 0 betyr «mangler» hos Yahoo


def consensus_from_info(ticker: str, info: dict) -> Consensus | None:
    """Plukker konsensusfeltene ut av Yahoos info-ordbok (modulen financialData).

    Yahoo oppgir kursmål i aksjens handelsvaluta (NOK for .OL, SEK for .ST).
    Mangler både snitt og antall analytikere, regnes det som «ingen dekning».
    """
    info = info or {}
    mean = _num(info.get("targetMeanPrice"))
    n = info.get("numberOfAnalystOpinions")
    n = int(n) if isinstance(n, (int, float)) and n == n and n > 0 else None
    if mean is None and n is None:
        return None
    rec = info.get("recommendationKey")
    return Consensus(
        ticker=ticker,
        mean=mean,
        median=_num(info.get("targetMedianPrice")),
        high=_num(info.get("targetHighPrice")),
        low=_num(info.get("targetLowPrice")),
        n_analysts=n,
        recommendation=rec if rec and rec != "none" else None,
        recommendation_mean=_num(info.get("recommendationMean")),
        currency=info.get("currency"),
    )


class YahooPriceSource:
    name = "yahoo"

    def consensus(self, tickers: list[str]) -> tuple[dict[str, Consensus], dict[str, str]]:
        import yfinance as yf

        out: dict[str, Consensus] = {}
        errors: dict[str, str] = {}
        for t in tickers:
            try:
                c = consensus_from_info(t, yf.Ticker(t).info)
                if c is None:
                    # Ikke en feil: mange nordiske aksjer har ingen konsensus hos Yahoo.
                    log.info("Ingen Yahoo-konsensus for %s", t)
                else:
                    out[t] = c
            except Exception as e:  # noqa: BLE001
                errors[t] = _short(e)
                log.warning("Yahoo-konsensus feilet for %s: %s", t, errors[t])
                log.debug("Detaljer for %s", t, exc_info=True)
        return out, errors

    def quotes(self, tickers: list[str]) -> tuple[dict[str, Quote], dict[str, str]]:
        import yfinance as yf

        out: dict[str, Quote] = {}
        errors: dict[str, str] = {}
        for t in tickers:
            try:
                tk = yf.Ticker(t)
                # auto_adjust=False: vi vil ha faktiske (ikke utbyttejusterte) kurser.
                df = tk.history(period="5d", interval="1d", auto_adjust=False)
                meta = tk.get_history_metadata() or {}
                q = quote_from_history(t, df, meta)
                if q is None:
                    errors[t] = "Yahoo returnerte ingen kursdata (feil ticker eller midlertidig feil)"
                else:
                    out[t] = q
            except Exception as e:  # noqa: BLE001 – én ticker skal aldri stoppe resten
                errors[t] = _short(e)
                log.warning("Yahoo-feil for %s: %s", t, errors[t])
                log.debug("Detaljer for %s", t, exc_info=True)
        return out, errors

    def describe(self, ticker: str) -> TickerInfo:
        import yfinance as yf

        try:
            tk = yf.Ticker(ticker)
            df = tk.history(period="5d", interval="1d", auto_adjust=False)
            meta = tk.get_history_metadata() or {}
            q = quote_from_history(ticker, df, meta)
            info = {}
            try:
                info = tk.info or {}
            except Exception as e:  # noqa: BLE001 – info er bare tillegg
                log.warning("Yahoo .info feilet for %s: %s", ticker, e)
            if q is None and not info.get("longName"):
                return TickerInfo(ticker, found=False, error="ingen data fra Yahoo")
            return TickerInfo(
                ticker=ticker,
                found=q is not None,
                name=info.get("longName") or info.get("shortName") or (q.name if q else None),
                exchange=info.get("fullExchangeName") or info.get("exchange") or (q.exchange if q else None),
                currency=info.get("currency") or (q.currency if q else None),
                quote_type=info.get("quoteType") or meta.get("instrumentType"),
                price=q.price if q else None,
                market_time=q.market_time if q else None,
                error=None if q else "fant selskapet, men ingen kurs",
            )
        except Exception as e:  # noqa: BLE001
            log.debug("Yahoo describe-feil for %s", ticker, exc_info=True)
            return TickerInfo(ticker, found=False, error=_short(e))
