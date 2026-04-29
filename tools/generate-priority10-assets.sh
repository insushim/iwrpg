#!/bin/bash
# Priority-10: Character walk cycles, simpler 3-direction layout
# Each class gets 1 atlas: 1024×1024, 4×3 grid (cell 256×256)
# - Row 1: facing FRONT (south), 4 walk frames
# - Row 2: facing RIGHT (east, side profile), 4 walk frames
# - Row 3: facing BACK (north), 4 walk frames
# Client uses flipX for west/sw/nw directions to mirror.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET="$ROOT/apps/client/public/assets/img/characters"
cd "$ROOT"

echo "═══ P10: Walk atlases (front/side/back × 4 frames) ═══"

generate_class_walk() {
  local CLS_KEY="$1"
  local CLS_DESC="$2"
  local CLS_DIR="$ASSET/$CLS_KEY"
  mkdir -p "$CLS_DIR"

  echo "▶ $CLS_KEY: walk atlas (1024×1024, 4×3)"
  bash tools/codex-asset.sh sheet \
    --prompt "Single character walk-cycle sprite sheet, 4 columns × 3 rows grid layout (cell 256×256 each, 8px gutter), top-down 3/4 chibi RPG view, transparent background, dark fantasy painterly pixel art. Same character throughout: ${CLS_DESC}. ROW 1 (top, facing FRONT/south, character body facing camera, viewer sees character's face): 4 sequential walk-cycle frames showing CLEAR LEG MOTION — frame 1: LEFT FOOT planted, RIGHT KNEE raised forward; frame 2: feet together passing position; frame 3: RIGHT FOOT planted, LEFT KNEE raised forward; frame 4: feet together passing position. ROW 2 (middle, facing RIGHT side profile/east, character body silhouette from the right side, viewer sees character's left ear and back of right shoulder): 4 walk-cycle frames with VISIBLE LEG STRIDE forward and back, ARM SWING opposite to legs. ROW 3 (bottom, facing BACK/north, character body facing away from camera, viewer sees character's back): 4 walk-cycle frames with leg motion visible from behind. CRITICAL: each row must be a COMPLETELY DIFFERENT angle of the same character. Each cell character occupies 70% of cell with 15% margin. NO TEXT, NO LABELS" \
    --resolution 1024x1024 \
    --output "$CLS_DIR/walk_atlas.png"
  node tools/slice-spritesheet.js \
    --input "$CLS_DIR/walk_atlas.png" \
    --output "$CLS_DIR/" --cols 4 --rows 3 --naming "walk_grid_{frame}"
  # walk_grid_0..3 = front, walk_grid_4..7 = side, walk_grid_8..11 = back
  for i in 0 1 2 3; do
    [ -s "$CLS_DIR/walk_grid_${i}.png" ] && mv -f "$CLS_DIR/walk_grid_${i}.png" "$CLS_DIR/walk_front_${i}.png"
  done
  for i in 0 1 2 3; do
    [ -s "$CLS_DIR/walk_grid_$((i+4)).png" ] && mv -f "$CLS_DIR/walk_grid_$((i+4)).png" "$CLS_DIR/walk_side_${i}.png"
  done
  for i in 0 1 2 3; do
    [ -s "$CLS_DIR/walk_grid_$((i+8)).png" ] && mv -f "$CLS_DIR/walk_grid_$((i+8)).png" "$CLS_DIR/walk_back_${i}.png"
  done
}

generate_class_walk "aether_lord"   "young blue-armored sky lord with rune-edged cape and silver halberd, hooded helm, glowing aether trim"
generate_class_walk "iron_sentinel" "stout heavy-armored knight in dark iron plate with great warhammer, full helm with red plume"
generate_class_walk "sylvan_ranger" "lithe elven ranger in green leather armor with hooded forest cloak and quiver, longbow slung on back"
generate_class_walk "rune_weaver"   "tall purple-robed rune mage with hooded cowl and tall runic staff with crystal top, glowing runes on robe"

echo "═══ ✅ P10 complete ═══"
