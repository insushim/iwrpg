// Gacha system: high-level English interpretation challenges award daily tokens.
// Tokens spent on randomized loot boxes.

import { ALL_CHALLENGES, ALL_GACHA_BOXES, type InterpretationChallenge, type GachaBoxDef } from '../data/gacha-data.js';
import { GACHA_MAX_TOKENS_PER_DAY, GACHA_CHALLENGE_TIMER_SEC } from 'shared';

interface PendingChallenge {
  id: string;
  challenge: InterpretationChallenge;
  choices: string[];
  correctIndex: number;
  deadlineMs: number;
}

export class GachaManager {
  private playerTokens = new Map<string, { count: number; resetAt: number }>();
  private playerLastDailyReset = new Map<string, number>();
  private pendingChallenges = new Map<string, PendingChallenge>(); // by playerId
  private playerHistory = new Map<string, Set<string>>(); // recent challenge IDs to avoid repeat
  private challengeCounter = 1;

  /** Roll over daily token cap if midnight passed. */
  resetDailyIfNeeded(playerId: string): void {
    const now = Date.now();
    const today = midnight(now);
    const last = this.playerLastDailyReset.get(playerId) ?? 0;
    if (last < today) {
      this.playerTokens.set(playerId, { count: 0, resetAt: today + 24 * 3600_000 });
      this.playerLastDailyReset.set(playerId, today);
      this.playerHistory.set(playerId, new Set());
    }
  }

  getTokens(playerId: string): number {
    this.resetDailyIfNeeded(playerId);
    return this.playerTokens.get(playerId)?.count ?? 0;
  }

  /** Issue a new C1/C2 challenge. */
  issueChallenge(playerId: string, difficulty: 'C1' | 'C2'): {
    quizId: string;
    challenge: InterpretationChallenge;
    choices: string[];
    deadlineMs: number;
  } | null {
    this.resetDailyIfNeeded(playerId);
    const tokens = this.getTokens(playerId);
    if (tokens >= GACHA_MAX_TOKENS_PER_DAY) {
      return null; // already maxed out today
    }
    if (this.pendingChallenges.has(playerId)) {
      return null; // already a pending one
    }

    const seen = this.playerHistory.get(playerId) ?? new Set();
    const pool = ALL_CHALLENGES.filter(c => c.difficulty === difficulty && !seen.has(c.id));
    const candidates = pool.length > 0 ? pool : ALL_CHALLENGES.filter(c => c.difficulty === difficulty);
    if (candidates.length === 0) return null;

    const challenge = candidates[Math.floor(Math.random() * candidates.length)];
    const choices = [challenge.correct_meaning_ko, ...challenge.decoy_meanings_ko];
    // Shuffle
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    const correctIndex = choices.indexOf(challenge.correct_meaning_ko);
    const quizId = `gqz_${++this.challengeCounter}`;
    const deadlineMs = Date.now() + GACHA_CHALLENGE_TIMER_SEC * 1000;
    this.pendingChallenges.set(playerId, {
      id: quizId,
      challenge,
      choices,
      correctIndex,
      deadlineMs,
    });
    return { quizId, challenge, choices, deadlineMs };
  }

  /** Resolve answer; returns tokens awarded. */
  resolveChallenge(playerId: string, quizId: string, choice: number): {
    correct: boolean;
    tokensAwarded: number;
    totalTokensToday: number;
  } | null {
    const pending = this.pendingChallenges.get(playerId);
    if (!pending || pending.id !== quizId) return null;
    this.pendingChallenges.delete(playerId);

    const expired = Date.now() > pending.deadlineMs;
    const correct = !expired && choice === pending.correctIndex;
    let tokensAwarded = 0;
    if (correct) {
      const tokens = this.getTokens(playerId);
      const room = GACHA_MAX_TOKENS_PER_DAY - tokens;
      tokensAwarded = Math.min(pending.challenge.reward_token_count, room);
      const cur = this.playerTokens.get(playerId)!;
      cur.count += tokensAwarded;
    }
    const seen = this.playerHistory.get(playerId) ?? new Set();
    seen.add(pending.challenge.id);
    this.playerHistory.set(playerId, seen);

    return {
      correct,
      tokensAwarded,
      totalTokensToday: this.getTokens(playerId),
    };
  }

  /** Open a gacha box; returns awarded items + remaining tokens. */
  openBox(playerId: string, boxId: string): {
    success: boolean;
    reason?: string;
    items?: { item_id: string; qty: number }[];
    remainingTokens?: number;
  } {
    const box = ALL_GACHA_BOXES.find(b => b.id === boxId);
    if (!box) return { success: false, reason: 'Unknown box' };

    const tokens = this.getTokens(playerId);
    if (tokens < box.token_cost) {
      return { success: false, reason: 'insufficient_tokens' };
    }
    // Spend tokens
    const cur = this.playerTokens.get(playerId)!;
    cur.count -= box.token_cost;

    // Roll drops — pick 1-3 items based on rarity weighting
    const totalWeight = box.drops.reduce((acc, d) => acc + d.weight, 0);
    const items: { item_id: string; qty: number }[] = [];
    const rolls = box.rarity === 'rune' ? 3 : box.rarity === 'legendary' ? 2 : 1;
    for (let i = 0; i < rolls; i++) {
      let r = Math.random() * totalWeight;
      for (const d of box.drops) {
        if (r < d.weight) {
          items.push({ item_id: d.item_id, qty: randInt(d.qty_min, d.qty_max) });
          break;
        }
        r -= d.weight;
      }
    }
    return { success: true, items, remainingTokens: cur.count };
  }

  cleanupPlayer(playerId: string): void {
    this.pendingChallenges.delete(playerId);
  }
}

function midnight(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
