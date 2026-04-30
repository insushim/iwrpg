#!/bin/bash
# Walk-cycle v2 generator — 4-frame walk atlases with EXPLICITLY distinct
# poses per frame so animation actually shows leg/arm motion.
# Uses class concept art as character-lock --reference.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/apps/client/public/assets/img/characters"
LOG="$ROOT/walk-v2.log"
PROGRESS="$ROOT/walk-v2.progress"

CLASSES=("aether_lord" "iron_sentinel" "sylvan_ranger" "rune_weaver")
DIRECTIONS=("front" "side" "back")

TOTAL=$((${#CLASSES[@]} * ${#DIRECTIONS[@]}))
COUNT=0

echo "[$(date '+%H:%M:%S')] Walk-v2 start. ${TOTAL} atlases" | tee "$LOG"

for cls in "${CLASSES[@]}"; do
  CONCEPT="$ASSETS/${cls}_concept.png"
  CLS_DIR="$ASSETS/$cls"

  for dir in "${DIRECTIONS[@]}"; do
    COUNT=$((COUNT + 1))
    OUT_ATLAS="$CLS_DIR/walk_${dir}_atlas_v2.png"

    # Per-direction view description
    case $dir in
      front) VIEW="3/4 front view, walking towards camera" ;;
      side)  VIEW="strict side profile, walking left-to-right (camera right)" ;;
      back)  VIEW="3/4 back view, walking away from camera" ;;
    esac

    PROMPT="A horizontal sprite-strip of 4 walk-cycle frames, exact 4x1 grid (1536x1024 total, each cell 384x1024). Same fantasy hero in all 4 frames, ${VIEW}. CRITICAL: each frame must show a DIFFERENT walk-cycle pose. Frame 1: contact pose, right leg forward bent at knee, left leg back extended, left arm forward, right arm back. Frame 2: passing pose, both feet near each other, body lifted slightly upward, weight transfer. Frame 3: opposite contact, left leg forward bent, right leg back extended, right arm forward, left arm back. Frame 4: passing reversed, body lowered. Visible knee bend, foot lift off ground, arm swing in every frame. Hero shown full body head-to-toe with both feet visible. Solid pure lime-green chroma background (#10F808). Lineage 2 / Diablo 2 commercial RPG art quality, painterly digital illustration, dramatic rim lighting, no text, no UI, no panel borders, cells flush edge-to-edge with no gaps."

    # Delete existing v2 to force regeneration
    rm -f "$OUT_ATLAS"

    echo "" | tee -a "$LOG"
    echo "[$(date '+%H:%M:%S')] [${COUNT}/${TOTAL}] $cls / $dir" | tee -a "$LOG"
    echo "[$(date '+%H:%M:%S')] [${COUNT}/${TOTAL}] $cls / $dir" > "$PROGRESS"

    # Use existing wrapper that handles --add-dir + escaping
    bash "$ROOT/tools/codex-asset.sh" single \
      --prompt "$PROMPT" \
      --output "$OUT_ATLAS" \
      --resolution "1536x1024" \
      --reference "$CONCEPT" 2>&1 | tee -a "$LOG"

    # Slice atlas into 4 individual frames + chroma-key strip
    if [ -f "$OUT_ATLAS" ]; then
      echo "[$(date '+%H:%M:%S')] Slicing $OUT_ATLAS" | tee -a "$LOG"
      node "$ROOT/tools/slice-spritesheet.js" \
        --input "$OUT_ATLAS" \
        --output "$CLS_DIR" \
        --cols 4 --rows 1 \
        --naming "walk_${dir}_{frame}" 2>&1 | tee -a "$LOG"

      for f in 0 1 2 3; do
        FRAME="$CLS_DIR/walk_${dir}_${f}.png"
        if [ -f "$FRAME" ]; then
          node "$ROOT/tools/strip-bg.js" "$FRAME" "$FRAME" 60 2>&1 | tee -a "$LOG"
        fi
      done
      echo "[$(date '+%H:%M:%S')] [${COUNT}/${TOTAL}] OK" | tee -a "$LOG"
    else
      echo "[$(date '+%H:%M:%S')] [${COUNT}/${TOTAL}] FAIL — atlas not generated" | tee -a "$LOG"
    fi
  done
done

echo "" | tee -a "$LOG"
echo "[$(date '+%H:%M:%S')] DONE — ${TOTAL}/${TOTAL}" | tee -a "$LOG"
echo "DONE" > "$PROGRESS"

osascript -e 'display notification "Walk-v2 sprites complete" with title "Runeword Chronicle"' 2>/dev/null || true
