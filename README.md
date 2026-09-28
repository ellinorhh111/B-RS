# Porteføljewidget for macOS (Übersicht)

En gratis skrivebordswidget som viser kurser, kursmål, nyheter og peers for
selskapene du følger på Oslo Børs og Nasdaq Stockholm. Alt kjører lokalt på
Macen din. Ingen betalte API-er.

> **Status:** Steg 1 av 5. Kurser for dine tre selskaper vises i widgeten.
> Kursmål, nyheter, peers, markedspanel, varsler og automatisk kjøring kommer i neste steg.

## Slik henger det sammen

```
launchd (steg 5) → Python-skript (fetcher) → SQLite-cache + data.json → Übersicht-widget
```

* **fetcher/** henter data og lagrer alt i `data/portefolje.db`. Deretter skriver den `data/data.json`.
* **widget/portefolje.widget/** er Übersicht-widgeten. Den leser bare `data.json` og henter aldri noe fra nettet selv.
* **fetcher/sources/** er det eneste stedet som snakker med eksterne kilder. Slutter yfinance å virke, er det bare
  `sources/prices_yahoo.py` som må byttes ut.

## Installasjon

1. Hent koden til `~/portefolje-widget` i Terminal. Git følger med Xcode Command Line Tools
   (`xcode-select --install` hvis den mangler):

   ```bash
   git clone -b claude/macos-portfolio-widget-ubersicht-1zo96e https://github.com/ellinorhh111/B-RS.git ~/portefolje-widget
   cd ~/portefolje-widget
   ```

2. Kjør installasjonsskriptet:

   ```bash
   bash install.sh
   ```

   Skriptet gjør dette:
   * sjekker Homebrew og **spør deg** før det installerer noe
   * installerer Übersicht (`brew install --cask ubersicht`) hvis den mangler
   * finner Python ≥ 3.9 og lager et virtuelt miljø i `.venv/`
   * kopierer standardfilene fra `defaults/` til `config/` (dine egne filer blir aldri overskrevet)
   * sjekker tickerne mot Yahoo Finance (`verify`) og henter data første gang
   * kobler widgeten inn i Übersicht med en symlink

3. Widgeten dukker opp på skrivebordet. Dra i tittellinjen for å flytte den. Posisjonen huskes.

### Oppdatere til ny versjon

```bash
cd ~/portefolje-widget && git pull && bash install.sh
```

## Kommandoer

| Kommando | Hva den gjør |
|---|---|
| `.venv/bin/python -m fetcher verify` | Sjekker at hver ticker gir data for riktig selskap (valuta, børs og navn). Rapporten lagres i `data/verify_report.txt` |
| `.venv/bin/python -m fetcher -v run --force` | Henter data nå, uansett klokkeslett |
| `.venv/bin/python -m fetcher export` | Skriver `data.json` på nytt fra cachen, uten nett |

## Redigere portfolio.csv

Filen ligger i `config/portfolio.csv`. Kolonnene er:

| Kolonne | Eksempel | Merknad |
|---|---|---|
| ticker | `PROT.OL` | Yahoo-format: `.OL` = Oslo, `.ST` = Stockholm |
| navn | `Protector Forsikring` | Brukes også til å kontrollere at tickeren er riktig |
| børs | `Oslo Børs` | |
| valuta | `NOK` / `SEK` | |
| mitt_kursmål | `450` eller `450,5` | **Kan stå tomt.** Da vises «–» |
| dato_kursmål | `2026-09-28` eller `28.09.2026` | |
| kommentar | fritekst | |

* **Excel:** Åpne filen og lagre den som CSV (UTF-8).
* **Numbers:** Numbers lagrer som `.numbers` når du trykker ⌘S. Bruk **Arkiv → Eksporter til → CSV** og
  overskriv `config/portfolio.csv`.
* Både semikolon og komma som skilletegn fungerer, og både `450,5` og `450.5`. Linjer som starter med `#` ignoreres.
* Når du har lagt til en ny ticker, kjør `verify` for å sjekke at den peker på riktig selskap.

## Feilsøking

* **Widgeten viser «Ingen data ennå»:** Kjør `.venv/bin/python -m fetcher -v run --force` og se etter feil.
* **Rødt banner «Data er utdatert»:** Siste henting er eldre enn forventet. Se `data/logs/fetcher.log`.
  Før steg 5 (launchd) oppdateres data bare når du kjører `run` selv.
* **Gult felt «… feilet»:** En kilde svarte ikke. Widgeten viser da siste kjente data og når den ble hentet.
* **Widgeten reagerer ikke på klikk eller dra:** Sjekk Übersichts innstillinger (menylinjeikonet →
  Preferences) for interaksjon.
* **Widgeten vises ikke:** I Übersicht-menyen, velg «Open Widgets Folder» og sjekk at `portefolje.widget` er der.
  Velg «Refresh All Widgets».

## Utvikling

```bash
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q
```
