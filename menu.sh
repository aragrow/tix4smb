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
  echo "║  5) Exit                     ║"
  echo "╚══════════════════════════════╝"
  echo ""
  read -rp "Choose [1-5]: " choice

  case "$choice" in
    1) "$DEV" start ;;
    2) "$DEV" stop ;;
    3) "$DEV" restart ;;
    4) "$DEV" logs ;;
    5) echo "Bye."; exit 0 ;;
    *) echo "Invalid option." ;;
  esac

  echo ""
  read -rp "Press Enter to return to menu..."
done
