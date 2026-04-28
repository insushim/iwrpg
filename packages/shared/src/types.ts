// Shared type definitions for Runeword Chronicle
// Used by both client and server

export type ClassId = 'aether-lord' | 'iron-sentinel' | 'sylvan-ranger' | 'rune-weaver';
export type GradeLevel = 'g3' | 'g4' | 'g5' | 'g6' | 'm1' | 'm2';

export interface ClassDef {
  id: ClassId;
  name_ko: string;
  name_en: string;
  description_ko: string;
  base_stats: { str: number; con: number; dex: number; int: number; wis: number };
  base_hp: number;
  base_mp: number;
  hp_per_level: number;
  mp_per_level: number;
  start_weapon_id: string;
  start_armor_id: string;
  special_ability_ko: string;
}

export type EquipmentSlot =
  | 'weapon' | 'shield' | 'armor' | 'helm' | 'cloak' | 'boots'
  | 'ring1' | 'ring2' | 'amulet';

export interface InventoryEntry {
  id: string;                    // unique inventory entry id
  item_id: string;               // refs ItemDef.id
  quantity: number;
  enchant_level: number;         // 0..9
  is_equipped: boolean;
  equipped_slot?: EquipmentSlot;
  slot_position: number;
}

export interface CharacterPublic {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  currentMap: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  alignment: number;             // -100..+100
  transformId?: string;
  isInQuiz: boolean;
}

export interface QuizPrompt {
  quizId: string;
  word_id: string;
  display: string;               // shown to player (the prompt side)
  mode: 'en2ko' | 'ko2en';       // 50/50
  choices: string[];             // 4 options
  deadlineMs: number;            // server timestamp
  monsterId: string;             // who triggered it
  graded_seconds: number;        // timer length 5/7/10
}

export interface QuizResult {
  quizId: string;
  correct: boolean;
  correctChoice: number;
  rewards?: {
    exp: number;
    gold: number;
    drops: { item_id: string; quantity: number; enchant: number }[];
  };
  damageDealt: number;
}

export interface ChatMessage {
  channel: 'world' | 'guild' | 'whisper' | 'system';
  from: string;
  fromCharId?: string;
  to?: string;
  text: string;
  ts: number;
}

export interface InterpretationChallengeRuntime {
  id: string;
  sentence_en: string;
  choices: string[];   // 4 — one is the correct meaning_ko
  difficulty: 'C1' | 'C2';
  reward_tokens: 1 | 2 | 3;
}

export interface GachaResult {
  boxId: string;
  itemsAwarded: { item_id: string; qty: number }[];
}

export interface ServerHealthInfo {
  timestamp: number;
  players_online: number;
  rooms_active: number;
  uptime_sec: number;
}

export type AlignmentTier = 'pure' | 'neutral' | 'tainted' | 'chaotic';

export function getAlignmentTier(alignment: number): AlignmentTier {
  if (alignment >= 50) return 'pure';
  if (alignment >= -10) return 'neutral';
  if (alignment >= -50) return 'tainted';
  return 'chaotic';
}
