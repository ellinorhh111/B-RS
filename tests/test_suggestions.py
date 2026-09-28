import pytest

from fetcher.suggestions import find_broker, find_recommendation, from_item, parse_title

CASES = [
    # (overskrift, kurs, forventet kursmål, forventet forrige, retning, meglerhus, anbefaling)
    ("Pareto hever kursmålet på Protector til 480 kroner", 432.8, 480, None, "hever", "Pareto Securities", None),
    ("DNB Carnegie senker kursmålet for Protector fra 520 til 470 kroner", 432.8, 470, 520, "senker", "DNB Carnegie", None),
    ("Arctic øker kursmålet på Sparebanken Norge til 240 kroner, gjentar kjøp", 215.35, 240, None, "hever", "Arctic Securities", "kjøp"),
    ("SEB höjer riktkursen för Noba till 105 kronor – behåller köp", 87.5, 105, None, "hever", "SEB", "kjøp"),
    ("Carnegie sänker riktkursen för NOBA till 90 kr (95), upprepar behåll", 87.5, 90, None, "senker", "Carnegie", "hold"),
    ("Danske Bank raises Protector target price to NOK 510, reiterates buy", 432.8, 510, None, "hever", "Danske Bank", "kjøp"),
    ("Nordea: Kursmål 230 kroner for Sparebanken Norge", 215.35, 230, None, None, "Nordea", None),
    ("ABG kutter kursmålet på Protector fra 480 til 455", 432.8, 455, 480, "senker", "ABG Sundal Collier", None),
    ("Noba: SB1 Markets ups price target to SEK 101,5", 87.5, 101.5, None, "hever", "SB1 Markets", None),
]


@pytest.mark.parametrize("title,price,target,prev,direction,broker,rec", CASES)
def test_parse_real_style_headlines(title, price, target, prev, direction, broker, rec):
    new, old, d = parse_title(title, price)
    assert new == target and old == prev and d == direction
    assert find_broker(title) == broker
    assert find_recommendation(title) == rec


NOT_TARGETS = [
    ("Protector leverer rekordresultat i 2026", 432.8),                  # ingen kursmål-ord
    ("Kursmålet for 2026 er nådd, sier Protector-sjefen", 432.8),         # årstall, ikke kurs
    ("Sparebanken Norge hever renten med 0,25 prosentpoeng", 215.35),     # ikke kursmål
    ("Pareto hever kursmålet på Protector til 4800 kroner", 432.8),       # 11x kurs → trolig feil
    ("Kursmål: analytikerne er delt om Noba", 87.5),                      # ikke tall
]


@pytest.mark.parametrize("title,price", NOT_TARGETS)
def test_rejects_non_targets(title, price):
    assert parse_title(title, price) is None


def test_suggestion_id_is_stable():
    a = from_item("PROT.OL", "Pareto hever kursmålet på Protector til 480 kroner", "E24", "https://a", None, 432.8)
    b = from_item("PROT.OL", "Pareto hever kursmålet på Protector til 480 kroner", "DN", "https://b", None, 432.8)
    assert a.id == b.id and a.meglerhus == "Pareto Securities"
