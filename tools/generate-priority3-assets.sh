#!/bin/bash
# Priority-3: 4 additional towns + 4 dungeon interiors + named/world boss splashes + gacha boxes.
# Total: ~30 codex calls.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET="$ROOT/apps/client/public/assets/img"
cd "$ROOT"

echo "═══════════════════════════════════════════════════"
echo "  Priority-3 — Towns / Dungeons / Bosses / Gacha"
echo "═══════════════════════════════════════════════════"
mkdir -p "$ASSET/scenery/towns" "$ASSET/dungeons" "$ASSET/bosses" "$ASSET/gacha" "$ASSET/effects"

# === 1. UNIQUE TOWN SIGNATURE BUILDINGS (4 towns × 1 hero shot = 4 cuts) ===
echo "▶ Phase 1: Unique town hero shots"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view fantasy MMORPG town hero shot — Treeshade Town: lush forest village built among giant tree roots, wooden walkways spiraling around trunks, leaf-roof huts, glowing fireflies, mossy stone path, painterly pixel art, dark fantasy, transparent background, NO TEXT, single composition centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/towns/treeshade_hero.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view fantasy MMORPG town hero shot — Crimson Fortress: militant stone fortress with red banners, iron gates, watchtowers, training yard with weapon racks, soldiers' barracks, painterly pixel art, dark fantasy, transparent background, NO TEXT, centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/towns/crimson_hero.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view fantasy MMORPG town hero shot — Verity Citadel: holy white-marble temple city with golden domes, sacred libraries, glowing aether-blue stained glass, divine light streaming down, painterly pixel art, dark fantasy, transparent background, NO TEXT, centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/towns/verity_hero.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view fantasy MMORPG town hero shot — Starhaven: floating sky city with arcane crystal towers, swirling aether mists, suspended bridges, runic platforms glowing purple-blue, painterly pixel art, dark fantasy, transparent background, NO TEXT, centered" \
  --resolution 1024x1024 \
  --output "$ASSET/scenery/towns/starhaven_hero.png"

# === 2. DUNGEON INTERIORS (4 boss dungeons × 1 = 4 cuts) ===
echo "▶ Phase 2: Boss dungeon interiors"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view boss dungeon interior — Lich Crypt of Sela: dark stone burial chamber, scattered bones, purple necromantic flames in braziers, central altar with crystal orb, hanging chains, painterly pixel art, dark fantasy, transparent background, NO TEXT, atmospheric" \
  --resolution 1024x1024 \
  --output "$ASSET/dungeons/sela_crypt.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view boss dungeon interior — Iron Foundry of Perros: industrial dragon forge, glowing molten lava channels, massive iron gears, copper pipes, anvils, smoke pillars, painterly pixel art, dark fantasy, transparent background, NO TEXT, atmospheric" \
  --resolution 1024x1024 \
  --output "$ASSET/dungeons/perros_foundry.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view boss dungeon interior — Silent Sanctum of Mutos: ancient temple with floating obsidian pillars, void portals, golden runic floor patterns, eerie cosmic light, eldritch geometry, painterly pixel art, dark fantasy, transparent background, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/dungeons/mutos_sanctum.png"

bash tools/codex-asset.sh single \
  --prompt "Top-down 3/4 view boss dungeon interior — Drake Lair of Vyranthos: massive volcanic cavern, glowing lava cracks, dragon scales scattered, charred dragon bones, smoking obsidian walls, painterly pixel art, dark fantasy, transparent background, NO TEXT, atmospheric" \
  --resolution 1024x1024 \
  --output "$ASSET/dungeons/vyranthos_lair.png"

# === 3. NAMED MONSTER SPLASH (6 named monsters as one atlas) ===
echo "▶ Phase 3: Named monster atlas (6 sprites)"

