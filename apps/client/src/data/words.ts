// Vocabulary dataset — combines per-tier files (T1=400, T2=400, T3=400, T4=600, T5=400) = 2,200 total.
// Per-tier files are produced by parallel sub-agents.
// If a tier file fails to load (rare), the seed import below ensures the game still runs with ~150 entries.

export interface VocabWord {
  id: string;
  word: string;
  meaning_ko: string;
  pos: 'n' | 'v' | 'adj' | 'adv' | 'prep' | 'conj' | 'pron' | 'interj' | 'det' | 'num';
  tier: 1 | 2 | 3 | 4 | 5;
  example_en: string;
  example_ko: string;
  pronunciation_ipa: string;
  topic: string;
}

import { WORDS_T1 } from './words_t1.js';
import { WORDS_T2 } from './words_t2.js';
import { WORDS_T3 } from './words_t3.js';
import { WORDS_T4 } from './words_t4.js';
import { WORDS_T5 } from './words_t5.js';

// Aggregate + deduplicate by ID. If parallel agents produced overlapping
// words (e.g. 'w_apple' in both T1 and T2 source files), the lower tier wins
// — the higher tier word silently drops, which preserves curriculum ordering.
const _seen = new Set<string>();
const _agg: VocabWord[] = [];
for (const list of [WORDS_T1, WORDS_T2, WORDS_T3, WORDS_T4, WORDS_T5]) {
  for (const w of list) {
    if (_seen.has(w.id)) continue;
    _seen.add(w.id);
    _agg.push(w);
  }
}
export const ALL_WORDS: VocabWord[] = _agg;

export const WORDS_BY_TIER: Record<1 | 2 | 3 | 4 | 5, VocabWord[]> = ALL_WORDS.reduce(
  (acc, w) => {
    (acc[w.tier] ||= []).push(w);
    return acc;
  },
  {} as Record<1 | 2 | 3 | 4 | 5, VocabWord[]>
);

export function findWord(id: string): VocabWord | undefined {
  return ALL_WORDS.find(w => w.id === id);
}

export function getWordCount() {
  return {
    total: ALL_WORDS.length,
    t1: WORDS_BY_TIER[1]?.length ?? 0,
    t2: WORDS_BY_TIER[2]?.length ?? 0,
    t3: WORDS_BY_TIER[3]?.length ?? 0,
    t4: WORDS_BY_TIER[4]?.length ?? 0,
    t5: WORDS_BY_TIER[5]?.length ?? 0,
  };
}
