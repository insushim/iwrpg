#!/bin/bash
# Priority-5: Replace procedural placeholders with real codex illustrations.
#  - Nature atlas (trees, rocks, bushes, flowers, grass tufts) — 12 variants
#  - Aurora NPC atlas v2 (clearer guard / bard / scholar / transformer)
#  - Road/path tile atlas (cobble, stone, dirt seamless variants)
#  - Decorative props (lantern post, signpost, barrel, crate, well)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET="$ROOT/apps/client/public/assets/img"
cd "$ROOT"

echo "═══════════════════════════════════════════════════"
echo "  Priority-5 — Replace procedural placeholders"
echo "═══════════════════════════════════════════════════"
mkdir -p "$ASSET/nature" "$ASSET/props" "$ASSET/tiles_real"

# === 1. NATURE ATLAS (12 sprites: 6 trees, 3 bushes, 3 rocks) ===
echo "▶ Phase 1: Nature atlas — trees / bushes / rocks (4×3 grid)"

bash tools/codex-asset.sh sheet \
  --prompt "12 nature sprites in 4×3 grid, equal cells with 16px gutter, top-down 3/4 perspective for fantasy 2D MMORPG, transparent background, painterly pixel art, dark fantasy palette. Cells: 1-tall pine tree dark green, 2-oak tree with full canopy autumn-tinted, 3-twisted dead tree, 4-young birch tree, 5-blossoming cherry tree pink, 6-large magical glowing tree with blue leaves, 7-small green bush, 8-flowering bush red flowers, 9-thorny dark bush, 10-large gray boulder mossy, 11-cluster of small jagged rocks, 12-single round mossy stone. Each centered in cell, NO TEXT, NO LOGO" \
  --resolution 1024x768 \
  --output "$ASSET/nature/atlas.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/nature/atlas.png" \
  --output "$ASSET/nature/" \
  --cols 4 --rows 3 \
  --naming "nature_{frame}"

# === 2. FLOWERS / GRASS TUFTS ATLAS (8 small decorations) ===
echo "▶ Phase 2: Flowers & grass tufts (4×2)"

bash tools/codex-asset.sh sheet \
  --prompt "8 small decoration sprites in 4×2 grid, equal cells with 12px gutter, top-down view, transparent background, painterly pixel art, dark fantasy. Cells: 1-red wildflower cluster, 2-blue forget-me-not patch, 3-yellow daisy patch, 4-purple lavender stalks, 5-tall grass tuft green, 6-fern frond, 7-mushroom cluster red caps, 8-glowing magical mushroom blue. Each small and centered, NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/nature/decor_atlas.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/nature/decor_atlas.png" \
  --output "$ASSET/nature/" \
  --cols 4 --rows 2 \
  --naming "decor_{frame}"

# === 3. SEAMLESS GROUND TILES (3 single tiles) — used as repeating ground ===
echo "▶ Phase 3: Seamless ground textures"

bash tools/codex-asset.sh single \
  --prompt "Seamless tileable top-down dark-fantasy grass texture, painterly pixel art, varied lush dark green grass blades with occasional small clovers and dirt patches, no horizon no perspective lines, perfectly tileable on all four edges, NO TEXT" \
  --resolution 512x512 \
  --output "$ASSET/tiles_real/ground_grass.png"

bash tools/codex-asset.sh single \
  --prompt "Seamless tileable top-down dark-fantasy stone path texture, painterly pixel art, weathered grey cobblestones with mortar gaps, occasional moss patches, perfectly tileable on all four edges, NO TEXT" \
  --resolution 512x512 \
  --output "$ASSET/tiles_real/ground_path.png"

bash tools/codex-asset.sh single \
  --prompt "Seamless tileable top-down dark-fantasy dirt road texture, painterly pixel art, brown packed earth with wagon wheel tracks, scattered pebbles, perfectly tileable on all four edges, NO TEXT" \
  --resolution 512x512 \
  --output "$ASSET/tiles_real/ground_dirt.png"

# === 4. DECORATIVE PROPS (8 town props) ===
echo "▶ Phase 4: Town decorative props"

bash tools/codex-asset.sh sheet \
  --prompt "8 decorative town props in 4×2 grid, equal cells with 16px gutter, top-down 3/4 view, transparent background, painterly pixel art, dark fantasy. Cells: 1-iron lantern post with golden flame, 2-wooden signpost with arrow, 3-wooden barrel with iron bands, 4-wooden crate with rope handles, 5-stone well with thatched roof and bucket, 6-merchant cart with goods, 7-stone monument statue of armored knight, 8-banner pole with golden flag. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/props/town_atlas.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/props/town_atlas.png" \
  --output "$ASSET/props/" \
  --cols 4 --rows 2 \
  --naming "prop_{frame}"

# === 5. AURORA NPC ATLAS V2 (clearer renders) ===
echo "▶ Phase 5: Aurora NPC atlas v2"

bash tools/codex-asset.sh sheet \
  --prompt "12 fantasy MMORPG NPC chibi sprites in 4×3 grid, equal 256×256 cells with 16px gutter, top-down 3/4 view, transparent background, dark fantasy painterly pixel art. Each character SHARP and CLEARLY VISIBLE filling the cell. Row 1: 1-female merchant Lina in green dress holding tray of goods, 2-stout bearded blacksmith Dorgan in red leather apron with hammer, 3-female priest Mirelle in white-and-gold robes holding glowing aether orb. Row 2: 4-elderly bearded village chief Baren in brown cloak with cane, 5-stern fortress GUARD CAPTAIN Kael in shining steel armor with spear and shield (BIG sprite, clearly visible), 6-cheerful innkeeper Haru in apron holding wooden mug. Row 3: 7-cheerful BARD Seon in colorful red-and-blue jester outfit playing wooden lute (BIG sprite, clearly visible), 8-banker Milos in dark formal robes with scroll and quill, 9-elderly scholar Aleth in gray robes with floating tome. Row 4: 10-mysterious transformer Vael in shifting purple robes with glowing eyes, 11-young gacha priestess Selevis in violet robes holding glowing crystal rune, 12 (LAST cell) BLANK gray. Each character distinct and FULLY rendered, NO TEXT, NO LOGO" \
  --resolution 1024x1024 \
  --output "$ASSET/npcs/aurora_town_atlas_v2.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/npcs/aurora_town_atlas_v2.png" \
  --output "$ASSET/npcs/" \
  --cols 4 --rows 3 \
  --naming "aurora_npc_v2_{frame}"

echo "═══════════════════════════════════════════════════"
echo "  ✅ Priority-5 generation complete"
echo "═══════════════════════════════════════════════════"
