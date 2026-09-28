"""Lokal SQLite-cache. Alt som hentes lagres her, slik at widgeten kan vise
siste kjente data når nettet eller en kilde feiler."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from .sources.prices_base import Consensus, Quote

SCHEMA = """
CREATE TABLE IF NOT EXISTS quotes (
    ticker TEXT PRIMARY KEY,
    price REAL, prev_close REAL, currency TEXT, market_time TEXT,
    exchange TEXT, name TEXT, source TEXT, fetched_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS prices_daily (
    ticker TEXT NOT NULL, date TEXT NOT NULL, close REAL NOT NULL,
    PRIMARY KEY (ticker, date)
);
CREATE TABLE IF NOT EXISTS source_status (
    name TEXT PRIMARY KEY,
    ok INTEGER NOT NULL, last_attempt TEXT NOT NULL, last_ok TEXT, error TEXT
);
CREATE TABLE IF NOT EXISTS consensus (
    ticker TEXT PRIMARY KEY,
    mean REAL, median REAL, high REAL, low REAL, n_analysts INTEGER,
    recommendation TEXT, recommendation_mean REAL, currency TEXT,
    source TEXT, fetched_at TEXT NOT NULL
);
-- Ett øyeblikksbilde per dag, til kursmålhistorikk i grafen senere.
CREATE TABLE IF NOT EXISTS consensus_daily (
    ticker TEXT NOT NULL, date TEXT NOT NULL, mean REAL, n_analysts INTEGER,
    PRIMARY KEY (ticker, date)
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
"""


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds") if dt else None


def parse_iso(s: str | None) -> datetime | None:
    return datetime.fromisoformat(s) if s else None


class Store:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.conn() as c:
            c.executescript(SCHEMA)

    @contextmanager
    def conn(self):
        c = sqlite3.connect(self.path, timeout=30)
        c.row_factory = sqlite3.Row
        try:
            yield c
            c.commit()
        finally:
            c.close()

    # --- kurser -------------------------------------------------------------
    def save_quotes(self, quotes: dict[str, Quote], source: str, now: datetime) -> None:
        with self.conn() as c:
            for q in quotes.values():
                c.execute(
                    "INSERT OR REPLACE INTO quotes VALUES (?,?,?,?,?,?,?,?,?)",
                    (q.ticker, q.price, q.prev_close, q.currency, _iso(q.market_time),
                     q.exchange, q.name, source, _iso(now)),
                )
                c.executemany(
                    "INSERT OR REPLACE INTO prices_daily VALUES (?,?,?)",
                    [(q.ticker, d, close) for d, close in q.daily_closes],
                )

    def get_quote(self, ticker: str) -> sqlite3.Row | None:
        with self.conn() as c:
            return c.execute("SELECT * FROM quotes WHERE ticker=?", (ticker,)).fetchone()

    # --- konsensus ----------------------------------------------------------
    def save_consensus(self, found: dict[str, Consensus], checked: list[str], source: str,
                       now: datetime) -> None:
        """Lagrer konsensus. Tickere som ble sjekket uten treff (ingen dekning) slettes,
        slik at vi ikke viser en gammel konsensus som Yahoo ikke lenger har."""
        today = now.date().isoformat()
        with self.conn() as c:
            for t in checked:
                if t not in found:
                    c.execute("DELETE FROM consensus WHERE ticker=?", (t,))
            for k in found.values():
                c.execute(
                    "INSERT OR REPLACE INTO consensus VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (k.ticker, k.mean, k.median, k.high, k.low, k.n_analysts, k.recommendation,
                     k.recommendation_mean, k.currency, source, _iso(now)),
                )
                c.execute("INSERT OR REPLACE INTO consensus_daily VALUES (?,?,?,?)",
                          (k.ticker, today, k.mean, k.n_analysts))

    def get_consensus(self, ticker: str) -> sqlite3.Row | None:
        with self.conn() as c:
            return c.execute("SELECT * FROM consensus WHERE ticker=?", (ticker,)).fetchone()

    def get_source_status(self, name: str) -> sqlite3.Row | None:
        with self.conn() as c:
            return c.execute("SELECT * FROM source_status WHERE name=?", (name,)).fetchone()

    # --- kildestatus --------------------------------------------------------
    def set_source_status(self, name: str, ok: bool, now: datetime, error: str | None = None) -> None:
        with self.conn() as c:
            prev = c.execute("SELECT last_ok FROM source_status WHERE name=?", (name,)).fetchone()
            last_ok = _iso(now) if ok else (prev["last_ok"] if prev else None)
            c.execute(
                "INSERT OR REPLACE INTO source_status VALUES (?,?,?,?,?)",
                (name, int(ok), _iso(now), last_ok, error),
            )

    def source_statuses(self) -> list[sqlite3.Row]:
        with self.conn() as c:
            return c.execute("SELECT * FROM source_status ORDER BY name").fetchall()

    # --- diverse ------------------------------------------------------------
    def get_meta(self, key: str) -> str | None:
        with self.conn() as c:
            r = c.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
            return r["value"] if r else None

    def set_meta(self, key: str, value: str) -> None:
        with self.conn() as c:
            c.execute("INSERT OR REPLACE INTO meta VALUES (?,?)", (key, value))

    def last_run(self) -> datetime | None:
        return parse_iso(self.get_meta("last_run"))

    def set_last_run(self, now: datetime) -> None:
        self.set_meta("last_run", _iso(now))
