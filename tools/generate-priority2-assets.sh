#!/bin/bash
# Priority-2: 8-direction character walk + village building illustrations + NPC group sprites.
# Total: ~20 codex calls (Pro 한 사이클 안)
# Run: bash tools/generate-priority2-assets.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET="$ROOT/apps/client/public/assets/img"

echo "═══════════════════════════════════════════════════"
echo "  Runeword Chronicle — Priority-2 Asset Generation"
echo "═══════════════════════════════════════════════════"

cd "$ROOT"

# === 1. CHARACTER 8-DIRECTION WALK SHEETS (4 cuts → 32 frames) ===
echo "▶ Phase 1: Character 8-direction walk (4 classes)"

for SPEC in \
  "aether_lord:Aether-Lord sovereign warrior in royal blue and gold heavy armor with longsword and round shield" \
  "iron_sentinel:Iron-Sentinel knight in steel-grey plate mail with red trim, two-handed greatsword" \
  "sylvan_ranger:Sylvan Ranger elven archer in forest-green leather, longbow drawn, hooded cloak" \
  "rune_weaver:Rune-Weaver arcane mage in deep purple and silver robes, runic staff with glowing crystal"
do
  CLS="${SPEC%%:*}"
  DESC="${SPEC#*:}"
  bash tools/codex-asset.sh sheet \
    --prompt "${DESC}, top-down 3/4 perspective spritesheet, 4 columns × 2 rows grid, equal cells with 8px gutter, transparent background, dark fantasy 2D MMORPG style, painterly pixel art. Row 1 (front-facing variants): facing south, southeast, east, northeast (4 directional walk poses, mid-step). Row 2: north, northwest, west, southwest (continuing the walk cycle). Same character identity throughout — same armor, same weapon, same proportions. Sharp pixels, no anti-aliasing. NO TEXT, NO LOGO, NO HUD." \
    --reference "$ASSET/characters/${CLS}_concept.png" \
    --resolution 1024x1024 \
    --output "$ASSET/characters/${CLS}_8dir_walk.png"

  node tools/slice-spritesheet.js \
    --input "$ASSET/characters/${CLS}_8dir_walk.png" \
    --output "$ASSET/characters/${CLS}/" \
    --cols 4 --rows 2 \
    --naming "walk8_{frame}"
done

# === 2. VILLAGE BUILDING ILLUSTRATIONS (8 cuts) ===
echo "▶ Phase 2: Village buildings (top-down 3/4 view)"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view aurora-themed dark-fantasy thatched-roof house, wooden walls with painted golden trim, glowing window candles, small chimney with smoke, sturdy wooden door, surrounded by cobblestone path, painterly pixel art, dark fantasy MMORPG decoration sprite, transparent background, NO TEXT, single building only, centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/building_house.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view fantasy merchant shop, wooden building with golden roof tiles, hanging sign with merchant emblem (no text), red awning over front, baskets and crates outside, dark fantasy MMORPG decoration sprite, painterly pixel art, transparent background, NO TEXT, single building centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/building_shop.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view fantasy inn / tavern, large two-story timber building with smoking chimney, multiple lit windows, wooden balcony, hanging lanterns, beer-mug emblem (no text), dark fantasy painterly pixel art, transparent background, NO TEXT, centered, no people" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/building_inn.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view fantasy blacksmith forge, stone walls with red-hot anvil out front, smoke from chimney, weapons rack visible, hammer and tongs, dark stone foundation, painterly pixel art, dark fantasy MMORPG decoration, transparent background, NO TEXT, centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/building_smith.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view aurora-themed dark-fantasy temple, white marble walls with golden trim, tall arched roof, glowing aether-blue stained glass window, golden orb finial on roof, small altar visible at front, painterly pixel art, transparent background, NO TEXT, single building centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/building_temple.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view fantasy bank / counting house, sturdy stone building with iron-bound door, golden coin emblem (no text), small stone pillars, slate roof, oil lanterns flanking entrance, painterly pixel art, dark fantasy decoration, transparent background, NO TEXT, centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/building_bank.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view fantasy gacha rune shrine, small mystical hut with floating glowing rune stones around it, purple-blue aether crystal on top, swirling magical particles, golden runic carvings on walls, painterly pixel art, transparent background, NO TEXT, centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/building_gacha.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view aurora town stone fountain, octagonal tiered marble structure, glowing aether-blue water cascading from upper basin to lower pool, golden rim, small statue of crowned figure on top, painterly pixel art, dark fantasy MMORPG decoration, transparent background, NO TEXT, centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/building_fountain.png"

# === 3. NPC SPRITES (12 cuts as one atlas → sliced) ===
echo "▶ Phase 3: Aurora Town NPC group atlas (12 NPCs)"

bash tools/codex-asset.sh sheet \
  --prompt "12 fantasy MMORPG NPC chibi sprites in 4×3 grid, equal 256×256 cells with 16px gutter, top-down 3/4 view, transparent background, dark fantasy painterly pixel art. Row 1: 1-female merchant in green dress with tray, 2-burly bearded blacksmith with red apron and hammer, 3-female priest in white robes with golden trim. Row 2: 4-elderly bearded village chief in brown cloak with cane, 5-cheerful innkeeper woman in apron with mug, 6-stern guard in steel armor with spear. Row 3: 7-young guard with longsword, 8-male bard in colorful jester outfit playing lute, 9-banker in dark formal robes with ledger. Row 4 (3 only, last cell empty): 10-elderly scholar in gray robes with open tome, 11-mysterious transformer in shifting purple robes, 12-young gacha priestess in violet robes holding glowing rune. Each character distinct, dark fantasy palette, sharp pixel art, NO TEXT, NO LOGO" \
  --resolution 1024x1024 \
  --output "$ASSET/npcs/aurora_town_atlas.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/npcs/aurora_town_atlas.png" \
  --output "$ASSET/npcs/" \
  --cols 4 --rows 3 \
  --naming "aurora_npc_{frame}"

echo "═══════════════════════════════════════════════════"
echo "  ✅ Priority-2 asset generation complete"
echo "═══════════════════════════════════════════════════"
ls -la "$ASSET"/scenery/ "$ASSET"/npcs/ "$ASSET"/characters/ 2>/dev/null | head -40
