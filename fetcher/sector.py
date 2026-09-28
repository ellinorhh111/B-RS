"""Peer-tabell, peer-medianer, «Sektor i dag» og verdsettelse av mine selskaper mot peers.

Konvensjoner (se også calc.py):
  * P/B, P/E, direkteavkastning og ROE er forholdstall og dermed valutanøytrale –
    de kan sammenlignes direkte mellom NOK- og SEK-aksjer.
  * Markedsverdi summeres/sorteres på tvers av børser, så SEK-verdier regnes om til
    NOK med SEKNOK fra Yahoo. Kursen og tidspunktet vises i widgeten.
  * Peer-median regnes per type (bank / forbruksbank / forsikring) og UTEN mine egne
    selskaper, slik at jeg sammenligner meg med de andre, ikke med meg selv.
  * «Sektor i dag» er et likevektet snitt av dagsendringen (hver aksje teller likt),
    ikke markedsvektet. Banker = bank + forbruksbank.
"""
from __future__ import annotations

from . import calc
from .peerconfig import Override, Peer, looks_like_equity_certificate
from .store import Store

METRICS = ("pb", "pe", "dy", "roe")


def _change_pct(q) -> float | None:
    if not q or q["price"] is None or not q["prev_close"]:
        return None
    return (q["price"] - q["prev_close"]) / q["prev_close"] * 100


def fx_sek_nok(store: Store) -> dict | None:
    q = store.get_quote("SEKNOK=X")
    if not q or not q["price"]:
        return None
    return {"par": "SEK/NOK", "kurs": q["price"], "tid": q["market_time"] or q["fetched_at"]}


def _metrics(store: Store, ticker: str, is_ekb: bool, ov: Override | None) -> tuple[dict, list[str]]:
    """Nøkkeltall for én ticker: Yahoo → EK-bevis-korreksjon → dine overstyringer (vinner alltid)."""
    f = store.get_fundamentals(ticker)
    pb = f["pb"] if f else None
    pe = f["pe"] if f else None
    dy = f["div_yield"] if f else None
    roe = f["roe"] if f else None
    notes = []
    pb, pe, note = calc.adjust_equity_certificate(pb, pe, is_ekb, ov.eierbrok if ov else None)
    if note:
        notes.append(note)
    src = {k: ("yahoo" if v is not None else None) for k, v in (("pb", pb), ("pe", pe), ("dy", dy), ("roe", roe))}
    if ov:
        for key, val in (("pb", ov.pb), ("pe", ov.pe), ("dy", ov.div_yield), ("roe", ov.roe)):
            if val is not None:
                if key == "pb":
                    pb = val
                elif key == "pe":
                    pe = val
                elif key == "dy":
                    dy = val
                else:
                    roe = val
                src[key] = "manuell"
        if any(v == "manuell" for v in src.values()):
            notes.append(f"Manuelle tall fra overrides.csv{' (' + ov.dato + ')' if ov.dato else ''}"
                         f"{': ' + ov.kommentar if ov.kommentar else ''}")
    return ({"pb": pb, "pe": pe, "dy": dy, "roe": roe, "kilde": src,
             "mcap": f["market_cap"] if f else None, "valuta_mcap": f["currency"] if f else None}, notes)


def _row(store: Store, ticker: str, navn: str, bors: str, typ: str, is_ekb: bool, mine: bool,
         ov: Override | None, fx: dict | None) -> dict:
    q = store.get_quote(ticker)
    m, notes = _metrics(store, ticker, is_ekb, ov)
    mcap_nok = m["mcap"]
    if mcap_nok is not None and m["valuta_mcap"] == "SEK":
        mcap_nok = mcap_nok * fx["kurs"] if fx else None  # uten valutakurs: ikke gjett
    return {
        "ticker": ticker, "navn": navn, "bors": bors, "type": typ, "ekb": is_ekb, "mine": mine,
        "kurs": q["price"] if q else None, "valuta": (q["currency"] if q else None),
        "endring_pct": None if _change_pct(q) is None else round(_change_pct(q), 3),
        "pb": m["pb"], "pe": m["pe"], "dy_pct": calc.to_pct(m["dy"]), "roe_pct": calc.to_pct(m["roe"]),
        "mcap_mrd_nok": None if mcap_nok is None else round(mcap_nok / 1e9, 2),
        "kilde": m["kilde"], "merknad": " · ".join(notes) or None,
    }


def build(store: Store, peers: list[Peer], holdings, overrides: dict[str, Override], types: dict[str, str]) -> dict:
    """types: type for mine egne selskaper (ticker → bank/forbruksbank/forsikring)."""
    fx = fx_sek_nok(store)
    own = {h.ticker for h in holdings}
    rows = [_row(store, p.ticker, p.navn, p.bors, p.type, p.ekb, False, overrides.get(p.ticker), fx)
            for p in peers if p.ticker not in own]
    for h in holdings:
        rows.append(_row(store, h.ticker, h.navn, h.bors, types.get(h.ticker, "bank"),
                         looks_like_equity_certificate(h.navn), True, overrides.get(h.ticker), fx))

    # Peer-median per type, uten mine egne selskaper.
    medians = {}
    for typ in ("bank", "forbruksbank", "forsikring"):
        grp = [r for r in rows if r["type"] == typ and not r["mine"]]
        medians[typ] = {
            "n": len(grp),
            "pb": calc.median_of(r["pb"] for r in grp),
            "pe": calc.median_of(r["pe"] for r in grp),
            "dy_pct": calc.median_of(r["dy_pct"] for r in grp),
            "roe_pct": calc.median_of(r["roe_pct"] for r in grp),
        }

    # Sektor i dag: likevektet snitt av dagsendring, og 3 beste / 3 svakeste.
    with_change = [r for r in rows if r["endring_pct"] is not None]
    banks = [r["endring_pct"] for r in with_change if r["type"] in ("bank", "forbruksbank")]
    ins = [r["endring_pct"] for r in with_change if r["type"] == "forsikring"]
    ranked = sorted(with_change, key=lambda r: r["endring_pct"], reverse=True)
    brief = lambda r: {"ticker": r["ticker"], "navn": r["navn"], "endring_pct": r["endring_pct"], "mine": r["mine"]}  # noqa: E731
    today = {
        "bank": {"snitt_pct": _r(calc.average_of(banks)), "n": len(banks)},
        "forsikring": {"snitt_pct": _r(calc.average_of(ins)), "n": len(ins)},
        "beste": [brief(r) for r in ranked[:3]],
        "svakeste": [brief(r) for r in ranked[-3:][::-1]] if len(ranked) > 3 else [],
    }

    # Verdsettelse av mine selskaper mot peer-medianen for samme type.
    valuation = {}
    for r in rows:
        if not r["mine"]:
            continue
        med = medians[r["type"]]
        valuation[r["ticker"]] = {
            "type": r["type"],
            "fokus": ["pe", "pb", "dy_pct"] if r["type"] == "forsikring" else ["pb", "roe_pct"],
            "egen": {k: r[k] for k in ("pb", "pe", "dy_pct", "roe_pct")},
            "median": med,
            "merknad": r["merknad"],
        }
    return {"peers": rows, "peer_median": medians, "sektor_i_dag": today, "verdsettelse": valuation, "valuta": fx}


def _r(v: float | None) -> float | None:
    return None if v is None else round(v, 2)
