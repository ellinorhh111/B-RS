"""robots.txt-tolkning etter standarden RFC 9309 (samme regler som Google bruker).

Hvorfor ikke Pythons urllib.robotparser? Den bruker den FØRSTE regelen som
passer, mens RFC 9309 sier at den LENGSTE (mest presise) regelen vinner, og at
Allow vinner ved likt. Eksempel:

    User-agent: *
    Disallow: /
    Allow: /rss

urllib.robotparser sier «ikke tillatt» for /rss; RFC 9309 sier «tillatt».

Vi returnerer også hvilken regel som avgjorde, slik at `probe` kan vise begrunnelsen.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import unquote, urlsplit


@dataclass
class Decision:
    allowed: bool
    rule: str | None  # f.eks. «Disallow: /rss/search (User-agent: *)»; None = ingen regel traff


@dataclass
class _Group:
    agents: list[str]
    rules: list[tuple[bool, str]]  # (allow, sti-mønster)


def parse(text: str) -> list[_Group]:
    groups: list[_Group] = []
    current: _Group | None = None
    last_was_agent = False
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if ":" not in line:
            continue
        key, value = (p.strip() for p in line.split(":", 1))
        key = key.lower()
        if key == "user-agent":
            if current is None or not last_was_agent:
                current = _Group([], [])
                groups.append(current)
            current.agents.append(value.lower())
            last_was_agent = True
        elif key in ("allow", "disallow"):
            last_was_agent = False
            if current is None:
                continue
            if key == "disallow" and value == "":
                continue  # tom Disallow = alt tillatt
            current.rules.append((key == "allow", value))
        else:
            last_was_agent = False  # sitemap, crawl-delay o.l.
    return groups


def _pattern_to_regex(pattern: str) -> re.Pattern:
    anchored = pattern.endswith("$")
    body = pattern[:-1] if anchored else pattern
    rx = "".join(".*" if ch == "*" else re.escape(ch) for ch in body)
    return re.compile("^" + rx + ("$" if anchored else ""))


def _groups_for(groups: list[_Group], user_agent: str) -> tuple[list[_Group], str]:
    """Grupper som gjelder oss: de som nevner produktnavnet vårt, ellers «*»."""
    token = user_agent.split("/")[0].lower()
    specific = [g for g in groups if any(a != "*" and a in token for a in g.agents)]
    if specific:
        return specific, token
    return [g for g in groups if "*" in g.agents], "*"


def decide(text: str, url: str, user_agent: str) -> Decision:
    parts = urlsplit(url)
    path = unquote(parts.path or "/") + (("?" + parts.query) if parts.query else "")
    groups, agent = _groups_for(parse(text), user_agent)
    best: tuple[int, bool, str] | None = None  # (lengde, allow, regel)
    for g in groups:
        for allow, pat in g.rules:
            if _pattern_to_regex(pat).match(path):
                length = len(pat)
                # Lengste mønster vinner; ved likt vinner Allow.
                if best is None or length > best[0] or (length == best[0] and allow and not best[1]):
                    best = (length, allow, f"{'Allow' if allow else 'Disallow'}: {pat} (User-agent: {agent})")
    if best is None:
        return Decision(True, None)
    return Decision(best[1], best[2])
