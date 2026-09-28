#!/bin/bash
# Dobbeltklikk i Finder: henter ny kode, sjekker kildene, henter data og oppdaterer widgeten.
# Alt som skrives ut lagres i data/kjoringer/kjoring-<tidspunkt>.txt og åpnes i TekstEdit til slutt.
# (Egen fil per kjøring: TekstEdit viser ellers gammelt innhold hvis filen allerede er åpen.)
cd "$(dirname "$0")" || exit 1
mkdir -p data/kjoringer
LOG="data/kjoringer/kjoring-$(date '+%Y%m%d-%H%M%S').txt"
{
  echo "=== Oppdatering $(date '+%Y-%m-%d %H:%M') ==="
  echo; echo "--- Henter ny kode (git pull) ---"
  git pull 2>&1
  echo; echo "--- Kildesjekk (probe) ---"
  .venv/bin/python -m fetcher probe 2>&1
  echo; echo "--- Henter data (run --force) ---"
  .venv/bin/python -m fetcher -v run --force 2>&1
  echo; echo "--- Oppdaterer widgeten ---"
  osascript -e 'tell application id "tracesOf.Uebersicht" to refresh' 2>&1 && echo "Widgeten er oppdatert."
  echo; echo "=== Ferdig ==="
} | tee "$LOG"
cp "$LOG" data/siste_kjoring.txt
open -e "$LOG"
