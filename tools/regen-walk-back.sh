#!/bin/bash
# Regenerate the BACK (north) walk-cycle frames cleanly — straight back view, not 3/4.
# Uses the clean walk8_4 (due-north) frame as the consistency reference.
# Usage: bash tools/regen-walk-back.sh <class_dir> "<character desc>"
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="apps/client/public/assets/img/characters"

DIR="$1"; DESC="$2"
CDIR="$ROOT/$DIR"
SHEET="$CDIR/walk_back_sheet.png"
rm -f "$SHEET"

bash tools/codex-asset.sh sheet \
  --prompt "Character walk-cycle sprite sheet, 2 columns × 2 rows grid (4 cells, each 512x512, 8px gutter), dark-fantasy painterly pixel-art RPG sprite, SOLID PURE MAGENTA (#FF00FF) flat background. SAME single character in all 4 cells: ${DESC}. The CAMERA IS DIRECTLY BEHIND the character — you are looking at their BACK as they walk AWAY from you due NORTH. ABSOLUTELY NO FACE, NO EYES, NO MOUTH, NO front of the helmet/visor, NO chest or breastplate front — show ONLY the REAR of the head/helmet (back of skull, helmet rear, nape, ponytail/plume from behind), the BACK of the shoulders and armor, and the cape/cloak seen from behind. Torso vertical and bilaterally symmetric, shoulders square and parallel to the bottom edge, NOT rotated, NOT a 3/4 angle. The 4 cells are sequential frames of one walk cycle seen from behind: cell1 top-left = LEFT foot stepping forward; cell2 top-right = legs together mid-stride; cell3 bottom-left = RIGHT foot stepping forward; cell4 bottom-right = legs together mid-stride. Full body head to feet, feet near the bottom, character centered, ~75% of cell height. Identical outfit/colors/proportions in all 4 cells. NO TEXT, NO LABELS. This is a rear view only — if you can see the character's face you have drawn it WRONG." \
  --resolution 1024x1024 \
  --reference "$CDIR/walk8_4.png" \
  --output "$SHEET"

[ -s "$SHEET" ] || { echo "❌ sheet not generated"; exit 2; }

node tools/slice-spritesheet.js --input "$SHEET" --output "$CDIR/" --cols 2 --rows 2 --naming "walk_back_raw_{frame}"
for i in 0 1 2 3; do
  node tools/strip-bg.js "$CDIR/walk_back_raw_${i}.png" "$CDIR/walk_back_${i}.png" 120
  rm -f "$CDIR/walk_back_raw_${i}.png"
done
echo "✅ $DIR walk_back regenerated"
