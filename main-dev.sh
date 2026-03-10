#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT/.dev-pids"
LOG_DIR="$ROOT/.dev-logs"

start() {
  if [ -f "$PID_FILE" ]; then
    echo "Already running. Use '$0 stop' first."
    exit 1
  fi

  mkdir -p "$LOG_DIR"

  echo "Starting backend..."
  cd "$ROOT/backend"
  npm run dev > "$LOG_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!

  echo "Starting frontend..."
  cd "$ROOT/frontend"
  npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!

  echo "$BACKEND_PID $FRONTEND_PID" > "$PID_FILE"

  echo ""
  echo "✅ Both servers started."
  echo "   Backend  → http://localhost:3001  (pid $BACKEND_PID)"
  echo "   Frontend → http://localhost:5173  (pid $FRONTEND_PID)"
  echo ""
  echo "   Logs:  .dev-logs/backend.log"
  echo "          .dev-logs/frontend.log"
  echo ""
  echo "   Run '$0 stop' to shut down."
}

stop() {
  if [ ! -f "$PID_FILE" ]; then
    echo "No running servers found (no .dev-pids file)."
    exit 0
  fi

  read -r BACKEND_PID FRONTEND_PID < "$PID_FILE"

  echo "Stopping backend  (pid $BACKEND_PID)..."
  kill "$BACKEND_PID" 2>/dev/null && echo "  stopped" || echo "  already gone"

  echo "Stopping frontend (pid $FRONTEND_PID)..."
  kill "$FRONTEND_PID" 2>/dev/null && echo "  stopped" || echo "  already gone"

  rm -f "$PID_FILE"
  echo ""
  echo "✅ Both servers stopped."
}

logs() {
  echo "=== BACKEND ==="
  tail -n 40 "$LOG_DIR/backend.log" 2>/dev/null || echo "(no log yet)"
  echo ""
  echo "=== FRONTEND ==="
  tail -n 40 "$LOG_DIR/frontend.log" 2>/dev/null || echo "(no log yet)"
}

case "${1:-start}" in
  start)  start ;;
  stop)   stop ;;
  logs)   logs ;;
  restart) stop; sleep 1; start ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs}"
    exit 1
    ;;
esac
