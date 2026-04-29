#!/bin/bash
# Priority-7: Complete character animation set (8-direction walk + attack + cast + hit + death)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET="$ROOT/apps/client/public/assets/img/characters"
cd "$ROOT"

echo "═══ P7: Character full animation cycles ═══"

# Order matters — directions: 0=S, 1=SE, 2=E, 3=NE, 4=N, 5=NW, 6=W, 7=SW
# Existing: walk8_0..3 (S, SE, E, NE). Missing: walk8_4..7 (N, NW, W, SW)

generate_class_anim() {
  local CLS_KEY="$1"     # aether_lord
  local CLS_DESC="$2"    # description for prompts
  local CLS_DIR="$ASSET/$CLS_KEY"
  mkdir -p "$CLS_DIR"

  echo "▶ $CLS_KEY: missing walk frames (N/NW/W/SW)"
  bash tools/codex-asset.sh sheet \
    --prompt "4 chibi character sprites in 4×1 grid (cell 256×256, 8px gutter), top-down 3/4 view, transparent background, dark fantasy painterly pixel art, MMORPG. Same character throughout: ${CLS_DESC}. Cell 1: facing AWAY (back view, walking pose stepping forward). Cell 2: facing UPPER-LEFT (back-left 3/4, walking). Cell 3: facing LEFT (side view left, walking). Cell 4: facing LOWER-LEFT (front-left 3/4, walking). Each centered in cell, NO TEXT" \
    --resolution 1024x1024 \
    --output "$CLS_DIR/walk8_back_atlas.png"
  node tools/slice-spritesheet.js \
    --input "$CLS_DIR/walk8_back_atlas.png" \
    --output "$CLS_DIR/" --cols 4 --rows 1 \
    --naming "walk8_back_{frame}"
  for i in 0 1 2 3; do
    SRC="$CLS_DIR/walk8_back_${i}.png"
    DST="$CLS_DIR/walk8_$((i+4)).png"
    [ -s "$SRC" ] && mv -f "$SRC" "$DST" || true
  done

  echo "▶ $CLS_KEY: cast/hit/death animation atlas"
  bash tools/codex-asset.sh sheet \
    --prompt "4 chibi character action sprites in 4×1 grid (cell 256×256, 8px gutter), top-down 3/4 view, transparent background, dark fantasy painterly pixel art. Same character: ${CLS_DESC}. Cell 1: CASTING magic (arms raised, glowing energy). Cell 2: HIT-REACT (recoiling backward, pained). Cell 3: KNOCKED DOWN (on knees, weakened). Cell 4: DEATH (collapsed on ground, body fading). NO TEXT" \
    --resolution 1024x1024 \
    --output "$CLS_DIR/cast_hit_death_atlas.png"
  node tools/slice-spritesheet.js \
    --input "$CLS_DIR/cast_hit_death_atlas.png" \
    --output "$CLS_DIR/" --cols 4 --rows 1 \
    --naming "act_{frame}"
  # Rename act_0=cast, act_1=hit, act_2=down, act_3=death
  for pair in "0:cast" "1:hit" "2:down" "3:death"; do
    SRC="$CLS_DIR/act_${pair%%:*}.png"
    DST="$CLS_DIR/${pair#*:}.png"
    [ -s "$SRC" ] && mv -f "$SRC" "$DST" || true
  done
}

generate_class_anim "aether_lord"   "blue-armored aether sky-lord with glowing rune cape and steel halberd"
generate_class_anim "iron_sentinel" "heavy iron-armored knight with massive shield and warhammer, gray steel"
generate_class_anim "sylvan_ranger" "green-cloaked elven ranger with leather armor and longbow, hooded"
generate_class_anim "rune_weaver"   "purple-robed rune mage with runic staff and floating glyphs, hooded"

echo "═══ ✅ P7 complete ═══"
