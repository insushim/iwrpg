// Game balance constants — single source of truth for client AND server.

import type { ClassDef, ClassId, GradeLevel } from './types.js';

// === Leveling ===
export const MAX_LEVEL = 75;
/** Cumulative EXP required to reach `level` from level 1. */
export function expToReachLevel(level: number): number {
  if (level <= 1) return 0;
  // Geometric: 1000 * 1.4^(n-1). Cumulative.
  let total = 0;
  for (let i = 1; i < level; i++) total += Math.floor(1000 * Math.pow(1.4, i - 1));
  return total;
}
export function expForNextLevel(level: number): number {
  return Math.floor(1000 * Math.pow(1.4, Math.max(0, level - 1)));
}

// === Class definitions ===
export const CLASSES: Record<ClassId, ClassDef> = {
  'aether-lord': {
    id: 'aether-lord',
    name_ko: '천공왕',
    name_en: 'Aether-Lord',
    description_ko: '백성을 이끄는 군주. 충성스러운 가드 한 명을 영구히 거느린다. 검과 방패의 균형형 전사.',
    base_stats: { str: 13, con: 14, dex: 10, int: 10, wis: 12 },
    base_hp: 50,
    base_mp: 24,
    hp_per_level: 7,
    mp_per_level: 3,
    start_weapon_id: 'wpn_iron_sword',
    start_armor_id: 'arm_leather_chest',
    special_ability_ko: '왕가의 가드 (영구 소환수) + 길드 결성',
  },
  'iron-sentinel': {
    id: 'iron-sentinel',
    name_ko: '강철의 파수꾼',
    name_en: 'Iron-Sentinel',
    description_ko: '중장갑 탱커. 도발과 방어 자세로 동료를 보호한다.',
    base_stats: { str: 14, con: 14, dex: 12, int: 9, wis: 10 },
    base_hp: 60,
    base_mp: 16,
    hp_per_level: 9,
    mp_per_level: 2,
    start_weapon_id: 'wpn_iron_greatsword',
    start_armor_id: 'arm_chain_chest',
    special_ability_ko: '방어 자세 (피해 -50%) + 도발 (어그로 강제)',
  },
  'sylvan-ranger': {
    id: 'sylvan-ranger',
    name_ko: '숲의 투사',
    name_en: 'Sylvan Ranger',
    description_ko: '활과 단검을 다루는 민첩한 사냥꾼. 회피와 은신 보유.',
    base_stats: { str: 11, con: 12, dex: 15, int: 10, wis: 12 },
    base_hp: 40,
    base_mp: 20,
    hp_per_level: 6,
    mp_per_level: 3,
    start_weapon_id: 'wpn_short_bow',
    start_armor_id: 'arm_leather_chest',
    special_ability_ko: '회피 (15%) + 은신 5초',
  },
  'rune-weaver': {
    id: 'rune-weaver',
    name_ko: '룬 직조사',
    name_en: 'Rune-Weaver',
    description_ko: '잊혀진 룬을 엮는 마법사. 강력한 원거리 마법과 정령 소환.',
    base_stats: { str: 9, con: 10, dex: 10, int: 16, wis: 15 },
    base_hp: 30,
    base_mp: 50,
    hp_per_level: 4,
    mp_per_level: 6,
    start_weapon_id: 'wpn_apprentice_staff',
    start_armor_id: 'arm_cloth_robe',
    special_ability_ko: '원소 마법 + 정령 소환',
  },
};

// === Combat formulas ===
/** Damage dealt by attacker on correct quiz answer. */
export function calcDamage(opts: {
  baseDamage: number;
  str: number;
  weaponBonus: number;
  enchantBonus: number;
  targetDef: number;
  isCrit: boolean;
}): number {
  const raw = opts.baseDamage + opts.str + opts.weaponBonus + opts.enchantBonus;
  const reduction = Math.max(0, 1 - opts.targetDef * 0.018);
  let dmg = Math.max(1, Math.floor(raw * reduction));
  if (opts.isCrit) dmg = Math.floor(dmg * 1.6);
  return dmg;
}
export function critChance(dex: number): number {
  return Math.min(0.25, 0.05 + dex * 0.005);
}

