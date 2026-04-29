#!/bin/bash
# Chain runner for P6→P7→P8 (P5 already running in separate tmux)
# Waits for P5 to finish, then runs P6, P7, P8 sequentially.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="/tmp/rwc-chain.log"
cd "$ROOT"

exec >>"$LOG" 2>&1

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Chain runner started: $(date)"
echo "═══════════════════════════════════════════════════"

# --- Wait for P5 to finish (tmux session rwc-p5) ---
echo "▶ Waiting for P5 (rwc-p5 tmux session) to finish..."
while tmux has-session -t rwc-p5 2>/dev/null; do
  # Check P5 log progress
  if grep -q "✅ Priority-5 generation complete" /tmp/rwc-p5.log 2>/dev/null; then
    echo "  P5 marker found, killing tmux..."
    tmux kill-session -t rwc-p5 2>/dev/null || true
    break
  fi
  sleep 30
done

echo "▶ P5 done. Starting P6..."
bash tools/generate-priority6-assets.sh && \
echo "✅ P6 OK" && \
echo "▶ Starting P7..." && \
bash tools/generate-priority7-assets.sh && \
echo "✅ P7 OK" && \
echo "▶ Starting P8..." && \
bash tools/generate-priority8-assets.sh && \
echo "✅ P8 OK" && \
echo "═══ ALL PRIORITIES COMPLETE ═══" && \
osascript -e 'display notification "All P5-P8 assets generated. Run wire-and-deploy step." with title "Runeword Chronicle"' 2>/dev/null || true

echo "Chain ended: $(date)"
