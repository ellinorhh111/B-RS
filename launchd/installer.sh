#!/bin/bash
# Installerer (eller oppdaterer) automatisk kjøring med launchd.
#   bash launchd/installer.sh          – slå på
#   bash launchd/installer.sh stopp    – slå av
#
# launchd starter «python -m fetcher run» hvert 5. minutt (StartInterval 300).
# Skriptet avgjør selv om det skal hente: hver gang i åpningstiden (man–fre 09:00–17:30,
# ikke børsfridager), ellers bare hvis det er gått ~60 minutter siden sist.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="no.portefolje.widget"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true

if [[ "${1:-}" == "stopp" ]]; then
  rm -f "$PLIST"
  echo "Automatisk kjøring er slått AV."
  exit 0
fi

mkdir -p "$HOME/Library/LaunchAgents" "$ROOT/data/logs"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$ROOT/.venv/bin/python</string>
    <string>-m</string>
    <string>fetcher</string>
    <string>run</string>
  </array>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <key>StartInterval</key><integer>300</integer>
  <key>RunAtLoad</key><true/>
  <key>ProcessType</key><string>Background</string>
  <key>LowPriorityIO</key><true/>
  <key>StandardOutPath</key><string>$ROOT/data/logs/launchd.log</string>
  <key>StandardErrorPath</key><string>$ROOT/data/logs/launchd.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin</string>
  </dict>
</dict>
</plist>
PL
plutil -lint "$PLIST" >/dev/null
launchctl bootstrap "$DOMAIN" "$PLIST"
echo "Automatisk kjøring er slått PÅ ($PLIST)."
echo "Hvert 5. minutt i åpningstiden, ellers hver time. Logg: $ROOT/data/logs/fetcher.log"
