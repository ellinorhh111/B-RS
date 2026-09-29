"""Kommandolinje:

  python -m fetcher run [--force]   hent data (launchd bruker denne)
  python -m fetcher verify          sjekk at tickerne i portfolio.csv gir riktige data
  python -m fetcher export          skriv data.json på nytt fra cache (uten nett)
  python -m fetcher add-target B64  legg til kursmål (brukes av skjemaet i widgeten)
  python -m fetcher forslag bekreft|forkast ID   håndter kursmålforslag fra nyheter
  python -m fetcher probe           sjekk at nyhetskildene finnes og tillater henting (robots.txt)
"""
from __future__ import annotations

import argparse
import fcntl
import json
import logging
from contextlib import contextmanager
from datetime import datetime, timedelta

from . import export, logsetup, news, paths, schedule, targets
from .csvio import Holding, read_portfolio
from .sources import PriceSource, get_price_source
from .store import Store, parse_iso, utcnow

log = logging.getLogger("fetcher")

# Konsensus endrer seg sjelden; å hente den sjeldnere skåner Yahoo og gjør kjøringen raskere.
CONSENSUS_INTERVAL = timedelta(hours=6)
# Peers: kurser hvert 15. min (i åpningstiden), nøkkeltall to ganger i døgnet.
PEER_QUOTES_INTERVAL = timedelta(minutes=15)
FUNDAMENTALS_INTERVAL = timedelta(hours=12)
# Markedspanelet (Yahoo-tickere). SEKNOK=X brukes også til markedsverdi i NOK.
MARKET_TICKERS = {"OSEBX.OL": "OSEBX", "^OMX": "OMXS30", "NOK=X": "USD/NOK", "EURNOK=X": "EUR/NOK",
                  "SEKNOK=X": "SEK/NOK"}
FX_TICKERS = list(MARKET_TICKERS)
YIELDS_INTERVAL = timedelta(hours=3)


def load_holdings(store: Store, now: datetime, errors: list[str]) -> list[Holding]:
    try:
        holdings = read_portfolio(paths.config_dir() / "portfolio.csv")
        store.set_source_status("portfolio.csv", True, now)
        return holdings
    except Exception as e:  # noqa: BLE001
        log.exception("Kunne ikke lese portfolio.csv")
        store.set_source_status("portfolio.csv", False, now, str(e))
        errors.append(f"portfolio.csv: {e}")
        return []


def load_targets(store: Store, now: datetime, errors: list[str]) -> list[targets.BrokerTarget]:
    try:
        rows, warnings = targets.read_targets(paths.config_dir() / "broker_targets.csv")
        store.set_source_status("broker_targets.csv", not warnings, now, "; ".join(warnings) or None)
        errors.extend(warnings)
        return rows
    except Exception as e:  # noqa: BLE001
        log.exception("Kunne ikke lese broker_targets.csv")
        store.set_source_status("broker_targets.csv", False, now, str(e))
        errors.append(f"broker_targets.csv: {e}")
        return []


def fetch_quotes(store: Store, source: PriceSource, tickers: list[str], now: datetime, errors: list[str]) -> None:
    try:
        quotes, qerrors = source.quotes(tickers)
        store.save_quotes(quotes, source.name, now)
        errors.extend(f"{source.name} {t}: {msg}" for t, msg in qerrors.items())
        if quotes:
            store.set_source_status(source.name, True, now,
                                    "; ".join(f"{t}: {m}" for t, m in qerrors.items()) or None)
        else:
            store.set_source_status(source.name, False, now, next(iter(qerrors.values()), "ingen kurser hentet"))
        log.info("Kurser: %d ok, %d feilet", len(quotes), len(qerrors))
    except Exception as e:  # noqa: BLE001 – vis siste kjente data i stedet for å krasje
        log.exception("Kurskilden feilet")
        store.set_source_status(source.name, False, now, f"{type(e).__name__}: {e}")
        errors.append(f"{source.name}: {e}")


def _due(store: Store, key: str, interval: timedelta, now: datetime, force: bool) -> bool:
    last = parse_iso(store.get_meta(key))
    return force or last is None or now - last >= interval - timedelta(minutes=1)


