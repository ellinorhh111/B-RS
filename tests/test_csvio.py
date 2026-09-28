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
