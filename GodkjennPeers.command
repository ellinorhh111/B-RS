#!/bin/bash
# Dobbeltklikk i Finder: gjør forslaget fra FinnPeers om til config/peers.csv og henter peer-data.
cd "$(dirname "$0")" || exit 1
mkdir -p data/kjoringer
LOG="data/kjoringer/godkjenn-$(date '+%Y%m%d-%H%M%S').txt"
{
  echo "=== Godkjenner peers $(date '+%Y-%m-%d %H:%M') ==="
  git pull 2>&1
  .venv/bin/python -m fetcher peers godkjenn 2>&1
  echo; echo "--- Henter data for peers (kan ta 1–2 minutter) ---"
  .venv/bin/python -m fetcher -v run --force 2>&1
  osascript -e 'tell application id "tracesOf.Uebersicht" to refresh' 2>&1 && echo "Widgeten er oppdatert."
  echo; echo "=== Ferdig ==="
} | tee "$LOG"
open -e "$LOG"
