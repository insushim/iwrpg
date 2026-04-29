#!/bin/bash
# Priority-8: Full item icons + UI elements + extra effects
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET="$ROOT/apps/client/public/assets/img"
cd "$ROOT"

echo "═══ P8: Items + UI + Effects ═══"
mkdir -p "$ASSET/items" "$ASSET/ui" "$ASSET/effects"

# === 1. Potion atlas (8 potions: HP/MP/STA × 3 tiers + revive + antidote) ===
bash tools/codex-asset.sh sheet \
  --prompt "8 RPG potion icons in 4×2 grid (cell 256×256, 12px gutter), top-down 3/4 view, transparent background, dark fantasy painterly pixel art, glossy glass bottles. Cells: 1-small red HP potion, 2-large red HP elixir, 3-small blue MP potion, 4-large blue MP elixir, 5-small green stamina vial, 6-large green stamina elixir, 7-golden revive potion glowing, 8-purple antidote with smoke. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/items/potion_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/items/potion_atlas.png" --output "$ASSET/items/" --cols 4 --rows 2 --naming "potion_{frame}"

# === 2. Scroll/rune atlas (8 magic items) ===
bash tools/codex-asset.sh sheet \
  --prompt "8 magical scroll and rune-stone icons in 4×2 grid (cell 256×256), transparent background, dark fantasy painterly pixel art. Cells: 1-fireball scroll red rolled parchment with flame seal, 2-lightning scroll yellow with bolt seal, 3-ice scroll blue with frost seal, 4-teleport scroll purple swirl, 5-rune stone Ral red glowing, 6-rune stone Tir yellow glowing, 7-rune stone Eth blue glowing, 8-rune stone Hel purple glowing. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/items/scroll_rune_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/items/scroll_rune_atlas.png" --output "$ASSET/items/" --cols 4 --rows 2 --naming "scroll_rune_{frame}"

# === 3. Equipment atlas (8 weapons/armor) ===
bash tools/codex-asset.sh sheet \
  --prompt "8 RPG equipment icons in 4×2 grid (cell 256×256), top-down 3/4 view, transparent background, dark fantasy painterly pixel art. Cells: 1-iron sword silver blade, 2-flaming greatsword glowing red, 3-elven longbow wood-and-gold, 4-runic staff with crystal, 5-iron chestplate, 6-leather hood green, 7-mage robe purple with gold trim, 8-iron tower shield with crest. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/items/equip_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/items/equip_atlas.png" --output "$ASSET/items/" --cols 4 --rows 2 --naming "equip_{frame}"

# === 4. Accessory atlas (8 rings/amulets/gems) ===
bash tools/codex-asset.sh sheet \
  --prompt "8 RPG accessory icons in 4×2 grid (cell 256×256), transparent background, dark fantasy painterly pixel art, gleaming metallic finish. Cells: 1-gold ring with red ruby, 2-silver ring with sapphire, 3-amulet with green emerald pendant, 4-amulet with purple amethyst, 5-bronze bracelet etched runes, 6-jeweled crown small, 7-fairy charm gold wings, 8-skull pendant onyx. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/items/accessory_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/items/accessory_atlas.png" --output "$ASSET/items/" --cols 4 --rows 2 --naming "accessory_{frame}"

# === 5. UI button/panel frame atlas ===
bash tools/codex-asset.sh sheet \
  --prompt "6 fantasy MMORPG UI elements in 3×2 grid (cell 256×256), transparent background, dark fantasy painterly pixel art with gold-trim borders and dark wood texture. Cells: 1-rectangular wooden button frame with gold border, 2-rectangular pressed-state button frame darker, 3-square inventory slot frame with dark center, 4-square highlighted inventory slot gold glow, 5-large window panel frame with parchment center and gold corners, 6-small tooltip frame parchment scroll style. NO TEXT" \
  --resolution 768x512 \
  --output "$ASSET/ui/button_frame_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/ui/button_frame_atlas.png" --output "$ASSET/ui/" --cols 3 --rows 2 --naming "ui_{frame}"

# === 6. HUD bar atlas (HP/MP/XP) ===
bash tools/codex-asset.sh sheet \
  --prompt "6 game HUD bar sprites in 3×2 grid (cell 256×128, 12px gutter), transparent background, dark fantasy painterly. Cells: 1-empty HP bar dark frame ornate, 2-full red HP bar fill, 3-empty MP bar dark frame, 4-full blue MP bar fill glowing, 5-empty XP bar narrow, 6-full gold XP bar fill. NO TEXT" \
  --resolution 768x256 \
  --output "$ASSET/ui/hud_bar_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/ui/hud_bar_atlas.png" --output "$ASSET/ui/" --cols 3 --rows 2 --naming "hud_{frame}"

# === 7. Spell/skill effect atlas (8 effects) ===
bash tools/codex-asset.sh sheet \
  --prompt "8 spell effect sprites in 4×2 grid (cell 256×256), transparent background, dark fantasy painterly pixel art, glowing magical effects. Cells: 1-red fireball burst with sparks, 2-yellow lightning bolt zigzag, 3-blue ice shard cluster, 4-purple shadow vortex, 5-green poison cloud, 6-white holy light beam, 7-orange explosion ring, 8-cyan healing aura circle. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/effects/spell_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/effects/spell_atlas.png" --output "$ASSET/effects/" --cols 4 --rows 2 --naming "spell_{frame}"

# === 8. Material/quest item atlas (gold/gem/key/etc.) ===
bash tools/codex-asset.sh sheet \
  --prompt "8 RPG material item icons in 4×2 grid (cell 256×256), transparent background, dark fantasy painterly pixel art. Cells: 1-pile of gold coins with sparkle, 2-red ruby gem cut, 3-blue sapphire gem cut, 4-green emerald gem cut, 5-iron ingot dark gray, 6-old brass key, 7-treasure chest closed wood-iron, 8-treasure chest open with gold inside. NO TEXT" \
  --resolution 1024x512 \
  --output "$ASSET/items/material_atlas.png"
node tools/slice-spritesheet.js --input "$ASSET/items/material_atlas.png" --output "$ASSET/items/" --cols 4 --rows 2 --naming "material_{frame}"

echo "═══ ✅ P8 complete ═══"
