from datetime import date

from fetcher import calc
from fetcher.targets import read_targets, summarize


def test_upside_and_colors():
    # (440 − 400) / 400 = 0,10
    assert calc.upside(440, 400) == 0.10
    assert calc.upside(None, 400) is None and calc.upside(440, None) is None
    assert calc.color(0.1501) == "gronn"
    assert calc.color(0.15) == "gul"      # grensen er gul
    assert calc.color(-0.05) == "gul"     # grensen er gul
    assert calc.color(-0.0501) == "rod"
    assert calc.color(None) is None


def test_latest_per_broker_and_previous(tmp_path):
    p = tmp_path / "b.csv"
    p.write_text(
        "dato;ticker;meglerhus;kursmål;anbefaling;forrige_kursmål;notat\n"
        "2026-06-01;PROT.OL;Pareto Securities;400;kjøp;;\n"
        "2026-09-01;PROT.OL;pareto securities;440;Buy;;hever\n"   # samme meglerhus, annen skrivemåte
        "2026-08-15;PROT.OL;Arctic Securities;470;kjøp;450;\n"
        "2026-09-10;NOBA.ST;SEB;95;hold;;\n"
        "ugyldig;PROT.OL;X;100;;;\n"
        "2026-09-02;PROT.OL;Y;100;kanskje;;\n",
        encoding="utf-8",
    )
    rows, warnings = read_targets(p)
    assert len(rows) == 5 and len(warnings) == 2
    s = summarize(rows, "PROT.OL", 400.0, date(2026, 9, 28))
    # Siste per meglerhus: Pareto 440, Arctic 470, Y 100 → (440 + 470 + 100) / 3 = 336,67
    assert s["antall"] == 3 and s["snitt"] == 336.67
    pareto = next(r for r in s["siste"] if r["meglerhus"].lower() == "pareto securities")
    assert pareto["forrige"] == 400 and pareto["endring_pct"] == 10.0 and pareto["anbefaling"] == "kjøp"
    arctic = next(r for r in s["siste"] if r["meglerhus"] == "Arctic Securities")
    assert arctic["forrige"] == 450  # fra kolonnen forrige_kursmål
    assert len(s["historikk"]) == 4


def test_missing_file_is_empty(tmp_path):
    assert read_targets(tmp_path / "finnes-ikke.csv") == ([], [])
