#!/bin/bash
# Priority-6: Monster walk/attack frames + remaining town NPCs + advanced props
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET="$ROOT/apps/client/public/assets/img"
cd "$ROOT"

echo "═══ P6: Monsters walk/attack + extra NPCs ═══"
mkdir -p "$ASSET/monsters/anim"

# === 1. Monster 4-direction × 2-frame walk atlas (tier1-5 = 5 atlases) ===
for TIER in "tier1:slime,rabbit,goblin,spider,kobold,orc,sprite,dwarf-miner" \
           "tier2:wolf,bandit,gnoll,wraith-imp,bone-warrior,fire-bat,ice-spike,sand-scorpion" \
           "tier3:cave-bat,mire-troll,mud-golem,wraith,corpse-husk,ghost-knight,steel-centaur,ogre" \
           "tier4:giant-spider,dryad,treant,skeleton-priest,wight,storm-harpy,minotaur,salamander" \
           "tier5:flame-imp,aether-spirit,divine-guardian,wyvern,drake,ancient-dragon"
do
  PREFIX="${TIER%%:*}"
  LIST="${TIER#*:}"
  bash tools/codex-asset.sh sheet \
    --prompt "Monster walk-cycle atlas — 8 different ${PREFIX} chibi monsters in 4×2 grid (cell 256×256, 16px gutter), each cell shows ONE monster in 1-step walk pose (front-facing 3/4 top-down). Monsters: ${LIST}. Transparent background, painterly pixel art, dark fantasy MMORPG, distinct colors per row, NO TEXT" \
    --resolution 1024x512 \
    --output "$ASSET/monsters/anim/${PREFIX}_walk.png"
  node tools/slice-spritesheet.js --input "$ASSET/monsters/anim/${PREFIX}_walk.png" --output "$ASSET/monsters/anim/" --cols 4 --rows 2 --naming "${PREFIX}_walk_{frame}"
done

# === 2. Monster attack pose atlas (1 atlas, 4 tiers × 1 attack frame) ===
bash tools/codex-asset.sh sheet \
  --prompt "8 monster attack pose sprites in 4×2 grid (cell 256×256), top-down 3/4 view, transparent background, dark fantasy painterly pixel art. Cells: 1-goblin lunging with dagger, 2-orc swinging crude axe, 3-wraith reaching with shadow claws, 4-troll smashing with club, 5-skeleton priest casting purple bolt, 6-minotaur charging head-down, 7-salamander breathing fire, 8-young dragon roaring with claw raised. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/monsters/anim/attack_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/monsters/anim/attack_atlas.png" --output "$ASSET/monsters/anim/" --cols 4 --rows 2 --naming "mon_attack_{frame}"

# === 3. Monster death pose atlas (1 atlas) ===
bash tools/codex-asset.sh sheet \
  --prompt "8 monster death pose sprites in 4×2 grid (cell 256×256), top-down 3/4 view, transparent background, dark fantasy. Cells: 1-goblin falling backwards, 2-orc collapsed on ground, 3-wraith dispersing into mist, 4-skeleton crumbling to dust pile, 5-spider curled legs-up, 6-troll fallen sprawled, 7-dragon body collapsed wings spread, 8-imp exploding burst flames. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/monsters/anim/death_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/monsters/anim/death_atlas.png" --output "$ASSET/monsters/anim/" --cols 4 --rows 2 --naming "mon_death_{frame}"

# === 4. Drop marker / target ring / level-up effect ===
bash tools/codex-asset.sh sheet \
  --prompt "6 game UI marker sprites in 3×2 grid (cell 256×256), transparent background, dark fantasy painterly pixel art. Cells: 1-glowing gold coin loot drop with sparkles, 2-blue selection target ring with arrow indicator, 3-yellow tap-here ground marker pulsing ring, 4-green level-up burst with stars, 5-red damage flash sphere, 6-white heal cross with light beams. NO TEXT" \
  --resolution 768x512 \
  --output "$ASSET/effects/ui_markers.png"
node tools/slice-spritesheet.js --input "$ASSET/effects/ui_markers.png" --output "$ASSET/effects/" --cols 3 --rows 2 --naming "marker_{frame}"

# === 5. Extra props — campfire / signpost variations / market stall ===
bash tools/codex-asset.sh sheet \
  --prompt "8 fantasy world prop sprites in 4×2 grid (cell 256×256), top-down 3/4 view, transparent background, dark fantasy painterly pixel art. Cells: 1-burning campfire with logs, 2-wooden signpost with hanging shingles, 3-merchant market stall with red awning, 4-stone fountain small pillar version, 5-portal magic circle glowing blue runes, 6-grave headstone weathered, 7-iron grating sewer cover, 8-stack of barrels and crates. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/props/extra_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/props/extra_atlas.png" --output "$ASSET/props/" --cols 4 --rows 2 --naming "extra_prop_{frame}"

echo "═══ ✅ P6 complete ═══"
