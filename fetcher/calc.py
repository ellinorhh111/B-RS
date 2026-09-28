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

from statistics import mean, median

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


# --- peers og verdsettelse -----------------------------------------------------

def adjust_equity_certificate(pb: float | None, pe: float | None, is_ekb: bool,
                              eierbrok: float | None) -> tuple[float | None, float | None, str | None]:
    """Korrigerer Yahoos P/B og P/E for egenkapitalbevis (EK-bevis).

    Intuisjon: I en sparebank med EK-bevis eier bevisholderne bare sin andel av
    egenkapitalen og overskuddet (eierbrøken); resten tilhører grunnfondet.
    Yahoo ser ut til å fordele HELE egenkapitalen og HELE overskuddet på bevisene,
    så bokført verdi og resultat per bevis blir for høye, og P/B og P/E for lave.

      Riktig P/B = Kurs / (Eierbrøk × Egenkapital / Antall bevis) = P/B_Yahoo / Eierbrøk
      Riktig P/E = P/E_Yahoo / Eierbrøk

    Eksempel: P/B_Yahoo 0,12 og eierbrøk 12 % → 0,12 / 0,12 = 1,0.
    Uten kjent eierbrøk returneres None («–») i stedet for et misvisende tall.
    Direkteavkastning og ROE påvirkes ikke og korrigeres derfor ikke her.
    """
    if not is_ekb:
        return pb, pe, None
    if not eierbrok:
        return None, None, "EK-bevis: P/B og P/E vises ikke før eierbrøk er lagt inn (overrides.csv)"
    return (None if pb is None else pb / eierbrok, None if pe is None else pe / eierbrok,
            f"EK-bevis: P/B og P/E korrigert for eierbrøk {eierbrok * 100:.1f} %")


def median_of(values) -> float | None:
    """Median av tallene som finnes (None hoppes over). Median i stedet for snitt, så
    én ekstrem verdi (f.eks. en nettmegler med P/B 10) ikke trekker sammenligningen skjevt."""
    v = [x for x in values if x is not None]
    return median(v) if v else None


def average_of(values) -> float | None:
    v = [x for x in values if x is not None]
    return mean(v) if v else None
