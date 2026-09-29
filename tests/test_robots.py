from fetcher.sources.robots import decide

UA = "portefolje-widget/1.0 (personlig bruk; macOS)"


def test_longest_match_wins_not_first():
    txt = "User-agent: *\nDisallow: /\nAllow: /rss\n"
    d = decide(txt, "https://x.com/rss/search?q=a", UA)
    assert d.allowed and d.rule.startswith("Allow: /rss")
    assert not decide(txt, "https://x.com/news", UA).allowed


def test_disallow_more_specific_wins():
    txt = "User-agent: *\nAllow: /rss\nDisallow: /rss/search\n"
    d = decide(txt, "https://x.com/rss/search?q=a", UA)
    assert not d.allowed and "Disallow: /rss/search" in d.rule
    assert decide(txt, "https://x.com/rss/topics/abc", UA).allowed


def test_wildcards_and_end_anchor():
    txt = "User-agent: *\nDisallow: /*.rss$\n"
    assert not decide(txt, "https://mfn.se/all/a/noba.rss", UA).allowed
    assert decide(txt, "https://mfn.se/all/a/noba.rss?x=1", UA).allowed
    assert decide(txt, "https://mfn.se/all/a/noba", UA).allowed


def test_specific_agent_group_overrides_star():
    txt = "User-agent: *\nDisallow: /\n\nUser-agent: portefolje-widget\nAllow: /\n"
    assert decide(txt, "https://x.com/a", UA).allowed


def test_empty_disallow_and_no_rules():
    assert decide("User-agent: *\nDisallow:\n", "https://x.com/a", UA).allowed
    assert decide("", "https://x.com/a", UA).allowed


def test_grouped_user_agents():
    txt = "User-agent: foo\nUser-agent: *\nDisallow: /private\n"
    assert not decide(txt, "https://x.com/private/1", UA).allowed


def test_http_status_handling_rfc9309(monkeypatch):
    from fetcher.sources import web

    for status, allowed in ((403, True), (401, True), (404, True), (503, False), (500, False)):
        web._robots.clear()
        monkeypatch.setattr(web, "_get", lambda url, s=status: (s, b""))
        d = web.check("https://data.norges-bank.no/api/data/X")
        assert d.allowed is allowed, (status, d.rule)
        assert str(status) in d.rule