bash tools/codex-asset.sh sheet \
  --prompt "6 named-tier monster boss-style sprites in 3×2 grid, equal 256×384 cells with 16px gutter, top-down 3/4 view, transparent background, dark fantasy painterly pixel art. Cells: 1-Goblin Warlord with golden helmet and spiked club, 2-Frost Troll with massive ice-club, 3-Forest Dryad Queen with glowing antler crown, 4-Skeletal Knight Champion in cursed plate armor, 5-Mire Shaman with bone staff and bog-water robes, 6-Stone Golem Ancient with runic carvings glowing on body. Each distinct, intimidating, NO TEXT, NO LOGO" \
  --resolution 1024x1024 \
  --output "$ASSET/monsters/named_atlas.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/monsters/named_atlas.png" \
  --output "$ASSET/monsters/" \
  --cols 3 --rows 2 \
  --naming "named_{frame}"

# === 4. GACHA BOXES (5 cuts) ===
echo "▶ Phase 4: Gacha box illustrations"

for SPEC in \
  "normal:Normal Gacha Box, sturdy wooden chest with bronze trim and simple iron lock, slightly worn, soft glow:bronze" \
  "rare:Rare Gacha Box, polished oak chest with silver trim and engraved scrollwork, blue magical aura around it:silver" \
  "epic:Epic Gacha Box, ornate dark-wood chest with golden filigree and ruby gemstones inset, purple magical aura:purple" \
  "legendary:Legendary Gacha Box, brilliant golden chest with massive runic seal, white-gold radiance, floating particles:gold" \
  "rune:Rune Gacha Box, crystalline aether-blue chest with floating runic stones around it, mystical violet glow:cyan-violet"
do
  KEY="${SPEC%%:*}"
  REST="${SPEC#*:}"
  DESC="${REST%%:*}"
  AURA="${REST##*:}"
  bash tools/codex-asset.sh single \
    --prompt "Fantasy RPG ${DESC}, top-down 3/4 view item illustration, ${AURA} colored aura, intricate fantasy ornamentation, painterly pixel art, dark fantasy MMORPG, transparent background, single chest centered, NO TEXT" \
    --resolution 1024x1024 \
    --output "$ASSET/gacha/box_${KEY}.png"
done

# === 5. SPELL EFFECTS (1 atlas → 6 frames) ===
echo "▶ Phase 5: Spell effect atlas"

bash tools/codex-asset.sh sheet \
  --prompt "6 spell effect sprites in 3×2 grid, equal 256×256 cells, transparent background, top-down combat magic effects: 1-fire explosion burst orange-red, 2-ice shard cluster cyan-white, 3-lightning bolt strike yellow-purple, 4-arcane runic circle violet glow, 5-holy light cross golden, 6-shadow tendril purple-black. Sharp pixel art, painterly, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/effects/spells_atlas.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/effects/spells_atlas.png" \
  --output "$ASSET/effects/" \
  --cols 3 --rows 2 \
  --naming "spell_{frame}"

# === 6. ADDITIONAL TOWN NPCS — Treeshade NPCs (8 NPCs as atlas) ===
echo "▶ Phase 6: Treeshade Town NPC atlas"

bash tools/codex-asset.sh sheet \
  --prompt "8 forest-village NPC chibi sprites in 4×2 grid, equal 256×256 cells with 16px gutter, top-down 3/4 view, transparent background, dark fantasy painterly pixel art, leafy/wooden palette. Cells: 1-elven female forest merchant Yuna with leaf-basket, 2-elderly woodland blacksmith Borak with green apron, 3-druid priestess Tanya in moss robes, 4-young forest hunter Avin with bow, 5-tree-shade innkeeper Reno with wooden mug, 6-elven guard Thal with silver spear, 7-mushroom-gatherer Grimsby with sack, 8-runic-tree-keeper Elara with staff. Distinct characters, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/npcs/treeshade_atlas.png"

node tools/slice-spritesheet.js \
  --input "$ASSET/npcs/treeshade_atlas.png" \
  --output "$ASSET/npcs/" \
  --cols 4 --rows 2 \
  --naming "treeshade_npc_{frame}"

echo "═══════════════════════════════════════════════════"
echo "  ✅ Priority-3 generation complete"
echo "═══════════════════════════════════════════════════"
