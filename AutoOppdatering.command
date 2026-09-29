#!/bin/bash
# Dobbeltklikk i Finder: slår på automatisk oppdatering (launchd) og sender et testvarsel.
cd "$(dirname "$0")" || exit 1
mkdir -p data/kjoringer
LOG="data/kjoringer/auto-$(date '+%Y%m%d-%H%M%S').txt"
{
  echo "=== Slår på automatisk oppdatering $(date '+%Y-%m-%d %H:%M') ==="
  git pull 2>&1
  bash launchd/installer.sh 2>&1
  echo
  echo "--- Testvarsel ---"
  .venv/bin/python -c "from fetcher.alerts import notify; notify('Portefølje', 'Varsler virker. Du får beskjed om store bevegelser, børsmeldinger og kursmål.', 'Testvarsel')" 2>&1
  echo "Fikk du et varsel øverst til høyre på skjermen? Hvis ikke: se README («Varsler»)."
  echo
  echo "--- Status ---"
  launchctl print "gui/$(id -u)/no.portefolje.widget" 2>&1 | grep -E "state|last exit|run interval" || true
  echo; echo "=== Ferdig ==="
} | tee "$LOG"
open -e "$LOG"
