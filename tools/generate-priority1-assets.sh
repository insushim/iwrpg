#!/bin/bash
# Generate priority-1 assets via codex CLI gpt-image-2.
# Total: ~85 cuts (Pro tier handles in 1 cycle, Plus in 2 cycles).
#
# Run: bash tools/generate-priority1-assets.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET="$ROOT/apps/client/public/assets/img"

echo "═══════════════════════════════════════════════════"
echo "  Runeword Chronicle — Priority-1 Asset Generation"
echo "  Target: ~85 cuts via codex CLI gpt-image-2"
echo "═══════════════════════════════════════════════════"

cd "$ROOT"

# === 1. CLASS CONCEPT ARTS (4 cuts) ===
echo "▶ Phase 1: Class concept arts (4 cuts)"

bash tools/codex-asset.sh single \
  --prompt "Aether-Lord character concept art: sovereign warrior in royal blue and gold heavy armor, ornate crown, longsword and round shield, dignified standing pose, top-down 3/4 perspective view suitable for 2D MMORPG, dark fantasy style, painterly digital art, transparent or simple dark background, single character only, NO TEXT, NO LOGO" \
  --resolution 1024x1024 \
  --output "$ASSET/characters/aether_lord_concept.png"

bash tools/codex-asset.sh single \
  --prompt "Iron-Sentinel character concept art: heavy-armored knight tank in steel-grey plate mail with red trim, two-handed greatsword raised, shield strapped to back, defensive stance, top-down 3/4 view, dark fantasy 2D MMORPG style, painterly, transparent background, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/characters/iron_sentinel_concept.png"

bash tools/codex-asset.sh single \
  --prompt "Sylvan Ranger character concept art: agile elven archer in forest-green leather armor with brown accents, longbow drawn, quiver of arrows, hooded cloak, alert ready stance, top-down 3/4 view, dark fantasy 2D MMORPG style, painterly, transparent background, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/characters/sylvan_ranger_concept.png"

bash tools/codex-asset.sh single \
  --prompt "Rune-Weaver character concept art: arcane mage in deep purple and silver robes, runic staff with glowing crystal tip, floating runes circling, mysterious hooded figure, top-down 3/4 view, dark fantasy 2D MMORPG style, painterly, transparent background, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/characters/rune_weaver_concept.png"

# === 2. CLASS SPRITE SHEETS (4 cuts × 1 sheet each = 4 cuts) ===
echo "▶ Phase 2: Class spritesheets (4 cuts, sliced into 48 frames)"

for CLS in aether_lord iron_sentinel sylvan_ranger rune_weaver; do
  bash tools/codex-asset.sh sheet \
    --prompt "${CLS} character spritesheet for top-down 2D MMORPG, 4 columns × 3 rows grid layout (cells equal size, 16px gutter between cells), pixel-art chibi proportions 32x32 base scaled up. Row 1: idle animation 4 frames (subtle breathing). Row 2: walk cycle 4 frames (front-facing leg motion). Row 3: attack 4 frames (weapon swing or spell cast). Same character identity throughout, dark fantasy color palette, transparent background, sharp pixels no anti-aliasing, NO TEXT." \
    --reference "$ASSET/characters/${CLS}_concept.png" \
    --resolution 1024x1024 \
    --output "$ASSET/characters/${CLS}_sheet_raw.png"

  # Slice into individual frames
  node tools/slice-spritesheet.js \
    --input "$ASSET/characters/${CLS}_sheet_raw.png" \
    --output "$ASSET/characters/${CLS}/" \
    --cols 4 --rows 3 \
    --naming "{anim}_{frame}" \
    --row-names "idle,walk,attack"
done

# === 3. UI 9-SLICE PANEL + ICONS (2 cuts) ===
echo "▶ Phase 3: UI base panel + icon set (2 cuts)"

bash tools/codex-asset.sh single \
  --prompt "game UI 9-slice panel base, ornate dark fantasy frame style with golden runic border, dark wood/stone texture interior, transparent corners suitable for 9-slice scaling, NO TEXT inside, square 1:1, decorative gold filigree at corners" \
  --resolution 512x512 \
  --output "$ASSET/ui/panel_9slice.png"

