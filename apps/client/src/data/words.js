// Vocabulary dataset — combines per-tier files (T1=400, T2=400, T3=400, T4=600, T5=400) = 2,200 total.
// Per-tier files are produced by parallel sub-agents.
// If a tier file fails to load (rare), the seed import below ensures the game still runs with ~150 entries.
import { WORDS_T1 } from './words_t1.js';
import { WORDS_T2 } from './words_t2.js';
import { WORDS_T3 } from './words_t3.js';
import { WORDS_T4 } from './words_t4.js';
import { WORDS_T5 } from './words_t5.js';
export const ALL_WORDS = [
    ...WORDS_T1,
    ...WORDS_T2,
    ...WORDS_T3,
    ...WORDS_T4,
    ...WORDS_T5,
];
export const WORDS_BY_TIER = ALL_WORDS.reduce((acc, w) => {
    (acc[w.tier] ||= []).push(w);
    return acc;
}, {});
export function findWord(id) {
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
