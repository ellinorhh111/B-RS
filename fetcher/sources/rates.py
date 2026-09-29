"""10-årige statsrenter fra sentralbankenes åpne API-er (gratis, uten nøkkel).

Norge:  Norges Bank, datasettet GOVT_GENERIC_RATES (generiske statsrenter, 10 år).
        Publiseres hver virkedag (mid-rente kl. 16), SDMX-JSON.
Sverige: Riksbanken, SWEA-API, serie SEGVB10YC (10-årig statsobligasjon).

Begge hentes via web.fetch, altså med robots.txt-sjekk. Endring vises i basispunkter:
  Endring (bp) = (siste rente − forrige rente) × 100
  Eksempel: 3,95 % → 4,02 % gir (4,02 − 3,95) × 100 = +7 bp.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, timedelta

from . import web

NORGES_BANK_10Y = ("https://data.norges-bank.no/api/data/GOVT_GENERIC_RATES/B.10Y.GBON"
                   "?format=sdmx-json&lastNObservations=5&locale=no")
RIKSBANK_10Y = "https://api.riksbank.se/swea/v1/Observations/SEGVB10YC/{frm}"


@dataclass
class Yield:
    land: str
    rente: float  # prosent, f.eks. 3,95
    dato: str
    forrige: float | None

    @property
    def endring_bp(self) -> float | None:
        return None if self.forrige is None else round((self.rente - self.forrige) * 100, 1)


def parse_norges_bank(body: bytes) -> Yield:
    """SDMX-JSON: tar første serie og de to siste observasjonene (sortert på tidsindeks)."""
    try:
        d = json.loads(body)
        ds = d["data"]["dataSets"][0]["series"]
        series = next(iter(ds.values()))["observations"]
        times = d["data"]["structure"]["dimensions"]["observation"][0]["values"]
        obs = sorted((int(k), float(v[0])) for k, v in series.items() if v and v[0] not in (None, "NaN"))
    except (ValueError, KeyError, IndexError, StopIteration, TypeError) as e:
        raise ValueError(f"uventet svar fra Norges Bank: {e}") from e
    if not obs:
        raise ValueError("Norges Bank: ingen observasjoner")
    (i_last, last) = obs[-1]
    prev = obs[-2][1] if len(obs) > 1 else None
    return Yield("NO", last, times[i_last].get("id", ""), prev)


def parse_riksbank(body: bytes) -> Yield:
    try:
        rows = sorted((r["date"], float(r["value"])) for r in json.loads(body) if r.get("value") is not None)
    except (ValueError, KeyError, TypeError) as e:
        raise ValueError(f"uventet svar fra Riksbanken: {e}") from e
    if not rows:
        raise ValueError("Riksbanken: ingen observasjoner")
    return Yield("SE", rows[-1][1], rows[-1][0], rows[-2][1] if len(rows) > 1 else None)


def ten_year_yields(today: date) -> tuple[dict[str, Yield], dict[str, str]]:
    out, errors = {}, {}
    for land, fetch_parse in (
        ("NO", lambda: parse_norges_bank(web.fetch(NORGES_BANK_10Y))),
        ("SE", lambda: parse_riksbank(web.fetch(RIKSBANK_10Y.format(frm=(today - timedelta(days=14)).isoformat())))),
    ):
        try:
            out[land] = fetch_parse()
        except (web.NotAllowed, web.FetchError, ValueError) as e:
            errors[land] = str(e)
    return out, errors
