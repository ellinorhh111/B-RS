#!/usr/bin/env bash
# Installerer porteføljewidgeten på macOS.
#   1. sjekker Homebrew (spør før installasjon)
#   2. sjekker/installerer Übersicht
#   3. finner Python ≥ 3.9 og lager virtuelt miljø (.venv)
#   4. kopierer standardfiler til config/ (overskriver aldri dine filer)
#   5. verifiserer tickerne og henter data første gang
#   6. kobler widgeten inn i Übersicht
# Kan trygt kjøres flere ganger.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
say() { printf "\n\033[1m==> %s\033[0m\n" "$*"; }
ask() { local a; read -r -p "$1 (j/n) " a; [[ "$a" =~ ^[jJyY] ]]; }

[[ "$(uname)" == "Darwin" ]] || { echo "Dette skriptet er for macOS."; exit 1; }
if [[ "$ROOT" != "$HOME/portefolje-widget" ]]; then
  echo "Merk: koden ligger i $ROOT, men widgeten forventer ~/portefolje-widget."
  echo "Flytt mappen dit, eller endre ROOT øverst i widget/portefolje.widget/index.jsx."
fi

# --- 1. Homebrew ------------------------------------------------------------
say "Sjekker Homebrew"
if command -v brew >/dev/null 2>&1; then
  echo "Homebrew finnes: $(brew --version | head -1)"
else
  for p in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    [[ -x "$p" ]] && eval "$("$p" shellenv)" && break
  done
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew er ikke installert."
    if ask "Installere Homebrew nå (offisielt skript fra brew.sh)?"; then
      # </dev/tty: Homebrew-installasjonen må lese tastetrykk direkte fra terminalen.
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/tty \
        || echo "Homebrew-installasjonen ble avbrutt. Se README for hvordan du installerer den manuelt."
      for p in /opt/homebrew/bin/brew /usr/local/bin/brew; do [[ -x "$p" ]] && eval "$("$p" shellenv)" && break; done
    else
      echo "Hopper over Homebrew. Übersicht og Python må da installeres manuelt."
    fi
  fi
fi

# --- 2. Übersicht -----------------------------------------------------------
say "Sjekker Übersicht"
has_ubersicht() {
  [[ -d "/Applications/Übersicht.app" ]] || \
  [[ -n "$(mdfind "kMDItemCFBundleIdentifier == 'tracesOf.Uebersicht'" 2>/dev/null | head -1)" ]]
}
if has_ubersicht; then
  echo "Übersicht er installert."
elif command -v brew >/dev/null 2>&1; then
  echo "Installerer Übersicht med Homebrew …"
  brew install --cask ubersicht
else
  echo "Übersicht mangler. Last ned fra https://tracesof.net/uebersicht/ og kjør skriptet på nytt."
fi

# --- 3. Python + venv ------------------------------------------------------
say "Sjekker Python"
PY=""
for cand in /opt/homebrew/bin/python3 /usr/local/bin/python3 python3 /usr/bin/python3; do
  if command -v "$cand" >/dev/null 2>&1 && "$cand" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' 2>/dev/null; then
    PY="$(command -v "$cand")"; break
  fi
done
if [[ -z "$PY" ]]; then
  echo "Fant ingen Python ≥ 3.9."
  if command -v brew >/dev/null 2>&1 && ask "Installere Python 3.12 med Homebrew?"; then
    brew install python@3.12
    PY="$(brew --prefix)/bin/python3.12"
  else
    exit 1
  fi
fi
echo "Bruker $PY ($("$PY" --version))"

if [[ ! -x .venv/bin/python ]]; then
  echo "Lager virtuelt miljø i .venv …"
  "$PY" -m venv .venv
fi
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet -r requirements.txt
echo "Pakker installert: $(.venv/bin/python -m pip list 2>/dev/null | grep -iE '^(yfinance|pandas) ' | tr -s ' ' | paste -sd ',' -)"

# --- 4. Konfigurasjon -------------------------------------------------------
say "Klargjør config/ og data/"
.venv/bin/python -c "from fetcher import paths; paths.ensure_dirs()"
ls config/

# --- 5. Verifiser + første henting ----------------------------------------
say "Verifiserer tickere mot Yahoo Finance"
.venv/bin/python -m fetcher verify || echo "!! Noen tickere feilet – se over (rapport: data/verify_report.txt)"

say "Henter data første gang"
.venv/bin/python -m fetcher -v run --force

# --- 6. Koble widgeten inn i Übersicht ------------------------------------
say "Kobler widgeten til Übersicht"
WDIR="$HOME/Library/Application Support/Übersicht/widgets"
mkdir -p "$WDIR"
LINK="$WDIR/portefolje.widget"
if [[ -e "$LINK" && ! -L "$LINK" ]]; then
  echo "Det finnes allerede en mappe $LINK (ikke symlink) – rører den ikke."
else
  ln -sfn "$ROOT/widget/portefolje.widget" "$LINK"
  echo "Symlink: $LINK -> $ROOT/widget/portefolje.widget"
fi
open -a "Übersicht" 2>/dev/null || true

say "Ferdig"
echo "Widgeten skal nå vises på skrivebordet. Dra i tittellinjen for å flytte den."
echo "Logg: $ROOT/data/logs/fetcher.log"
