// Per-player No-Repeat Cycle Queue.
// Words a player has correctly answered are LOCKED until they finish their current cycle.
// Wrong answers re-enter the active pool with weighted boost.

import { ALL_WORDS, type VocabWord } from '../data/words-data.js';

export class WordQueue {
  private active: VocabWord[];
  private cycledCorrect: VocabWord[] = [];
  private wrongPool: VocabWord[] = [];
  private rng: () => number;

  constructor(seed?: number) {
    // rng MUST be set before shuffle() — shuffle calls this.rng().
    this.rng = mulberry32(seed ?? Date.now() & 0x7fffffff);
    // Filter only words for the current grade band; default = all
    this.active = [...ALL_WORDS];
    this.shuffle(this.active);
  }

  /** Restrict pool to a specific tier set (grade-aware). */
  restrictToTiers(tiers: number[]): void {
    const set = new Set(tiers);
    const all = [...ALL_WORDS].filter(w => set.has(w.tier));
    this.active = all;
    this.cycledCorrect = [];
    this.wrongPool = [];
    this.shuffle(this.active);
  }

  pickOne(): VocabWord {
    if (this.wrongPool.length > 0 && this.rng() < 0.30) {
      return this.popRandom(this.wrongPool);
    }
    if (this.active.length === 0) {
      // Cycle complete — recycle correct pool
      this.active = this.cycledCorrect;
      this.cycledCorrect = [];
      this.shuffle(this.active);
    }
    if (this.active.length === 0) {
      // Edge case (should not happen)
      return ALL_WORDS[0];
    }
    return this.popRandom(this.active);
  }

  /** Generate 4 multiple-choice options. Correct + 3 distractors. */
  buildChoices(target: VocabWord, mode: 'en2ko' | 'ko2en'): { choices: string[]; correctIndex: number } {
    const samePool = ALL_WORDS.filter(w => w.tier === target.tier && w.pos === target.pos && w.id !== target.id);
    const fallback = ALL_WORDS.filter(w => w.id !== target.id);
    const pool = samePool.length >= 8 ? samePool : fallback;
    const distractors: VocabWord[] = [];
    const seen = new Set<string>([target.id]);
    while (distractors.length < 3 && distractors.length < pool.length) {
      const cand = pool[Math.floor(this.rng() * pool.length)];
      if (!seen.has(cand.id)) {
        const candText = mode === 'en2ko' ? cand.meaning_ko : cand.word;
        const targetText = mode === 'en2ko' ? target.meaning_ko : target.word;
        if (candText !== targetText) {
          distractors.push(cand);
          seen.add(cand.id);
        }
      }
    }
    const correctText = mode === 'en2ko' ? target.meaning_ko : target.word;
    const distractTexts = distractors.map(d => mode === 'en2ko' ? d.meaning_ko : d.word);
    const choices = [correctText, ...distractTexts];
    // Shuffle
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return { choices, correctIndex: choices.indexOf(correctText) };
  }

  recordAnswer(word: VocabWord, correct: boolean): void {
    if (correct) {
      this.cycledCorrect.push(word);
    } else {
      this.wrongPool.push(word);
    }
  }

  getStats() {
    return {
      active: this.active.length,
      cycledCorrect: this.cycledCorrect.length,
      wrongPool: this.wrongPool.length,
      total: ALL_WORDS.length,
    };
  }

  private popRandom<T>(arr: T[]): T {
    const idx = Math.floor(this.rng() * arr.length);
    const last = arr.length - 1;
    const item = arr[idx];
    arr[idx] = arr[last];
    arr.pop();
    return item;
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
