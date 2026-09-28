"""Beregninger. Alle formler er samlet her, slik at de er lette å kontrollere.

Konvensjoner:
  * Oppside lagres som BRØK internt (0,10 = 10 %) og gjøres om til prosent
    først i data.json.
  * Kursmål og kurs må være i SAMME valuta. Det er de alltid her: Yahoo,
    meglerhusene og du oppgir kursmål i aksjens handelsvaluta (NOK for
    Oslo, SEK for Stockholm). Det trengs derfor ingen valutaomregning for
    oppside. Omregning SEK→NOK brukes bare når vi summerer eller
    sammenligner beløp på tvers av børser (steg 4–5).
"""
from __future__ import annotations

from statistics import mean

# Fargegrenser for oppside (brøk). Grensene er inkluderende mot gul:
#   oppside  > 15 %           → grønn
#   −5 % ≤ oppside ≤ 15 %     → gul
#   oppside  < −5 %           → rød
GREEN_ABOVE = 0.15
RED_BELOW = -0.05

# Et meglerkursmål regnes som gammelt når det er eldre enn dette.
OLD_TARGET_DAYS = 90


def upside(target: float | None, price: float | None) -> float | None:
    """Oppside = (kursmål − markedskurs) / markedskurs

    Intuisjon: hvor mye kursen må endre seg for å nå kursmålet.
    Eksempel: kurs 400, kursmål 440 → (440 − 400) / 400 = 40 / 400 = 0,10 = +10 %.
    Negativ oppside betyr at aksjen handles OVER kursmålet (nedside).
    Mangler kursmål eller kurs → None (vises som «–»).
    """
    if target is None or price is None or price <= 0:
        return None
    return (target - price) / price


def color(u: float | None) -> str | None:
    """Fargekode for en oppside (brøk): 'gronn', 'gul', 'rod' eller None."""
    if u is None:
        return None
    if u > GREEN_ABOVE:
        return "gronn"
    if u >= RED_BELOW:
        return "gul"
    return "rod"


def broker_average(latest_targets: list[float]) -> float | None:
    """Meglersnitt = aritmetisk gjennomsnitt av SISTE kursmål per meglerhus.

    Hvert meglerhus teller én gang, selv om det har revidert kursmålet
    mange ganger. Gamle kursmål (> 90 dager) tas med, men markeres i widgeten.
    Eksempel: Pareto 440, DNB Carnegie 420, Arctic 470
              → (440 + 420 + 470) / 3 = 1330 / 3 = 443,33
    """
    return mean(latest_targets) if latest_targets else None


def pct_change(new: float | None, old: float | None) -> float | None:
    """Endring i kursmål = (nytt − forrige) / forrige. Eksempel: 400 → 440 = +10 %."""
    if new is None or old is None or old <= 0:
        return None
    return (new - old) / old


def to_pct(u: float | None, digits: int = 2) -> float | None:
    return None if u is None else round(u * 100, digits)
