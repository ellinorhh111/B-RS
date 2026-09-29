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

# Nøkkelen «all» henter alle seriene i datasettet (alle løpetider); vi plukker ut den som er
# merket 10 år og statsobligasjon. Da er vi ikke avhengige av rekkefølgen på dimensjonene.
NORGES_BANK_10Y = ("https://data.norges-bank.no/api/data/GOVT_GENERIC_RATES/all"
                   "?format=sdmx-json&startPeriod={frm}&locale=en")
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


def _pick_10y_series(d: dict) -> dict:
    """Finner serien for 10 år statsobligasjon. Serienøkler er indekser («0:2:1») inn i
    dimensjonslistene; vi slår opp id-ene og velger serien med «10Y» og ikke statskasseveksel."""
    series = d["data"]["dataSets"][0]["series"]
    if len(series) == 1:
        return next(iter(series.values()))
    dims = d["data"]["structure"]["dimensions"]["series"]
    for key, val in series.items():
        ids = [dims[i]["values"][int(j)]["id"].upper() for i, j in enumerate(key.split(":"))]
        if "10Y" in ids and not any(x.startswith("TB") for x in ids):
            return val
    raise ValueError("fant ingen 10-årsserie i svaret")


def parse_norges_bank(body: bytes) -> Yield:
    """SDMX-JSON: velger 10-årsserien og tar de to siste observasjonene (sortert på tidsindeks)."""
    try:
        d = json.loads(body)
        series = _pick_10y_series(d)["observations"]
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
        ("NO", lambda: parse_norges_bank(web.fetch(NORGES_BANK_10Y.format(frm=(today - timedelta(days=14)).isoformat())))),
        ("SE", lambda: parse_riksbank(web.fetch(RIKSBANK_10Y.format(frm=(today - timedelta(days=14)).isoformat())))),
    ):
        try:
            out[land] = fetch_parse()
        except (web.NotAllowed, web.FetchError, ValueError) as e:
            errors[land] = str(e)
    return out, errors
