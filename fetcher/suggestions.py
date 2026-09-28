"""Kursmålforslag fra nyhetsoverskrifter.

Leter etter overskrifter som «Pareto hever kursmålet på Protector til 480 kroner»,
«SEB höjer riktkursen för Noba till 95 kronor» eller «DNB Carnegie cuts target
price to NOK 200». Treffene er bare FORSLAG: de skrives aldri til
broker_targets.csv før du selv trykker «Bekreft» i widgeten.

Tolkningen er med vilje forsiktig. Et tall godtas bare hvis:
  * det står rett etter «til/till/to» eller rett etter ordet kursmål/riktkurs/target, og
  * det ligger mellom 0,25× og 4× dagens kurs (tar bort årstall, prosenter o.l.).
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from .csvio import parse_number
from .targets import KNOWN_BROKERS, SANITY_MAX, SANITY_MIN

# Ord som betyr «kursmål».
TARGET_WORDS = r"(?:kursmål(?:et)?|kursmal(?:et)?|riktkurs(?:en)?|target(?:\s+price)?|price\s+target|kursziel)"
UP_WORDS = r"(?:hever|øker|oppjusterer|höjer|hojer|raises?|ups|lifts?|increases?)"
DOWN_WORDS = r"(?:senker|kutter|nedjusterer|sänker|sanker|cuts?|lowers?|reduces?|trims?)"
NUM = r"(\d{1,5}(?:[  .]\d{3})*(?:[.,]\d{1,2})?)"
CUR = r"(?:\s*(?:kroner|kronor|kr\.?|nok|sek|dkk))?"

RE_FROM_TO = re.compile(rf"(?:fra|från|from)\s+(?:nok\s+|sek\s+|kr\s+)?{NUM}{CUR}\s+(?:til|till|to)\s+(?:nok\s+|sek\s+|kr\s+)?{NUM}", re.I)
RE_TO = re.compile(rf"{TARGET_WORDS}[^0-9]{{0,60}}?\b(?:til|till|to)\s+(?:nok\s+|sek\s+|kr\s+)?{NUM}", re.I)
RE_DIRECT = re.compile(rf"{TARGET_WORDS}\s*(?:på|of|om|:)?\s*(?:nok\s+|sek\s+|kr\s+)?{NUM}{CUR}\b", re.I)
RE_TARGET_WORD = re.compile(TARGET_WORDS, re.I)
RE_UP = re.compile(rf"\b{UP_WORDS}\b", re.I)
RE_DOWN = re.compile(rf"\b{DOWN_WORDS}\b", re.I)

RECOMMENDATION_PATTERNS = [
    ("kjøp", re.compile(r"\b(?:kjøp|kjøpsanbefaling|köp|köpråd|buy|outperform|overweight)\b", re.I)),
    ("selg", re.compile(r"\b(?:selg|sälj|sell|underperform|underweight)\b", re.I)),
    ("hold", re.compile(r"\b(?:hold|behåll|neutral|nøytral|market perform)\b", re.I)),
]

# Kortformer som brukes i overskrifter → navnet i broker_targets.csv.
BROKER_ALIASES = {
    "dnb carnegie": "DNB Carnegie", "dnb markets": "DNB Carnegie", "carnegie": "Carnegie",
    "pareto": "Pareto Securities", "arctic": "Arctic Securities", "abg": "ABG Sundal Collier",
    "sb1 markets": "SB1 Markets", "sparebank 1 markets": "SB1 Markets", "nordea": "Nordea",
    "danske bank": "Danske Bank", "seb": "SEB", "handelsbanken": "Handelsbanken", "shb": "Handelsbanken",
    "swedbank": "Swedbank", "kepler": "Kepler Cheuvreux", "clarksons": "Clarksons Securities",
    "fearnley": "Fearnley Securities", "norne": "Norne Securities", "redeye": "Redeye",
    "beringer": "Beringer Finance", "jefferies": "Jefferies", "morgan stanley": "Morgan Stanley",
    "goldman": "Goldman Sachs", "jp morgan": "JP Morgan", "jpmorgan": "JP Morgan", "ubs": "UBS",
    "citi": "Citi", "barclays": "Barclays", "berenberg": "Berenberg", "deutsche bank": "Deutsche Bank",
}
for _b in KNOWN_BROKERS:
    BROKER_ALIASES.setdefault(_b.lower(), _b)
# Lengste alias først, så «DNB Carnegie» vinner over «Carnegie».
_BROKER_RE = re.compile(
    r"\b(" + "|".join(re.escape(a) for a in sorted(BROKER_ALIASES, key=len, reverse=True)) + r")\b", re.I)


@dataclass
class Suggestion:
    ticker: str
    kursmal: float
    forrige: float | None
    meglerhus: str | None
    anbefaling: str | None
    retning: str | None  # «hever», «senker» eller None
    tittel: str
    kilde: str
    lenke: str
    publisert: str | None  # ISO

    @property
    def id(self) -> str:
        # Stabil id: samme overskrift + selskap gir samme forslag, selv fra ulike kilder.
        key = f"{self.ticker}|{self.kursmal:g}|{(self.meglerhus or '').lower()}|{self.tittel.lower()[:80]}"
        return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def _num(s: str) -> float | None:
    return parse_number(s.replace(" ", " "))


def _sane(v: float | None, price: float | None) -> bool:
    if v is None or v <= 0:
        return False
    if price:
        return SANITY_MIN * price <= v <= SANITY_MAX * price
    return 1 <= v <= 10000 and not (1990 <= v <= 2100 and float(v).is_integer())  # ikke årstall


def find_broker(title: str) -> str | None:
    m = _BROKER_RE.search(title)
    return BROKER_ALIASES[m.group(1).lower()] if m else None


def find_recommendation(title: str) -> str | None:
    for rec, pat in RECOMMENDATION_PATTERNS:
        if pat.search(title):
            return rec
    return None


def parse_title(title: str, price: float | None) -> tuple[float, float | None, str | None] | None:
    """Returnerer (nytt kursmål, forrige kursmål, retning) eller None hvis ingen sikker treff."""
    if not RE_TARGET_WORD.search(title):
        return None
    direction = "hever" if RE_UP.search(title) else "senker" if RE_DOWN.search(title) else None

    m = RE_FROM_TO.search(title)
    if m:
        old, new = _num(m.group(1)), _num(m.group(2))
        if _sane(new, price):
            if direction is None and old and new:
                direction = "hever" if new > old else "senker" if new < old else None
            return new, old if _sane(old, price) else None, direction
    for rx in (RE_TO, RE_DIRECT):
        m = rx.search(title)
        if m:
            new = _num(m.group(1))
            if _sane(new, price):
                return new, None, direction
    return None


def from_item(ticker: str, title: str, source: str, link: str, published: str | None,
              price: float | None) -> Suggestion | None:
    parsed = parse_title(title, price)
    if not parsed:
        return None
    new, old, direction = parsed
    return Suggestion(ticker, new, old, find_broker(title), find_recommendation(title), direction,
                      title, source, link, published)
