#!/bin/bash
# Priority-4: Commercial-grade detail pass.
#  - Character portraits (selection art) + attack/death animations
#  - 4 additional town building & NPC atlases (Crimson / Verity / Starhaven + remaining)
#  - 17 map environment hero shots
#  - Spell effects expansion + gacha open burst
#  - Item icon atlas expansion (potions / scrolls / runes / accessories)
# Total: ~60 codex calls

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET="$ROOT/apps/client/public/assets/img"
cd "$ROOT"

echo "═══════════════════════════════════════════════════"
echo "  Priority-4 — Commercial-grade detail pass"
echo "═══════════════════════════════════════════════════"
mkdir -p "$ASSET/portraits" "$ASSET/scenery/buildings" "$ASSET/maps_hero" "$ASSET/items/icons" "$ASSET/effects"

# === 1. CHARACTER PORTRAITS — character-select hero art (4 cuts) ===
echo "▶ Phase 1: Character portraits (selection screen art)"

bash tools/codex-asset.sh single \
  --prompt "High-quality character portrait illustration of an Aether-Lord — sovereign warrior in royal blue and gold heavy armor, ornate winged crown, longsword raised in salute, deep blue cape, dramatic backlit aether glow, painterly digital art, magazine cover quality, head and shoulders heroic 3/4 view, dark fantasy MMORPG. Transparent background. NO TEXT, NO LOGO" \
  --reference "$ASSET/characters/aether_lord_concept.png" \
  --resolution 1024x1536 \
  --output "$ASSET/portraits/aether_lord_portrait.png"

bash tools/codex-asset.sh single \
  --prompt "High-quality character portrait illustration of an Iron-Sentinel — heavy-armored knight tank in steel-grey plate mail with crimson trim, two-handed greatsword resting at side, scarred determined face, faint ember glow on weapon, painterly digital art, magazine cover quality, head and shoulders heroic 3/4 view, dark fantasy MMORPG. Transparent background. NO TEXT" \
  --reference "$ASSET/characters/iron_sentinel_concept.png" \
  --resolution 1024x1536 \
  --output "$ASSET/portraits/iron_sentinel_portrait.png"

bash tools/codex-asset.sh single \
  --prompt "High-quality character portrait illustration of a Sylvan Ranger — agile elven archer in forest-green leather armor, longbow drawn with shimmering arcane arrow nocked, hooded cloak with leaf trim, sharp focused eyes, moonlit forest backdrop, painterly digital art, head and shoulders heroic 3/4 view, dark fantasy MMORPG. Transparent background. NO TEXT" \
  --reference "$ASSET/characters/sylvan_ranger_concept.png" \
  --resolution 1024x1536 \
  --output "$ASSET/portraits/sylvan_ranger_portrait.png"

bash tools/codex-asset.sh single \
  --prompt "High-quality character portrait illustration of a Rune-Weaver — arcane mage in deep purple and silver robes, runic staff with massive glowing crystal tip, floating runes orbiting the head, hooded mysterious figure with glowing violet eyes, painterly digital art, head and shoulders heroic 3/4 view, dark fantasy MMORPG. Transparent background. NO TEXT" \
  --reference "$ASSET/characters/rune_weaver_concept.png" \
  --resolution 1024x1536 \
  --output "$ASSET/portraits/rune_weaver_portrait.png"

# === 2. CHARACTER ATTACK ANIMATIONS (4 sheets sliced into 4 frames each) ===
echo "▶ Phase 2: Character attack animations"

for SPEC in \
  "aether_lord:Aether-Lord swinging longsword in three-stage motion, golden trail effect" \
  "iron_sentinel:Iron-Sentinel performing heavy two-handed greatsword overhead chop, sparks" \
  "sylvan_ranger:Sylvan Ranger drawing bow, releasing arcane arrow, follow-through pose" \
  "rune_weaver:Rune-Weaver casting spell, raising staff, channeling violet aether magic"
