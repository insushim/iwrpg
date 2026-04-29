#!/bin/bash
# Priority-9: NPC atlas v3 (no cropping) + Character 32-frame walk (8 dir × 4 frames)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSET="$ROOT/apps/client/public/assets/img"
cd "$ROOT"

echo "═══ P9: NPC v3 + Character 32-frame walk ═══"

# === 1. AURORA NPC v3 — 1024×1536 (4×3 cells 256×512 vertical, full-body fits) ===
bash tools/codex-asset.sh sheet \
  --prompt "12 fantasy MMORPG NPC chibi sprites in 4×3 grid, equal cells with 16px gutter (cell 256×512 vertical orientation), top-down 3/4 view, transparent background, dark fantasy painterly pixel art. CRITICAL: each character fills only 70% of cell height (15% top margin above head, 15% bottom margin below feet) — full body visible head-to-toe with NO clipping. Row 1: 1-merchant Lina green dress with goods tray, 2-blacksmith Dorgan red leather apron holding hammer, 3-priest Mirelle white-gold robes with glowing orb. Row 2: 4-village chief Baren brown cloak with cane, 5-guard captain Kael steel armor spear shield (full armor visible), 6-innkeeper Haru apron with wooden mug. Row 3: 7-bard Seon red-blue jester outfit playing lute (whole body visible), 8-banker Milos black formal robes with scroll, 9-scholar Aleth gray robes with floating tome, 10-mysterious transformer Vael purple robes glowing eyes, 11-gacha priestess Selevis violet robes crystal rune, 12-blank gray cell. NO TEXT" \
  --resolution 1024x1536 \
  --output "$ASSET/npcs/aurora_town_atlas_v3.png"
node tools/slice-spritesheet.js --input "$ASSET/npcs/aurora_town_atlas_v3.png" --output "$ASSET/npcs/" --cols 4 --rows 3 --naming "aurora_npc_v3_{frame}"

# === 2. Other towns NPC v2 — 1024×1536 (4×2 cells 256×768 vertical) for 8 NPCs ===
for TOWN in treeshade crimson verity starhaven; do
  case $TOWN in
    treeshade) ROLES="elven elder white robes wood staff,female druid green robes flower wreath,merchant elf gold tunic gem case,fletcher bow craftsman with longbow,priest forest moss cloak holy book,beast tamer with hawk on arm,potion brewer cauldron,herbalist with bundle of herbs";;
    crimson) ROLES="fortress guard captain red armor halberd,armorer in leather apron with shield,quartermaster with crate of supplies,mage knight in red mantle with sword,blacksmith hammering anvil,strategist scholar with map,recruit officer with parchment,scout in light leather with bow";;
    verity) ROLES="high priestess in white-blue robes,paladin in silver armor and tabard,judge in dark robes with gavel,scribe with multiple quills,arcane scholar in cosmic robes,librarian with stack of books,bell ringer in modest tunic,acolyte with candle";;
    starhaven) ROLES="captain in royal blue uniform,navigator with sextant,merchant prince in fine silk,exotic trader in turban with chest,mage in star-pattern robes,sailor with rope and anchor,inn matron with serving tray,dock worker in rough clothes";;
  esac
  bash tools/codex-asset.sh sheet \
    --prompt "8 fantasy MMORPG NPC sprites in 4×2 grid, equal cells with 16px gutter (cell 256×768 vertical orientation), top-down 3/4 view, transparent background, dark fantasy painterly pixel art. CRITICAL: each character fills only 70% of cell height with 15% margin top and bottom — full body visible head-to-toe with NO clipping. Row by row across cells: ${ROLES}. Each character distinct. NO TEXT" \
    --resolution 1024x1536 \
    --output "$ASSET/npcs/${TOWN}_atlas_v2.png"
  node tools/slice-spritesheet.js --input "$ASSET/npcs/${TOWN}_atlas_v2.png" --output "$ASSET/npcs/" --cols 4 --rows 2 --naming "${TOWN}_npc_v2_{frame}"
