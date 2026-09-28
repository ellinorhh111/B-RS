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


@dataclass
class Consensus:
    """Analytikerkonsensus (kursmål og anbefaling) fra kursleverandøren."""

    ticker: str
    mean: float | None  # gjennomsnittlig kursmål
    median: float | None
    high: float | None
    low: float | None
    n_analysts: int | None
    recommendation: str | None  # strong_buy / buy / hold / underperform / sell
    recommendation_mean: float | None  # 1 = sterkt kjøp … 5 = selg
    currency: str | None  # kursmålet er i aksjens handelsvaluta


@dataclass
class Fundamentals:
    """Nøkkeltall. Alle forholdstall er valutanøytrale; markedsverdi er i handelsvalutaen.

    Brøker, ikke prosent: roe 0,14 = 14 %, direkteavkastning 0,05 = 5 %.
    None = mangler hos kilden (vises som «–»).
    """

    ticker: str
    name: str | None
    quote_type: str | None
    exchange: str | None
    currency: str | None
    price: float | None
    pb: float | None
    pe: float | None
    div_yield: float | None
    roe: float | None
    market_cap: float | None


class PriceSource(Protocol):
    name: str

    def consensus(self, tickers: list[str]) -> tuple[dict[str, Consensus], dict[str, str]]:
        """Returnerer (konsensus per ticker, feilmelding per ticker som feilet)."""
        ...

    def quotes(self, tickers: list[str]) -> tuple[dict[str, Quote], dict[str, str]]:
        """Returnerer (kurser per ticker, feilmelding per ticker som feilet)."""
        ...

    def describe(self, ticker: str) -> TickerInfo: ...

    def fundamentals(self, tickers: list[str]) -> tuple[dict[str, Fundamentals], dict[str, str]]: ...