do
  CLS="${SPEC%%:*}"
  DESC="${SPEC#*:}"
  bash tools/codex-asset.sh sheet \
    --prompt "${DESC}, top-down 3/4 view 4-frame attack animation in horizontal strip, equal cells with 8px gutter, transparent background, dark fantasy painterly pixel art. Frame 1: wind-up. Frame 2: forward strike. Frame 3: impact peak with effect particles. Frame 4: recovery pose. Same character throughout, NO TEXT, NO LOGO" \
    --reference "$ASSET/characters/${CLS}_concept.png" \
    --resolution 1024x256 \
    --output "$ASSET/characters/${CLS}_attack.png"

  node tools/slice-spritesheet.js \
    --input "$ASSET/characters/${CLS}_attack.png" \
    --output "$ASSET/characters/${CLS}/" \
    --cols 4 --rows 1 \
    --naming "atk_{frame}"
done

# === 3. ENVIRONMENT HERO SHOTS — 17 maps (bash 3 compatible) ===
echo "▶ Phase 3: Environment hero shots (17 maps)"

MAPS_LIST="
aurora_town|bright dawn town with golden banners, marble fountain, cherry trees in bloom
treeshade_town|forest village built into massive ancient trees, glowing mushroom lanterns, vine bridges
crimson_fortress|militant red-banner stone fortress with watchtowers, soldiers training in courtyard, iron gates
verity_citadel|holy white-marble temple city with golden domes, divine sunbeams, sacred fountains
starhaven|floating arcane sky city with crystal towers, swirling aether mists, runic platforms
aurora_fields|rolling green plains at dawn, scattered ancient stones, wildflowers, distant hills
forgotten_meadow|overgrown abandoned meadow with broken statues, wildflower carpet, soft mist
whisper_woods|dark mysterious forest with twisted trees, glowing fireflies, mossy paths
sunken_mine|abandoned mine entrance with rusted carts, broken supports, ore veins glowing
mistwail_marsh|foggy bog with twisted dead trees, glowing eyes in fog, murky water
ashen_caverns|dark stone caverns with crystal clusters, lava cracks, ancient skeletons
azure_grove|enchanted blue forest with glowing trees, magical streams, faerie lights
ruined_citadel|crumbling fortress overgrown with ivy, broken statues, faded banners
ruined_temple|shattered ancient temple with broken pillars, runic floor, mystic light beams
pyre_peaks|volcanic mountain peaks with lava flows, charred rocks, smoke pillars
aether_rift|dimensional rift with floating islands, swirling void portals, arcane runes
drakensvale|dragon-burned valley with massive bones, charred trees, smoking ground
"

while IFS='|' read -r MAP_ID DESC <&3; do
  [ -z "$MAP_ID" ] && continue
  bash tools/codex-asset.sh single \
    --prompt "Top-down 3/4 view fantasy MMORPG environment hero shot — ${DESC}, atmospheric depth and lighting, painterly pixel art with rich detail, magazine quality, dark fantasy, single composition, NO TEXT, transparent or atmospheric background" \
    --resolution 1024x1024 \
    --output "$ASSET/maps_hero/${MAP_ID}.png"
done 3<<< "$MAPS_LIST"

# === 4. ADDITIONAL TOWN NPC ATLASES (3 towns × 8 NPCs) ===
echo "▶ Phase 4: Crimson + Verity + Starhaven NPC atlases"

bash tools/codex-asset.sh sheet \
  --prompt "8 fortress-town NPC chibi sprites in 4×2 grid, equal cells with 16px gutter, top-down 3/4 view, transparent background, dark fantasy painterly pixel art, militant/red palette. Cells: 1-grizzled fortress quartermaster Hagar with armor stand, 2-master smith Karven with blackened apron and mighty hammer, 3-war priest Vellik in red-trim white robes, 4-fortress commander Roen in steel-and-red plate, 5-veteran sergeant Talia with red banner, 6-armorer Dalsten in leather apron, 7-stable master Dorian with horse brushes, 8-rune merchant Yex with crimson cloak. NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/npcs/crimson_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/npcs/crimson_atlas.png" --output "$ASSET/npcs/" --cols 4 --rows 2 --naming "crimson_npc_{frame}"

