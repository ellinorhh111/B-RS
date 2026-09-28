import unicodedata
from datetime import date

from fetcher.csvio import append_row, parse_date, parse_number, read_portfolio, read_rows


def test_parse_number_variants():
    assert parse_number("1 234,50") == 1234.5
    assert parse_number("1234.5") == 1234.5
    assert parse_number("1.234,5") == 1234.5
    assert parse_number("1,234.5") == 1234.5
    assert parse_number("kr 120") == 120
    assert parse_number("") is None
    assert parse_number("–") is None
    assert parse_number("abc") is None


def test_parse_date_variants():
    assert parse_date("2026-09-28") == date(2026, 9, 28)
    assert parse_date("28.09.2026") == date(2026, 9, 28)
    assert parse_date("28/09/2026") == date(2026, 9, 28)
    assert parse_date("") is None
    assert parse_date("i går") is None


def test_default_portfolio_empty_target_is_none(root):
    hs = read_portfolio(root / "config" / "portfolio.csv")
    assert [h.ticker for h in hs] == ["SBNOR.OL", "PROT.OL", "NOBA.ST"]
    assert all(h.mitt_kursmal is None for h in hs)
    assert hs[2].valuta == "SEK"


def test_comma_delimited_nfd_header_from_excel(tmp_path):
    # Simulerer fil lagret av et Mac-program med komma og NFD-normalisert «å».
    header = unicodedata.normalize("NFD", "ticker,navn,børs,valuta,mitt_kursmål,dato_kursmål,kommentar")
    p = tmp_path / "p.csv"
    p.write_text("﻿" + header + '\nPROT.OL,Protector,Oslo Børs,NOK,"450,5",01.09.2026,\n', encoding="utf-8")
    [h] = read_portfolio(p)
    assert h.mitt_kursmal == 450.5
    assert h.dato_kursmal == date(2026, 9, 1)


def test_append_row_keeps_existing_delimiter(tmp_path):
    p = tmp_path / "x.csv"
    p.write_text("a,b\n1,2", encoding="utf-8")  # uten linjeskift til slutt
    append_row(p, ["a", "b"], {"a": "3", "b": 4.5})
    assert read_rows(p) == [{"a": "1", "b": "2"}, {"a": "3", "b": "4,5"}]


def test_append_row_creates_semicolon_file(tmp_path):
    p = tmp_path / "y.csv"
    append_row(p, ["a", "b"], {"a": "x"})
    assert p.read_bytes().startswith(b"\xef\xbb\xbfa;b")


HEADER = "dato;ticker;meglerhus;kursmål;anbefaling;forrige_kursmål;notat\n"
ROW = "2026-09-01;PROT.OL;Pareto Securities;480;kjøp;;Børs\n"


def _check_targets(p):
    from fetcher.targets import read_targets

    rows, warnings = read_targets(p)
    assert warnings == [] and len(rows) == 1
    assert rows[0].kursmal == 480 and rows[0].anbefaling == "kjøp" and rows[0].notat == "Børs"


def test_utf8_without_bom(tmp_path):
    p = tmp_path / "b.csv"
    p.write_bytes((HEADER + ROW).encode("utf-8"))
    _check_targets(p)


def test_excel_saved_mac_roman_and_cp1252(tmp_path):
    for enc in ("mac_roman", "cp1252"):
        p = tmp_path / f"b_{enc}.csv"
        p.write_bytes((HEADER + ROW).encode(enc))
        _check_targets(p)


def test_mojibake_saved_back_as_utf8(tmp_path):
    # Excel åpnet UTF-8 uten BOM som Mac Roman («kursm√•l») og lagret som UTF-8.
    broken = (HEADER + ROW).encode("utf-8").decode("mac_roman")
    assert "kursm√•l" in broken
    p = tmp_path / "b.csv"
    p.write_bytes(broken.encode("utf-8"))
    _check_targets(p)


def test_header_without_nordic_letters(tmp_path):
    p = tmp_path / "b.csv"
    p.write_text("Dato,Ticker,Meglerhus,Kursmal,Anbefaling,Forrige kursmal,Notat\n"
                 "01.09.2026,PROT.OL,Pareto Securities,480,kjøp,,Børs\n", encoding="utf-8")
    _check_targets(p)


def test_normalize_file_adds_bom_and_repairs(tmp_path):
    from fetcher.csvio import normalize_file

    p = tmp_path / "b.csv"
    p.write_bytes((HEADER + ROW).encode("utf-8").decode("mac_roman").encode("utf-8"))
    assert normalize_file(p) is True
    assert p.read_bytes().startswith(b"\xef\xbb\xbf" + b"dato;ticker;meglerhus;kursm\xc3\xa5l")
    assert normalize_file(p) is False  # idempotent


def test_append_to_file_without_bom_adds_bom(tmp_path):
    p = tmp_path / "b.csv"
    p.write_bytes(HEADER.encode("utf-8"))
    append_row(p, ["dato", "ticker"], {"dato": "2026-09-01", "ticker": "PROT.OL"})
    b = p.read_bytes()
    assert b.startswith(b"\xef\xbb\xbf") and b.count(b"\xef\xbb\xbf") == 1
    assert b.endswith(b"2026-09-01;PROT.OL\n")
