#!/usr/bin/env bash

ROOT="$(cd "$(dirname "$0")" && pwd)"
DEV="$ROOT/main-dev.sh"

while true; do
  clear
  echo "╔══════════════════════════════╗"
  echo "║       tix4smb  Dev Menu      ║"
  echo "╠══════════════════════════════╣"
  echo "║  1) Start                    ║"
  echo "║  2) Stop                     ║"
  echo "║  3) Restart                  ║"
  echo "║  4) Logs                     ║"
  echo "╠══════════════════════════════╣"
  echo "║  5) Scraper — Full run       ║"
  echo "║  6) Scraper — Quick test     ║"
  echo "║  7) Export GHL CSV only      ║"
  echo "╠══════════════════════════════╣"
  echo "║  8) Exit                     ║"
  echo "╚══════════════════════════════╝"
  echo ""
  read -rp "Choose [1-8]: " choice

  case "$choice" in
    1) "$DEV" start ;;
    2) "$DEV" stop ;;
    3) "$DEV" restart ;;
    4) "$DEV" logs ;;
    5) cd "$ROOT" && uv run run_all.py config.json ;;
    6) cd "$ROOT" && uv run run_all.py config-test.json ;;
    7) cd "$ROOT" && uv run csv_export.py ;;
    8) echo "Bye."; exit 0 ;;
    *) echo "Invalid option." ;;
  esac

  echo ""
  read -rp "Press Enter to return to menu..."
done