bash tools/codex-asset.sh sheet \
  --prompt "16 fantasy RPG icons in 4×4 grid, each 64×64 pixel cell, equal size, transparent background, dark fantasy style with golden accents: 1-sword, 2-shield, 3-bow, 4-staff, 5-potion red, 6-potion blue, 7-scroll, 8-tome book, 9-gem ruby, 10-gem sapphire, 11-key, 12-coin gold, 13-rune stone, 14-heart, 15-lightning bolt, 16-skull, NO TEXT inside cells" \
  --resolution 1024x1024 \
  --output "$ASSET/ui/icons_raw.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/ui/icons_raw.png" \
  --output "$ASSET/ui/icons/" \
  --cols 4 --rows 4

# === 4. MAP TILESETS (5 town/area types × 1 = 5 cuts; rest reuse procedural) ===
echo "▶ Phase 4: Map tilesets (5 base tilesets)"

bash tools/codex-asset.sh single \
  --prompt "Top-down 2D RPG tileset, 8x8 grid of 64x64 pixel cells (transparent gutter): cobblestone path 4 variants, grass with flowers 4 variants, wooden plank floor, stone wall block, wooden door, fountain, market stall, signpost wood, fence wood, flower patch, tree, bush. Seamlessly tileable, dark fantasy color palette, pixel art style, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/tiles/town_tileset.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 2D RPG tileset, 8x8 grid of 64x64 pixel cells, dark forest theme: dark grass 4 variants, mossy ground, tree stump, log, mushroom red, mushroom purple, fern, dark bush, fallen leaves, dirt path, mossy stone, ancient root, glowing crystal, fog patch. Seamlessly tileable, dark fantasy, pixel art, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/tiles/forest_tileset.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 2D RPG tileset, 8x8 grid 64x64 pixel cells, cave/mine theme: dark stone floor, gravel, rocks pile, mine cart, lantern, ore vein, crystal cluster, wooden support beam, mineshaft track, water puddle, mushroom glow, bones, treasure pile. Seamlessly tileable, dark fantasy, pixel art, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/tiles/cave_tileset.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 2D RPG tileset, 8x8 grid 64x64 cells, ruined temple/citadel theme: marble floor, broken pillar, ancient runes, altar, statue, throne, gold-trim tile, vine overgrowth, shattered floor, sacred fire pit. Seamlessly tileable, dark fantasy, pixel art, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/tiles/citadel_tileset.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 2D RPG tileset, 8x8 grid 64x64 cells, dragon volcanic theme: scorched earth, lava cracks, ash, obsidian rock, dragon scale shed, charred bones, fire geyser, sulfur pools, basalt columns. Seamlessly tileable, dark fantasy, pixel art, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/tiles/dragon_tileset.png"

# === 5. MONSTER SPRITES (38 cuts at 2-3 per call by combining similar tier mobs) ===
echo "▶ Phase 5: Monster sprites (lightweight chibi sprites for 38 monsters)"

# Group by tier into batch sheets — slice afterward
bash tools/codex-asset.sh sheet \
  --prompt "8 cute-but-menacing monster chibi sprites in 4x2 grid, 128x128 cells, top-down 3/4 view, transparent background, dark fantasy MMORPG style, distinct colors: 1-blue slime jiggling, 2-grey wild rabbit, 3-green goblin scout with dagger, 4-grey ashgrey spider, 5-yellow kobold with knife, 6-green orc scout with crude axe, 7-glowing white sprite floating, 8-tan dwarf miner with pick. NO TEXT, sharp pixels" \
  --resolution 1024x512 \
  --output "$ASSET/monsters/tier1_2_batch_raw.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/monsters/tier1_2_batch_raw.png" \
  --output "$ASSET/monsters/" \
  --cols 4 --rows 2 \
  --naming "tier12_{frame}" \
  --row-names "row0,row1"

bash tools/codex-asset.sh sheet \
  --prompt "8 monster chibi sprites in 4x2 grid, 128x128 cells, top-down 3/4 view, transparent background, dark fantasy, distinct: 1-black cave bat wings spread, 2-mossy mire troll hulking, 3-brown mud golem rough, 4-pale wraith floating eerie, 5-green corpse husk decayed, 6-grey wraith ghost translucent, 7-tan steel centaur upper body, 8-massive mountain ogre with club. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/monsters/tier3_batch_raw.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/monsters/tier3_batch_raw.png" \
  --output "$ASSET/monsters/" \
  --cols 4 --rows 2 \
  --naming "tier3_{frame}"