// === Enchant table (RuneForge) ===
/** [success, fail_demote, destroy] probabilities for each TARGET level (+1 means going from +0→+1) */
export const ENCHANT_TABLE: Record<number, { success: number; fail_demote: number; destroy: number }> = {
  1: { success: 1.00, fail_demote: 0.00, destroy: 0.00 },
  2: { success: 1.00, fail_demote: 0.00, destroy: 0.00 },
  3: { success: 1.00, fail_demote: 0.00, destroy: 0.00 },
  4: { success: 1.00, fail_demote: 0.00, destroy: 0.00 },
  5: { success: 0.90, fail_demote: 0.10, destroy: 0.00 },
  6: { success: 0.80, fail_demote: 0.20, destroy: 0.00 },
  7: { success: 0.60, fail_demote: 0.00, destroy: 0.40 },
  8: { success: 0.40, fail_demote: 0.00, destroy: 0.60 },
  9: { success: 0.25, fail_demote: 0.00, destroy: 0.75 },
};
/** Blessed scroll: never destroy, but failure stays at current level. */
export function applyBlessedEnchant(p: { success: number; fail_demote: number; destroy: number }) {
  return { success: p.success, fail_demote: 0, destroy: 0 };
}

// === Quiz timer (grade-adaptive) — user-spec ===
export const QUIZ_TIMER_BY_GRADE: Record<GradeLevel, number> = {
  g3: 10,    // 10 sec — youngest
  g4: 9,
  g5: 8,
  g6: 7,
  m1: 6,
  m2: 5,
};
/** Add +2 sec for words still in the wrong-pool (higher review weight). */
export const QUIZ_TIMER_WRONG_POOL_BONUS = 2;
export const QUIZ_TIMER_MIN = 3;
export const QUIZ_TIMER_MAX = 12;

// === Quiz reward multipliers ===
export const QUIZ_REWARD_BASE_EXP_MULT = 1.0;
export const QUIZ_REWARD_BASE_GOLD_MULT = 1.0;
/** Streak bonus: each consecutive correct adds +5% up to +50% */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(0.5, streak * 0.05);
}

// === Drop rates ===
/** Floor drop chances are applied AFTER quiz correct. */
export const BASE_ITEM_DROP_CHANCE = 0.15;       // 15% any item drop
export const RARE_DROP_BONUS_PER_LEVEL_DIFF = 0.005;
export const NAMED_GUARANTEED_DROPS = 1;          // 100% named tribute material
export const BOSS_GUARANTEED_DROPS = 1;           // 100% boss main material

// === Movement ===
export const TILE_SIZE = 32;
export const PLAYER_BASE_SPEED = 4.5;             // tiles/sec
export const SERVER_TICK_HZ = 30;
export const SERVER_TICK_MS = 1000 / 30;
export const NETWORK_PATCH_HZ = 20;

// === Gacha system (NEW user-spec) ===
export const GACHA_MAX_TOKENS_PER_DAY = 3;        // hard cap
export const GACHA_TOKEN_RESET_HOUR = 0;          // local midnight
export const GACHA_CHALLENGE_TIMER_SEC = 30;
export const GACHA_BOX_TIER_TOKEN_COST = {
  normal: 1,
  rare: 1,
  epic: 2,
  legendary: 3,
  rune: 5,
};

// === Economy taxes ===
export const AUCTION_LISTING_FEE = 0.05;
export const AUCTION_SALE_FEE = 0.05;
export const TELEPORT_BASE_COST = 100;
export const REPAIR_COST_PER_LEVEL = 50;

// === Death penalty ===
export const DEATH_EXP_LOSS_PCT = 0.05;
export const CHAOTIC_DEATH_DROP_CHANCE = 0.20;   // chance per inventory item to drop on chaotic-state death
export const ALIGNMENT_RESTORATION_PER_QUIZ = 1; // each correct quiz restores +1 alignment if tainted/chaotic

// === Classroom mode ===
export const CLASSROOM_MODE_DEFAULTS = {
  pvp_enabled: false,
  chaotic_system_enabled: false,
  profanity_filter_strict: true,
  daily_play_minutes_default: 60,
};