bash tools/codex-asset.sh sheet \
  --prompt "8 holy-citadel NPC chibi sprites in 4×2 grid, equal cells, top-down 3/4 view, transparent background, dark fantasy painterly pixel art, white-and-gold sacred palette. Cells: 1-high priestess Lumina in flowing white-and-gold robes, 2-templar knight Aurelius in white plate, 3-scholar archivist Cellis with golden scrolls, 4-divine healer Mira with light orb, 5-cathedral guard Velin in white plate with golden spear, 6-cleric Tobias in modest white robes, 7-monk Kael in simple white robes with prayer beads, 8-runesmith Zelara with engraving tools. NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/npcs/verity_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/npcs/verity_atlas.png" --output "$ASSET/npcs/" --cols 4 --rows 2 --naming "verity_npc_{frame}"

bash tools/codex-asset.sh sheet \
  --prompt "8 sky-city arcane NPC chibi sprites in 4×2 grid, equal cells, top-down 3/4 view, transparent background, dark fantasy painterly pixel art, violet-aether palette with floating particles. Cells: 1-archmage Vaelis in star-patterned violet robes, 2-arcane researcher Kestra with floating diagrams, 3-rune trader Mordan with gemstone trays, 4-aether engineer Sina with mechanical tools, 5-mystic seer Talmir with glowing eyes and crystal ball, 6-celestial guard Veyra with glowing spear, 7-portal master Rian with swirling sphere, 8-rune sage Elundra with floating tomes. NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/npcs/starhaven_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/npcs/starhaven_atlas.png" --output "$ASSET/npcs/" --cols 4 --rows 2 --naming "starhaven_npc_{frame}"

# === 5. ADDITIONAL BOSS SPLASHES — second tier (4 cuts) ===
echo "▶ Phase 5: Additional boss splash arts"

bash tools/codex-asset.sh single \
  --prompt "Goblin Warlord boss splash art — armored goblin chieftain with golden helmet, jagged spiked club, leather harness over green skin, snarling face with broken tusks, dark forest backdrop with goblin banners, magazine-quality boss splash, painterly digital art, dark fantasy, NO TEXT" \
  --resolution 1024x1536 \
  --output "$ASSET/bosses/goblin_warlord.png"

bash tools/codex-asset.sh single \
  --prompt "Frost Troll Berserker boss splash art — massive blue-skinned troll with icicle-encrusted fur, two icy clubs raised, frosty breath cloud, snowy mountain pass backdrop, magazine-quality boss splash, painterly digital art, dark fantasy, NO TEXT" \
  --resolution 1024x1536 \
  --output "$ASSET/bosses/frost_troll.png"

bash tools/codex-asset.sh single \
  --prompt "Forest Dryad Queen boss splash art — elegant tree-spirit queen with bark skin, antler crown wreathed in glowing leaves, vine-and-flower regal dress, holding wooden staff with glowing seed, ancient forest grove backdrop, magazine-quality boss splash, painterly digital art, dark fantasy, NO TEXT" \
  --resolution 1024x1536 \
  --output "$ASSET/bosses/dryad_queen.png"

bash tools/codex-asset.sh single \
  --prompt "Stone Golem Ancient boss splash art — massive humanoid carved from runestone with glowing blue runes pulsing across joints, raised stone fist, ruined temple backdrop with falling debris, magazine-quality boss splash, painterly digital art, dark fantasy, NO TEXT" \
  --resolution 1024x1536 \
  --output "$ASSET/bosses/stone_golem.png"

# === 6. SPELL EFFECT EXPANSION (2 atlases × 6 = 12 frames) ===
echo "▶ Phase 6: Additional spell effects"

