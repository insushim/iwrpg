// Auto-generated crafting recipes for Runeword Chronicle
// 12 recipes: 6 legendary items × 2 alternative paths each

export interface CraftingRecipe {
  id: string;
  output_item_id: string;
  inputs: { item_id: string; qty: number }[];
  gold_cost: number;
  level_req: number;
  npc_id: string;
  description: string;
}

export const ALL_RECIPES: CraftingRecipe[] = [
  // ===== leg_aether_codex (path A: Nova) =====
  {
    id: 'rec_aether_codex_a',
    output_item_id: 'leg_aether_codex',
    inputs: [
      { item_id: 'unq_nova_tome', qty: 1 },
      { item_id: 'mat_aether_crystal', qty: 12 },
      { item_id: 'mat_light_shard', qty: 8 },
      { item_id: 'boss_mutos_stone', qty: 1 },
    ],
    gold_cost: 250000,
    level_req: 55,
    npc_id: 'verity_archmage',
    description: '천공 감시자 노바의 마도서에 침묵신의 의지를 새겨 천공의 마도서를 완성한다.',
  },
  // ===== leg_aether_codex (path B: Lich) =====
  {
    id: 'rec_aether_codex_b',
    output_item_id: 'leg_aether_codex',
    inputs: [
      { item_id: 'unq_sela_grimoire_minor', qty: 1 },
      { item_id: 'mat_aether_crystal', qty: 15 },
      { item_id: 'mat_soul_shard', qty: 10 },
      { item_id: 'boss_sela_grimoire', qty: 2 },
    ],
    gold_cost: 280000,
    level_req: 55,
    npc_id: 'verity_archmage',
    description: '리치의 소품 마도서를 셀라스의 진본 페이지로 보강해 천공의 마도서를 완성한다.',
  },

  // ===== leg_dragonbane_blade (path A: Ixion) =====
  {
    id: 'rec_dragonbane_a',
    output_item_id: 'leg_dragonbane_blade',
    inputs: [
      { item_id: 'unq_ixion_blade', qty: 1 },
      { item_id: 'mat_drake_scale', qty: 14 },
      { item_id: 'mat_pyre_scale', qty: 10 },
      { item_id: 'boss_vyranthos_heart', qty: 1 },
    ],
    gold_cost: 280000,
    level_req: 55,
    npc_id: 'crimson_blacksmith',
    description: '익시온의 화염검에 폐룡의 심장을 박아 용살자의 검을 단조한다.',
  },
  // ===== leg_dragonbane_blade (path B: Vyranthos) =====
  {
    id: 'rec_dragonbane_b',
    output_item_id: 'leg_dragonbane_blade',
    inputs: [
      { item_id: 'unq_vyranthos_blade', qty: 1 },
      { item_id: 'mat_drake_scale', qty: 18 },
      { item_id: 'mat_imp_horn', qty: 8 },
      { item_id: 'trib_ixion_core', qty: 1 },
    ],
    gold_cost: 320000,
    level_req: 55,
    npc_id: 'crimson_blacksmith',
    description: '폐룡의 검에 화염 군주의 코어를 녹여 넣어 용살자의 검으로 다시 태어나게 한다.',
  },

  // ===== leg_eternal_aegis (path A: Perros) =====
  {
    id: 'rec_eternal_aegis_a',
    output_item_id: 'leg_eternal_aegis',
    inputs: [
      { item_id: 'unq_perros_helm', qty: 1 },
      { item_id: 'mat_drake_scale', qty: 16 },
      { item_id: 'mat_dwarf_ore', qty: 30 },
      { item_id: 'boss_perros_core', qty: 1 },
    ],
    gold_cost: 260000,
    level_req: 55,
    npc_id: 'crimson_blacksmith',
    description: '강철용 페로스의 투구와 코어를 녹여 영원히 식지 않는 갑옷을 만든다.',
  },
  // ===== leg_eternal_aegis (path B: Bersta) =====
  {
    id: 'rec_eternal_aegis_b',
    output_item_id: 'leg_eternal_aegis',
    inputs: [
      { item_id: 'unq_bersta_helm', qty: 1 },
      { item_id: 'mat_drake_scale', qty: 20 },
      { item_id: 'mat_pyre_scale', qty: 8 },
      { item_id: 'trib_bersta_scale', qty: 1 },
    ],
    gold_cost: 300000,
    level_req: 55,
    npc_id: 'crimson_blacksmith',
    description: '용족장의 거대 비늘과 투구를 함께 단조해 영원의 방어구를 완성한다.',
  },

  // ===== leg_starfire_bow (path A: Nova) =====
  {
    id: 'rec_starfire_a',
    output_item_id: 'leg_starfire_bow',
    inputs: [
      { item_id: 'unq_eternal_compass', qty: 1 },
      { item_id: 'mat_aether_crystal', qty: 14 },
      { item_id: 'mat_harpy_feather', qty: 12 },
      { item_id: 'trib_nova_crystal', qty: 1 },
    ],
    gold_cost: 230000,
    level_req: 55,
    npc_id: 'starhaven_fletcher',
    description: '영원의 나침반과 천공 결정으로 별의 화염궁을 짠다.',
  },
  // ===== leg_starfire_bow (path B: Ixion) =====
  {
    id: 'rec_starfire_b',
    output_item_id: 'leg_starfire_bow',
    inputs: [
      { item_id: 'unq_ixion_blade', qty: 1 },
      { item_id: 'mat_wyvern_scale', qty: 14 },
      { item_id: 'mat_harpy_feather', qty: 18 },
      { item_id: 'mat_aether_crystal', qty: 8 },
    ],
    gold_cost: 250000,
    level_req: 55,
    npc_id: 'starhaven_fletcher',
    description: '익시온의 화염검을 녹여 시위로 만들고 천공 결정으로 화살을 박는다.',
  },

  // ===== leg_void_robe (path A: Sebella) =====
  {
    id: 'rec_void_robe_a',
    output_item_id: 'leg_void_robe',
    inputs: [
      { item_id: 'unq_sebella_robe', qty: 1 },
      { item_id: 'mat_soul_shard', qty: 14 },
      { item_id: 'mat_curse_rune', qty: 18 },
      { item_id: 'boss_mutos_stone', qty: 1 },
    ],
    gold_cost: 240000,
    level_req: 55,
    npc_id: 'verity_archmage',
    description: '망령왕의 로브에 침묵신의 의지를 새겨 공허의 로브를 짠다.',
  },
  // ===== leg_void_robe (path B: Mutos amulet) =====
  {
    id: 'rec_void_robe_b',
    output_item_id: 'leg_void_robe',
    inputs: [
      { item_id: 'unq_mutos_amulet', qty: 1 },
      { item_id: 'mat_soul_shard', qty: 18 },
      { item_id: 'mat_aether_crystal', qty: 12 },
      { item_id: 'trib_sebella_orb', qty: 1 },
    ],
    gold_cost: 270000,
    level_req: 55,
    npc_id: 'verity_archmage',
    description: '침묵신의 호부를 녹여 시벨라의 영혼구 안에 가두고, 그것으로 로브를 짠다.',
  },

  // ===== leg_kingsmaker_crown (path A: Crystal Crown) =====
  {
    id: 'rec_kingsmaker_a',
    output_item_id: 'leg_kingsmaker_crown',
    inputs: [
      { item_id: 'unq_crystal_crown', qty: 1 },
      { item_id: 'mat_drake_scale', qty: 12 },
      { item_id: 'mat_light_shard', qty: 10 },
      { item_id: 'boss_vyranthos_heart', qty: 1 },
    ],
    gold_cost: 290000,
    level_req: 55,
    npc_id: 'verity_archmage',
    description: '잊혀진 왕국의 수정 왕관에 폐룡의 심장을 박아 왕좌를 만들 자의 왕관을 완성한다.',
  },
  // ===== leg_kingsmaker_crown (path B: Aldar) =====
  {
    id: 'rec_kingsmaker_b',
    output_item_id: 'leg_kingsmaker_crown',
    inputs: [
      { item_id: 'unq_aldar_axe', qty: 1 },
      { item_id: 'mat_minotaur_horn', qty: 8 },
      { item_id: 'mat_light_shard', qty: 14 },
      { item_id: 'trib_karnak_heart', qty: 1 },
    ],
    gold_cost: 310000,
    level_req: 55,
    npc_id: 'verity_archmage',
    description: '오크 족장의 도끼와 트렌트 군주의 심장을 융합해 왕관을 단조한다.',
  },
];

export default ALL_RECIPES;
