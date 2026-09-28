"""All kontakt med eksterne datakilder skjer i denne pakken.

Resten av koden kjenner bare grensesnittene i prices_base.py. For å bytte
kursleverandør (hvis yfinance slutter å virke) lager du en ny klasse som
implementerer PriceSource og endrer get_price_source() nedenfor.
"""
from __future__ import annotations

from .prices_base import PriceSource


def get_price_source() -> PriceSource:
    from .prices_yahoo import YahooPriceSource

    return YahooPriceSource()