def fetch_peers(store: Store, source: PriceSource, peer_tickers: list[str], own: list[str], now: datetime,
                errors: list[str], force: bool) -> None:
    """Kurser for peers (og valutakurs) hvert 15. min; nøkkeltall for peers + egne selskaper hvert 12. time."""
    if _due(store, "last_peer_quotes", PEER_QUOTES_INTERVAL, now, force):
        try:
            quotes, qerrors = source.quotes(peer_tickers + FX_TICKERS)
            store.save_quotes(quotes, source.name, now)
            store.set_source_status("yahoo_peers", len(quotes) > len(FX_TICKERS) // 2, now,
                                    f"{len(qerrors)} av {len(peer_tickers) + len(FX_TICKERS)} feilet" if qerrors else None)
            store.set_meta("last_peer_quotes", now.isoformat())
            log.info("Peer-kurser: %d ok, %d feilet", len(quotes), len(qerrors))
        except Exception as e:  # noqa: BLE001
            log.exception("Peer-kurser feilet")
            store.set_source_status("yahoo_peers", False, now, f"{type(e).__name__}: {e}")
            errors.append(f"yahoo_peers: {e}")
    if _due(store, "last_yields", YIELDS_INTERVAL, now, force):
        from .sources import rates

        found, rerrors = rates.ten_year_yields(now.date())
        if found:
            import json as _json

            old = _json.loads(store.get_meta("yields") or "{}")
            old.update({k: {"rente": y.rente, "forrige": y.forrige, "dato": y.dato, "endring_bp": y.endring_bp}
                        for k, y in found.items()})
            store.set_meta("yields", _json.dumps(old))
        store.set_source_status("statsrenter", bool(found), now,
                                "; ".join(f"{k}: {v}" for k, v in rerrors.items()) or None)
        store.set_meta("last_yields", now.isoformat())
    if _due(store, "last_fundamentals", FUNDAMENTALS_INTERVAL, now, force):
        try:
            found, ferrors = source.fundamentals(own + peer_tickers)
            store.save_fundamentals(found, source.name, now)
            store.set_source_status("yahoo_nokkeltall", bool(found), now,
                                    f"{len(ferrors)} tickere uten nøkkeltall" if ferrors else None)
            store.set_meta("last_fundamentals", now.isoformat())
            log.info("Nøkkeltall: %d ok, %d uten", len(found), len(ferrors))
        except Exception as e:  # noqa: BLE001
            log.exception("Nøkkeltall feilet")
            store.set_source_status("yahoo_nokkeltall", False, now, f"{type(e).__name__}: {e}")
            errors.append(f"yahoo_nokkeltall: {e}")


def consensus_due(store: Store, now: datetime, force: bool) -> bool:
    st = store.get_source_status("yahoo_konsensus")
    if force or st is None:
        return True
    last = parse_iso(st["last_attempt"])
    return last is None or now - last >= CONSENSUS_INTERVAL


def fetch_consensus(store: Store, source: PriceSource, tickers: list[str], now: datetime, errors: list[str]) -> None:
    name = f"{source.name}_konsensus"
    try:
        found, cerrors = source.consensus(tickers)
        ok_tickers = [t for t in tickers if t not in cerrors]
        store.save_consensus(found, ok_tickers, source.name, now)
        errors.extend(f"{name} {t}: {m}" for t, m in cerrors.items())
        all_failed = cerrors and len(cerrors) == len(tickers)
        store.set_source_status(name, not all_failed, now,
                                "; ".join(f"{t}: {m}" for t, m in cerrors.items()) or None)
        log.info("Konsensus: %d med dekning, %d uten, %d feilet",
                 len(found), len(ok_tickers) - len(found), len(cerrors))
    except Exception as e:  # noqa: BLE001
        log.exception("Konsensus feilet")
        store.set_source_status(name, False, now, f"{type(e).__name__}: {e}")
        errors.append(f"{name}: {e}")


