// Re-export the client-side words dataset so the server can use the same source of truth.
// Server uses these for quiz generation and answer validation.
export { ALL_WORDS, WORDS_BY_TIER } from '../../../client/src/data/words';
export type { VocabWord } from '../../../client/src/data/words';
