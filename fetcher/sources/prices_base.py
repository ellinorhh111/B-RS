"""Kildeuavhengig grensesnitt for kursdata."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol


@dataclass
class Quote:
    ticker: str
    price: float | None
    prev_close: float | None
    currency: str | None
    market_time: datetime | None  # tidspunkt for siste handel/kurs (UTC)
    exchange: str | None = None
    name: str | None = None
    daily_closes: list[tuple[str, float]] = field(default_factory=list)  # (YYYY-MM-DD, sluttkurs)

    @property
    def change_pct(self) -> float | None:
        """Dagsendring i prosent.

        Dagsendring = (siste kurs − forrige sluttkurs) / forrige sluttkurs × 100
        Eksempel: siste 105, forrige slutt 100 → (105 − 100) / 100 × 100 = +5 %.
        """
        if self.price is None or not self.prev_close:
            return None
        return (self.price - self.prev_close) / self.prev_close * 100


@dataclass
class TickerInfo:
    """Brukes av `verify` for å sjekke at en ticker er det selskapet vi tror."""

    ticker: str
    found: bool
    name: str | None = None
    exchange: str | None = None
    currency: str | None = None
    quote_type: str | None = None
    price: float | None = None
    market_time: datetime | None = None
    error: str | None = None


class PriceSource(Protocol):
    name: str

    def quotes(self, tickers: list[str]) -> tuple[dict[str, Quote], dict[str, str]]:
        """Returnerer (kurser per ticker, feilmelding per ticker som feilet)."""
        ...

    def describe(self, ticker: str) -> TickerInfo: ...