bash tools/codex-asset.sh sheet \
  --prompt "6 spell impact effect sprites in 3×2 grid, equal 256×256 cells, transparent background, top-down combat magic effects: 1-poison cloud green vapor, 2-blood splash red spray, 3-shield barrier circle hexagonal blue, 4-buff glow circle yellow upward particles, 5-debuff dark mist purple, 6-heal spiral white-green ascending. Painterly pixel art, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/effects/utility_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/effects/utility_atlas.png" --output "$ASSET/effects/" --cols 3 --rows 2 --naming "utility_{frame}"

bash tools/codex-asset.sh sheet \
  --prompt "6 weapon-impact spark effect sprites in 3×2 grid, equal 256×256 cells, transparent background, dark fantasy combat effects: 1-sword slash X-shaped streak silver, 2-arrow hit red splash with fletching, 3-axe smash impact crater brown-red, 4-mace crush star-burst yellow, 5-spear pierce blue-spark line, 6-claw rake three-line orange. Painterly pixel art, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/effects/melee_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/effects/melee_atlas.png" --output "$ASSET/effects/" --cols 3 --rows 2 --naming "melee_{frame}"

# === 7. ITEM ICON EXPANSION (2 atlases × 16 = 32 icons) ===
echo "▶ Phase 7: Item icon expansion"

bash tools/codex-asset.sh sheet \
  --prompt "16 fantasy potion / consumable icons in 4×4 grid, 128×128 cells, top-down 3/4 view, transparent background, dark fantasy painterly pixel art: 1-small red HP potion, 2-large red HP potion, 3-small blue MP potion, 4-large blue MP potion, 5-yellow stamina potion, 6-green antidote, 7-purple mana surge, 8-rainbow elixir, 9-bread loaf, 10-roast meat skewer, 11-apple, 12-cheese wheel, 13-water flask, 14-ale mug, 15-fish stew bowl, 16-magic cookie. Each centered, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/items/consumables_raw.png"
node tools/slice-spritesheet.js --input "$ASSET/items/consumables_raw.png" --output "$ASSET/items/icons/" --cols 4 --rows 4 --naming "consumable_{frame}"

bash tools/codex-asset.sh sheet \
  --prompt "16 fantasy scroll / accessory icons in 4×4 grid, 128×128 cells, top-down 3/4 view, transparent background, dark fantasy painterly pixel art: 1-fire spell scroll, 2-ice spell scroll, 3-lightning spell scroll, 4-heal scroll, 5-teleport scroll, 6-blessing scroll, 7-rune stone red, 8-rune stone blue, 9-rune stone purple, 10-gold ring, 11-silver amulet with gem, 12-pearl earring, 13-crystal pendant, 14-wooden talisman, 15-iron key, 16-treasure map. Each centered, NO TEXT" \
  --resolution 1024x1024 \
  --output "$ASSET/items/accessories_raw.png"
node tools/slice-spritesheet.js --input "$ASSET/items/accessories_raw.png" --output "$ASSET/items/icons/" --cols 4 --rows 4 --naming "accessory_{frame}"

# === 8. GACHA OPEN BURST EFFECT (1 cut → 4 frames) ===
echo "▶ Phase 8: Gacha box open burst"

bash tools/codex-asset.sh sheet \
  --prompt "4-frame gacha box opening burst animation in horizontal strip, equal 256×256 cells, transparent background, dark fantasy painterly pixel art. Frame 1: golden chest cracked open with thin light leak. Frame 2: chest fully open with rays bursting upward. Frame 3: massive radiant light sphere consuming the box. Frame 4: glowing item silhouette emerging from afterglow. NO TEXT" \
  --resolution 1024x256 \
  --output "$ASSET/effects/gacha_open.png"
node tools/slice-spritesheet.js --input "$ASSET/effects/gacha_open.png" --output "$ASSET/effects/" --cols 4 --rows 1 --naming "gacha_open_{frame}"

echo "═══════════════════════════════════════════════════"
echo "  ✅ Priority-4 generation complete"
echo "═══════════════════════════════════════════════════"
