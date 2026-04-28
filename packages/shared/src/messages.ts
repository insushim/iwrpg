// Network protocol — Colyseus messages between client and server.

import type { QuizPrompt, QuizResult, ChatMessage, GachaResult, InterpretationChallengeRuntime } from './types.js';

// ===== Client → Server =====

export type ClientMessage =
  | { type: 'move'; tx: number; ty: number }
  | { type: 'attack'; targetId: string }
  | { type: 'quiz_answer'; quizId: string; choice: number }
  | { type: 'use_item'; inventoryEntryId: string }
  | { type: 'equip_item'; inventoryEntryId: string }
  | { type: 'unequip_item'; slot: string }
  | { type: 'drop_item'; inventoryEntryId: string; quantity: number }
  | { type: 'pickup_drop'; dropId: string }
  | { type: 'chat'; channel: 'world' | 'guild' | 'whisper'; text: string; to?: string }
  | { type: 'enchant_item'; inventoryEntryId: string; useBlessed: boolean }
  | { type: 'craft'; recipeId: string }
  | { type: 'shop_buy'; npcId: string; itemId: string; quantity: number }
  | { type: 'shop_sell'; inventoryEntryId: string; quantity: number }
  | { type: 'change_map'; portalId: string }
  | { type: 'transform'; stoneInventoryEntryId: string }
  | { type: 'interact_npc'; npcId: string }
  | { type: 'gacha_request_challenge'; difficulty: 'C1' | 'C2' }
  | { type: 'gacha_answer_challenge'; challengeId: string; choice: number }
  | { type: 'gacha_open_box'; boxId: string }
  | { type: 'guild_warehouse_deposit'; inventoryEntryId: string; quantity: number }
  | { type: 'guild_warehouse_withdraw'; warehouseEntryId: string }
  | { type: 'set_grade_level'; grade: 'g3' | 'g4' | 'g5' | 'g6' | 'm1' | 'm2' }
  | { type: 'ping' };

// ===== Server → Client =====

export type ServerMessage =
  | { type: 'quiz_prompt'; prompt: QuizPrompt }
  | { type: 'quiz_result'; result: QuizResult }
  | { type: 'damage_dealt'; attackerId: string; targetId: string; damage: number; isCrit: boolean }
  | { type: 'monster_killed'; monsterId: string; killerId: string; pos: { x: number; y: number } }
  | { type: 'level_up'; characterId: string; newLevel: number; statPoints: number }
  | { type: 'item_drop_appeared'; dropId: string; itemId: string; pos: { x: number; y: number }; tier: number; enchant: number }
  | { type: 'item_drop_picked'; dropId: string; pickerId: string }
  | { type: 'inventory_update'; entries: any[] }
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'system_msg'; severity: 'info' | 'warn' | 'error'; text_ko: string }
  | { type: 'enchant_result'; outcome: 'success' | 'fail_demote' | 'destroyed'; newLevel?: number }
  | { type: 'craft_result'; success: boolean; outputItemId?: string; reason?: string }
  | { type: 'transform_started'; characterId: string; transformId: string; durationSec: number }
  | { type: 'transform_ended'; characterId: string }
  | { type: 'gacha_challenge_prompt'; challenge: InterpretationChallengeRuntime; deadlineMs: number }
  | { type: 'gacha_challenge_result'; correct: boolean; tokensAwarded: number; totalTokensToday: number }
  | { type: 'gacha_box_result'; result: GachaResult }
  | { type: 'pong'; serverTime: number };