def write_json(store: Store, holdings: list[Holding], now: datetime, errors: list[str],
               broker_targets: list[targets.BrokerTarget]) -> dict:
    from . import peerconfig, sector
    from .peers import classify

    try:
        sector_data = sector.build(store, peerconfig.read_peers(paths.config_dir() / "peers.csv"), holdings,
                                   peerconfig.read_overrides(paths.config_dir() / "overrides.csv"),
                                   {h.ticker: classify(h.navn) for h in holdings})
    except Exception as e:  # noqa: BLE001 – peers skal aldri stoppe resten av widgeten
        log.exception("Peer-beregning feilet")
        errors.append(f"peers: {e}")
        sector_data = {}
    data = export.build(store, holdings, now, errors, broker_targets, sector_data)
    export.write(data, paths.json_path())
    return data


def run(force: bool = False, source: PriceSource | None = None, now: datetime | None = None) -> int:
    now = now or utcnow()
    store = Store(paths.db_path())
    ok, reason = schedule.should_run(now, store.last_run(), force)
    if not ok:
        log.info("Hopper over: %s", reason)
        return 0
    log.info("Starter henting (%s)", reason)

    errors: list[str] = []
    holdings = load_holdings(store, now, errors)
    broker_targets = load_targets(store, now, errors)
    tickers = [h.ticker for h in holdings]
    news_run = None

    if tickers:
        source = source or get_price_source()
        fetch_quotes(store, source, tickers, now, errors)
        if consensus_due(store, now, force):
            fetch_consensus(store, source, tickers, now, errors)
        from .peerconfig import read_peers

        peer_list = [p.ticker for p in read_peers(paths.config_dir() / "peers.csv") if p.ticker not in tickers]
        fetch_peers(store, source, peer_list, tickers, now, errors, force)
        try:
            news_run = news.run_all(store, paths.config_dir(), now, errors, lambda t: _price(store, t), force)
        except Exception as e:  # noqa: BLE001 – nyhetsfeil skal aldri stoppe kursene
            log.exception("Nyhetshenting feilet")
            errors.append(f"nyheter: {e}")

    store.set_last_run(now)
    data = write_json(store, holdings, now, errors, broker_targets)
    log.info("data.json skrevet (%d feil)", len(errors))
    try:
        from . import alerts

        found = alerts.collect(data, news_run.new_filings if news_run else [],
                               news_run.new_suggestions if news_run else [], store, now)
        sent = alerts.send(found, store, now)
        if sent:
            log.info("Varsler sendt: %d", sent)
    except Exception:  # noqa: BLE001 – varsler skal aldri stoppe hentingen
        log.exception("Varsler feilet")
    return 0


def _price(store: Store, ticker: str) -> float | None:
    q = store.get_quote(ticker)
    return q["price"] if q else None


def export_only(now: datetime | None = None) -> int:
    now = now or utcnow()
    store = Store(paths.db_path())
    errors: list[str] = []
    holdings = load_holdings(store, now, errors)
    write_json(store, holdings, now, errors, load_targets(store, now, errors))
    return 0


def add_target(b64: str, now: datetime | None = None) -> dict:
    """Skriver et nytt kursmål fra skjemaet og oppdaterer data.json. Returnerer svar til widgeten."""
    now = now or utcnow()
    store = Store(paths.db_path())
    holdings = read_portfolio(paths.config_dir() / "portfolio.csv")

    def price(ticker: str) -> float | None:
        q = store.get_quote(ticker)
        return q["price"] if q else None

    try:
        row = targets.add_from_b64(b64, paths.config_dir() / "broker_targets.csv",
                                   {h.ticker for h in holdings}, price,
                                   now.astimezone(schedule.OSLO).date())
    except targets.TargetError as e:
        return {"ok": False, "feil": str(e)}
    log.info("Nytt kursmål: %s", row)
    export_only(now)
    return {"ok": True, "melding": f"Lagret: {row['meglerhus']} {row['ticker']} {row['kursmål']:g}"}