done

# === 3. CHARACTER 32-FRAME WALK CYCLES (8 directions × 4 frames each) ===
# Each class gets 2 atlases of 1024×1024 (4×4 = 16 cells = 4 directions × 4 frames)
# Atlas A: directions S, SE, E, NE
# Atlas B: directions N, NW, W, SW

generate_walk_class() {
  local CLS_KEY="$1"      # aether_lord
  local CLS_DESC="$2"     # description
  local CLS_DIR="$ASSET/characters/$CLS_KEY"
  mkdir -p "$CLS_DIR"

  echo "▶ $CLS_KEY: walk32 atlas A (S/SE/E/NE)"
  bash tools/codex-asset.sh sheet \
    --prompt "Walk-cycle sprite sheet for SAME character in 4 columns × 4 rows grid (cell 256×256 each, 4px gutter, total 1024×1024), top-down 3/4 view chibi RPG style, transparent background, dark fantasy painterly pixel art. Character: ${CLS_DESC}. Each ROW is ONE direction with 4 sequential walk-cycle frames showing leg motion (frame 1: stride left foot forward, frame 2: feet together passing, frame 3: stride right foot forward, frame 4: feet together returning). Row 1 (top) = character facing SOUTH (towards viewer, front view). Row 2 = SOUTHEAST diagonal (front-right). Row 3 = EAST (right side view, profile). Row 4 (bottom) = NORTHEAST diagonal (back-right). Same character identity across all 16 cells. CRITICAL: character body fits 70% of cell, 15% margin top and bottom. NO TEXT" \
    --resolution 1024x1024 \
    --output "$CLS_DIR/walk32_a.png"
  node tools/slice-spritesheet.js --input "$CLS_DIR/walk32_a.png" --output "$CLS_DIR/" --cols 4 --rows 4 --naming "walk32_{frame}"

  echo "▶ $CLS_KEY: walk32 atlas B (N/NW/W/SW)"
  bash tools/codex-asset.sh sheet \
    --prompt "Walk-cycle sprite sheet for SAME character in 4 columns × 4 rows grid (cell 256×256 each, 4px gutter, total 1024×1024), top-down 3/4 view chibi RPG style, transparent background, dark fantasy painterly pixel art. Character: ${CLS_DESC}. Each ROW is ONE direction with 4 sequential walk-cycle frames. Row 1 (top) = facing NORTH (back view, away from viewer). Row 2 = NORTHWEST diagonal (back-left). Row 3 = WEST (left side view, profile facing left). Row 4 (bottom) = SOUTHWEST diagonal (front-left). Same character identity across all 16 cells. CRITICAL: character body fits 70% of cell, 15% margin top and bottom. NO TEXT" \
    --resolution 1024x1024 \
    --output "$CLS_DIR/walk32_b.png"
  node tools/slice-spritesheet.js --input "$CLS_DIR/walk32_b.png" --output "$CLS_DIR/" --cols 4 --rows 4 --naming "walk32_b_{frame}"
  # Rename walk32_b_0..15 → walk32_16..31
  for i in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    SRC="$CLS_DIR/walk32_b_${i}.png"
    DST="$CLS_DIR/walk32_$((i+16)).png"
    [ -s "$SRC" ] && mv -f "$SRC" "$DST" || true
  done
}

generate_walk_class "aether_lord"   "young blue-armored sky lord with rune-edged cape and silver halberd, hooded helm, glowing aether trim"
generate_walk_class "iron_sentinel" "stout heavy-armored knight in dark iron plate with great warhammer and iron tower shield, full helm"
generate_walk_class "sylvan_ranger" "lithe elven ranger in green leather armor and hooded forest cloak with curved longbow on back, agile pose"
generate_walk_class "rune_weaver"   "tall purple-robed rune mage with hooded cowl and tall runic staff with crystal top, floating glyphs around"

echo "═══ ✅ P9 complete ═══"
