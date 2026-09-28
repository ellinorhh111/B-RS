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
-- Nyheter og børsmeldinger. id = hash av (omfang, ticker, normalisert tittel), slik at
-- samme sak fra flere kilder bare lagres én gang (første kilde vinner, børsmelding går foran).
CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY, scope TEXT NOT NULL, ticker TEXT, kind TEXT NOT NULL,
    title TEXT NOT NULL, source TEXT, link TEXT, published TEXT, first_seen TEXT NOT NULL,
    lang TEXT, topic TEXT
);
CREATE INDEX IF NOT EXISTS news_by_time ON news (scope, ticker, published);
CREATE TABLE IF NOT EXISTS suggestions (
    id TEXT PRIMARY KEY, ticker TEXT NOT NULL, kursmal REAL NOT NULL, forrige REAL,
    meglerhus TEXT, anbefaling TEXT, retning TEXT, tittel TEXT, kilde TEXT, lenke TEXT,
    publisert TEXT, first_seen TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ny', handled_at TEXT
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

    # --- nyheter -------------------------------------------------------------
    def save_news(self, rows: list[dict], now: datetime) -> list[dict]:
        """Lagrer nyheter. Returnerer radene som var NYE (brukes til varsler i steg 5).

        Børsmeldinger overstyrer en nyhet med samme tittel (merkes da som børsmelding).
        """
        new = []
        with self.conn() as c:
            for r in rows:
                cur = c.execute(
                    "INSERT OR IGNORE INTO news VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (r["id"], r["scope"], r.get("ticker"), r["kind"], r["title"], r.get("source"), r.get("link"),
                     _iso(r.get("published")), _iso(now), r.get("lang"), r.get("topic")),
                )
                if cur.rowcount:
                    new.append(r)
                elif r["kind"] == "borsmelding":
                    c.execute("UPDATE news SET kind='borsmelding', source=?, link=? WHERE id=?",
                              (r.get("source"), r.get("link"), r["id"]))
        return new

    def list_news(self, scope: str, ticker: str | None = None, limit: int = 40,
                  tickers: list[str] | None = None) -> list[sqlite3.Row]:
        sql = "SELECT * FROM news WHERE scope=?"
        args: list = [scope]
        if ticker:
            sql += " AND ticker=?"
            args.append(ticker)
        if tickers:
            sql += f" AND ticker IN ({','.join('?' * len(tickers))})"
            args += tickers
        sql += " ORDER BY COALESCE(published, first_seen) DESC LIMIT ?"
        args.append(limit)
        with self.conn() as c:
            return c.execute(sql, args).fetchall()

    def prune_news(self, before: datetime) -> None:
        with self.conn() as c:
            c.execute("DELETE FROM news WHERE COALESCE(published, first_seen) < ?", (_iso(before),))

    # --- kursmålforslag -------------------------------------------------------
    def save_suggestions(self, sugg: list, now: datetime) -> list:
        """Lagrer nye forslag (samme id lagres aldri to ganger). Returnerer de nye."""
        new = []
        with self.conn() as c:
            for s in sugg:
                cur = c.execute(
                    "INSERT OR IGNORE INTO suggestions (id,ticker,kursmal,forrige,meglerhus,anbefaling,retning,"
                    "tittel,kilde,lenke,publisert,first_seen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                    (s.id, s.ticker, s.kursmal, s.forrige, s.meglerhus, s.anbefaling, s.retning, s.tittel,
                     s.kilde, s.lenke, s.publisert, _iso(now)),
                )
                if cur.rowcount:
                    new.append(s)
        return new

    def list_suggestions(self, status: str = "ny") -> list[sqlite3.Row]:
        with self.conn() as c:
            return c.execute("SELECT * FROM suggestions WHERE status=? ORDER BY COALESCE(publisert, first_seen) DESC",
                             (status,)).fetchall()

    def get_suggestion(self, sid: str) -> sqlite3.Row | None:
        with self.conn() as c:
            return c.execute("SELECT * FROM suggestions WHERE id=?", (sid,)).fetchone()

    def set_suggestion_status(self, sid: str, status: str, now: datetime) -> None:
        with self.conn() as c:
            c.execute("UPDATE suggestions SET status=?, handled_at=? WHERE id=?", (status, _iso(now), sid))

    # --- kildestatus --------------------------------------------------------
    def set_source_status(self, name: str, ok: bool, now: datetime, error: str | None = None) -> None:
        with self.conn() as c:
            prev = c.execute("SELECT last_ok FROM source_status WHERE name=?", (name,)).fetchone()
            last_ok = _iso(now) if ok else (prev["last_ok"] if prev else None)
            c.execute(
                "INSERT OR REPLACE INTO source_status VALUES (?,?,?,?,?)",
                (name, int(ok), _iso(now), last_ok, error),
            )

    def delete_source_status(self, name: str) -> None:
        with self.conn() as c:
            c.execute("DELETE FROM source_status WHERE name=?", (name,))

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