bash tools/codex-asset.sh sheet \
  --prompt "8 high-tier monster chibi sprites in 4x2 grid, 128x128 cells, top-down 3/4, transparent bg, dark fantasy: 1-giant cave spider 8 legs, 2-green forest dryad with leaves, 3-wrathful treant tree-monster, 4-skeleton priest in tattered robes, 5-shadowy wight, 6-feathered storm harpy, 7-bull-headed labyrinth minotaur, 8-fiery red salamander lizard. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/monsters/tier4_batch_raw.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/monsters/tier4_batch_raw.png" \
  --output "$ASSET/monsters/" \
  --cols 4 --rows 2 \
  --naming "tier4_{frame}"

bash tools/codex-asset.sh sheet \
  --prompt "6 endgame monster chibi sprites in 3x2 grid, 170x256 cells, top-down 3/4, transparent bg, dark fantasy: 1-orange flame imp horns, 2-cyan aether spirit ethereal, 3-golden divine guardian armored, 4-purple young wyvern wings, 5-red young drake breath, 6-massive dragon outline. NO TEXT" \
  --resolution 1024x768 \
  --output "$ASSET/monsters/tier5_batch_raw.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/monsters/tier5_batch_raw.png" \
  --output "$ASSET/monsters/" \
  --cols 3 --rows 2 \
  --naming "tier5_{frame}"

# === 6. BOSS SPLASH ARTS (4 cuts, --thinking for quality) ===
echo "▶ Phase 6: Boss splash arts (4 cuts, hi-quality)"

bash tools/codex-asset.sh single --thinking \
  --prompt "Sela the Lich Queen — ancient lich boss, skeletal sorceress in tattered black robes, glowing purple eyes, floating crystal orb, dramatic dark backdrop with violet flames, magazine-quality boss splash art, painterly digital art, dark fantasy, NO TEXT" \
  --resolution 1024x1536 \
  --output "$ASSET/bosses/sela_lich_queen.png"

bash tools/codex-asset.sh single --thinking \
  --prompt "Perros the Iron Dragon — massive mechanical-organic dragon boss, steel-plated scales with copper veins, glowing forge eyes, smoke rising, industrial nest backdrop, magazine boss splash art, painterly, dark fantasy, NO TEXT" \
  --resolution 1024x1536 \
  --output "$ASSET/bosses/perros_iron_dragon.png"

bash tools/codex-asset.sh single --thinking \
  --prompt "Mutos the Silent God — eldritch deity boss, masked humanoid with multiple arms, voidless eyes, gold and obsidian robes, temple ruins backdrop with floating runes, magazine boss splash art, painterly, dark fantasy, NO TEXT" \
  --resolution 1024x1536 \
  --output "$ASSET/bosses/mutos_silent_god.png"

bash tools/codex-asset.sh single --thinking \
  --prompt "Vyranthos the Fallen Drake — corrupted ancient dragon boss, dark scales with violet crack-glow, broken horns, massive tattered wings, intimidating roar pose, magazine-quality boss splash art, dramatic misty volcanic backdrop, painterly digital art, dark fantasy, NO TEXT" \
  --resolution 1024x1536 \
  --output "$ASSET/bosses/vyranthos_fallen.png"

# === 7. ITEM ICON SHEET (1 cut → 16 icons sliced) ===
echo "▶ Phase 7: Item icons (1 cut → sliced)"

bash tools/codex-asset.sh sheet \
  --prompt "16 fantasy RPG weapon and armor icons in 4x4 grid, 128x128 cells, top-down 3/4 view, transparent bg: 1-iron longsword, 2-steel rapier, 3-dwarven war hammer, 4-elven bow, 5-magic staff with crystal, 6-shield knight kite, 7-greataxe, 8-spear, 9-leather chest, 10-chainmail chest, 11-plate chest, 12-mage robe, 13-iron helm, 14-knight helm, 15-cloak, 16-leather boots. Each centered in cell, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/items/weapons_armor_raw.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/items/weapons_armor_raw.png" \
  --output "$ASSET/items/" \
  --cols 4 --rows 4 \
  --naming "weapon_armor_{frame}"

echo "═══════════════════════════════════════════════════"
echo "  ✅ Priority-1 asset generation complete"
echo "  Total cuts: ~25 (sliced into ~80+ individual frames)"
echo "═══════════════════════════════════════════════════"
ls -la "$ASSET"/characters/ "$ASSET"/monsters/ "$ASSET"/bosses/ "$ASSET"/tiles/ "$ASSET"/ui/ "$ASSET"/items/ 2>/dev/null | head -50
