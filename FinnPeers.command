#!/bin/bash
# Dobbeltklikk i Finder: henter ny kode og lager forslag til peer-liste (tar ca. 1–2 minutter).
# Resultatet åpnes i TekstEdit.
cd "$(dirname "$0")" || exit 1
mkdir -p data/kjoringer
LOG="data/kjoringer/peers-$(date '+%Y%m%d-%H%M%S').txt"
{
  echo "=== Peer-søk $(date '+%Y-%m-%d %H:%M') ==="
  git pull 2>&1
  echo
  .venv/bin/python -m fetcher peers finn 2>&1
  echo; echo "=== Ferdig ==="
} | tee "$LOG"
open -e "$LOG"
