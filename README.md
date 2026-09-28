# Porteføljewidget for macOS (Übersicht)

En gratis skrivebordswidget som viser kurser, kursmål, nyheter og peers for
selskapene du følger på Oslo Børs og Nasdaq Stockholm. Alt kjører lokalt på
Macen din. Ingen betalte API-er.

> **Status:** Steg 2 av 5. Kurser, Yahoo-konsensus, dine meglerkursmål og oppside vises i widgeten.
> Nyheter, peers, markedspanel, varsler og automatisk kjøring kommer i neste steg.

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
| `.venv/bin/python -m fetcher export` | Skriver `data.json` på nytt fra cachen, uten nett. Kjør denne etter at du har redigert en CSV-fil |

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

## Legge inn kursmål fra meglerhus

Kursmålene dine ligger i `config/broker_targets.csv`. Du kan legge dem inn på to måter.

**A. Skjemaet i widgeten (enklest).** Klikk på et selskap. Nederst i den utvidede visningen står
«+ Legg til kursmål». Fyll inn dato, meglerhus, kursmål og anbefaling, og trykk **Lagre**.
* «Forrige» kan stå tomt. Da brukes meglerhusets forrige kursmål i filen automatisk.
* Skjemaet avviser åpenbare feil: ukjent ticker, tekst i stedet for tall, dato fram i tid,
  duplikater og kursmål under 0,25× eller over 4× dagens kurs (trolig tastefeil).
* Lukk filen i Excel eller Numbers før du bruker skjemaet. Ellers kan en senere lagring i Excel overskrive raden.

**B. Excel/Numbers.** Åpne filen, legg til en rad og lagre som CSV. Kjør deretter `.venv/bin/python -m fetcher export`
(eller vent til neste automatiske oppdatering).

| Kolonne | Eksempel | Merknad |
|---|---|---|
| dato | `2026-09-15` eller `15.09.2026` | Datoen meglerhuset satte kursmålet |
| ticker | `PROT.OL` | Må finnes i portfolio.csv |
| meglerhus | `Pareto Securities` | Store/små bokstaver spiller ingen rolle |
| kursmål | `480` eller `480,5` | I aksjens valuta (NOK/SEK) |
| anbefaling | `kjøp` / `hold` / `selg` | Også buy/sell/outperform osv. godtas |
| forrige_kursmål | `420` | Valgfri |
| notat | fritekst | Valgfri. Vises når du holder musen over raden |

Rader med feil hoppes over og vises som et gult varsel i widgeten, med radnummer.

## Beregninger

**Oppside** = (kursmål − markedskurs) / markedskurs. Den regnes separat mot tre kursmål:

1. **Yahoo-konsensus:** snittet av analytikernes kursmål hos Yahoo. Den hentes hver 6. time. Mange mindre nordiske aksjer
   har ingen dekning hos Yahoo, og da vises «–».
2. **Meglersnitt:** gjennomsnittet av *siste* kursmål per meglerhus i `broker_targets.csv`. Hvert meglerhus teller én gang.
   Kursmål eldre enn 90 dager tas med, men markeres med ⚠.
3. **Mitt kursmål:** kolonnen `mitt_kursmål` i `portfolio.csv`.

*Eksempel:* Kurs 432,80. Siste kursmål er Pareto 480, DNB Carnegie 440 og Arctic 410.
* Meglersnitt = (480 + 440 + 410) / 3 = 1330 / 3 = 443,33
* Oppside = (443,33 − 432,80) / 432,80 = 10,53 / 432,80 = **+2,4 %**

**Fargekode:** grønn ved oppside over 15 %, gul fra −5 % til 15 % (begge grensene er gule), rød under −5 %.

Kurs og kursmål er alltid i samme valuta (NOK for Oslo, SEK for Stockholm). Oppside trenger derfor ingen valutaomregning.
Formlene står med kommentarer i `fetcher/calc.py`.

## Feilsøking

* **Widgeten viser «Ingen data ennå»:** Kjør `.venv/bin/python -m fetcher -v run --force` og se etter feil.
* **Rødt banner «Data er utdatert»:** Siste henting er eldre enn forventet. Se `data/logs/fetcher.log`.
  Før steg 5 (launchd) oppdateres data bare når du kjører `run` selv.
* **Gult felt «… feilet»:** En kilde svarte ikke. Widgeten viser da siste kjente data og når den ble hentet.
* **Kan ikke skrive i skjemaet:** Klikk først i feltet. Hvis tastetrykk ikke kommer fram, legg inn kursmålet i
  CSV-filen (metode B) og si fra.
* **Widgeten reagerer ikke på klikk eller dra:** Sjekk Übersichts innstillinger (menylinjeikonet →
  Preferences) for interaksjon.
* **Widgeten vises ikke:** I Übersicht-menyen, velg «Open Widgets Folder» og sjekk at `portefolje.widget` er der.
  Velg «Refresh All Widgets».

## Utvikling

```bash
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q
```