def handle_suggestion(action: str, sid: str, now: datetime | None = None) -> dict:
    """Bekreft (skriv til broker_targets.csv) eller forkast et kursmålforslag."""
    now = now or utcnow()
    store = Store(paths.db_path())
    s = store.get_suggestion(sid)
    if s is None:
        return {"ok": False, "feil": "Fant ikke forslaget"}
    if action == "forkast":
        store.set_suggestion_status(sid, "forkastet", now)
        export_only(now)
        return {"ok": True, "melding": "Forslaget er forkastet"}
    if not s["meglerhus"]:
        return {"ok": False, "feil": "Meglerhus mangler i overskriften – bruk skjemaet"}
    import base64

    published = (s["publisert"] or "")[:10] or None
    payload = {"ticker": s["ticker"], "meglerhus": s["meglerhus"], "kursmal": str(s["kursmal"]),
               "anbefaling": s["anbefaling"] or "", "dato": published,
               "forrige_kursmal": str(s["forrige"]) if s["forrige"] else "",
               "notat": f"Fra {s['kilde']}: {s['tittel']}"}
    holdings = read_portfolio(paths.config_dir() / "portfolio.csv")
    try:
        targets.add_from_b64(base64.b64encode(json.dumps(payload).encode()).decode(),
                             paths.config_dir() / "broker_targets.csv", {h.ticker for h in holdings},
                             lambda t: _price(store, t), now.astimezone(schedule.OSLO).date())
    except targets.TargetError as e:
        if "allerede registrert" in str(e):
            store.set_suggestion_status(sid, "bekreftet", now)
            export_only(now)
        return {"ok": False, "feil": str(e)}
    store.set_suggestion_status(sid, "bekreftet", now)
    export_only(now)
    return {"ok": True, "melding": f"Lagret: {s['meglerhus']} {s['ticker']} {s['kursmal']:g}"}


@contextmanager
def run_lock():
    """Hindrer at en manuell kjøring, launchd og skjemaet skriver samtidig."""
    lock = open(paths.data_dir() / ".lock", "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        lock.close()
        yield False
        return
    try:
        yield True
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
        lock.close()


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="fetcher")
    p.add_argument("-v", "--verbose", action="store_true")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="hent data")
    r.add_argument("--force", action="store_true", help="hent uansett tidspunkt")
    sub.add_parser("verify", help="sjekk tickere mot kursleverandøren")
    sub.add_parser("export", help="skriv data.json fra cache")
    a = sub.add_parser("add-target", help="legg til kursmål (base64-kodet JSON)")
    a.add_argument("payload")
    f = sub.add_parser("forslag", help="bekreft eller forkast et kursmålforslag")
    f.add_argument("action", choices=["bekreft", "forkast"])
    f.add_argument("id")
    pe = sub.add_parser("peers", help="finn og verifiser peers (Oslo via Newsweb, Stockholm via kandidatliste)")
    pe.add_argument("action", choices=["finn", "godkjenn"])
    pr = sub.add_parser("probe", help="sjekk nyhetskildene (robots.txt og RSS)")
    pr.add_argument("--dyp", action="store_true", help="let etter RSS-lenker og vis Newsweb-svar")
    args = p.parse_args(argv)

    logsetup.setup(verbose=args.verbose or args.cmd == "verify")

    if args.cmd == "verify":
        from .verify import verify_portfolio

        return verify_portfolio()

    if args.cmd == "peers":
        from .peers import approve, discover

        return discover() if args.action == "finn" else approve()

    if args.cmd == "probe":
        from .probe import deep_probe, probe

        return deep_probe() if args.dyp else probe()

    if args.cmd in ("add-target", "forslag"):
        # Skjemaet venter på svaret, så vi venter på låsen (maks noen sekunder) i stedet for å gi opp.
        import time

        for _ in range(120):  # inntil 30 sek
            with run_lock() as got:
                if got:
                    try:
                        result = (add_target(args.payload) if args.cmd == "add-target"
                                  else handle_suggestion(args.action, args.id))
                    except Exception as e:  # noqa: BLE001
                        log.exception("%s feilet", args.cmd)
                        result = {"ok": False, "feil": f"Uventet feil: {e}"}
                    print(json.dumps(result, ensure_ascii=False))
                    return 0
            time.sleep(0.25)
        print(json.dumps({"ok": False, "feil": "Datahenting pågår – prøv igjen om litt"}, ensure_ascii=False))
        return 0

    with run_lock() as got:
        if not got:
            log.warning("En annen kjøring pågår – avslutter")
            return 0
        return run(force=args.force) if args.cmd == "run" else export_only()
