// Per-player, server-authoritative quiz lifecycle.
// Issues a quiz when a player attacks, validates the answer, manages the no-repeat queue.

import { WordQueue } from './WordQueue.js';
import type { VocabWord } from '../data/words-data.js';
import { QUIZ_TIMER_BY_GRADE, QUIZ_TIMER_WRONG_POOL_BONUS, QUIZ_TIMER_MIN, QUIZ_TIMER_MAX, type GradeLevel } from 'shared';

interface PendingQuiz {
  id: string;
  word: VocabWord;
  mode: 'en2ko' | 'ko2en';
  correctIndex: number;
  choices: string[];
  monsterId: string;
  deadlineMs: number;
  createdAt: number;
  fromWrongPool: boolean;
}

export class QuizManager {
  private queues = new Map<string, WordQueue>();   // by playerId
  private pending = new Map<string, PendingQuiz>(); // by quizId
  private playerToCurrent = new Map<string, string>(); // playerId -> quizId
  private quizCounter = 1;

  ensureQueue(playerId: string, grade: GradeLevel): WordQueue {
    let q = this.queues.get(playerId);
    if (!q) {
      q = new WordQueue(playerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
      // Restrict tier set by grade
      q.restrictToTiers(this.tiersForGrade(grade));
      this.queues.set(playerId, q);
    }
    return q;
  }

  private tiersForGrade(grade: GradeLevel): number[] {
    switch (grade) {
      case 'g3': return [1];
      case 'g4': return [1, 2];
      case 'g5': return [1, 2, 3];
      case 'g6': return [1, 2, 3];
      case 'm1': return [2, 3, 4];
      case 'm2': return [3, 4, 5];
      default: return [1, 2, 3, 4, 5];
    }
  }

  startQuiz(playerId: string, grade: GradeLevel, monsterId: string): {
    quizId: string;
    word: VocabWord;
    mode: 'en2ko' | 'ko2en';
    choices: string[];
    deadlineMs: number;
    graded_seconds: number;
  } | null {
    if (this.playerToCurrent.has(playerId)) {
      // Already a pending quiz — reject new one
      return null;
    }
    const q = this.ensureQueue(playerId, grade);
    const word = q.pickOne();
    const mode: 'en2ko' | 'ko2en' = Math.random() < 0.5 ? 'en2ko' : 'ko2en';
    const { choices, correctIndex } = q.buildChoices(word, mode);

    let timer = QUIZ_TIMER_BY_GRADE[grade] ?? 7;
    // Detect if the chosen word is from the wrong pool (a heuristic — we can't tell directly without a hint)
    // Heuristic: just give bonus if grade is younger than g6
    if (grade === 'g3' || grade === 'g4') timer += QUIZ_TIMER_WRONG_POOL_BONUS;
    timer = Math.max(QUIZ_TIMER_MIN, Math.min(QUIZ_TIMER_MAX, timer));

    const quizId = `qz_${++this.quizCounter}`;
    const deadlineMs = Date.now() + timer * 1000;
    this.pending.set(quizId, {
      id: quizId,
      word,
      mode,
      correctIndex,
      choices,
      monsterId,
      deadlineMs,
      createdAt: Date.now(),
      fromWrongPool: false,
    });
    this.playerToCurrent.set(playerId, quizId);
    return { quizId, word, mode, choices, deadlineMs, graded_seconds: timer };
  }

  /** Resolve a player answer. Returns null if quiz invalid/expired. */
  resolveAnswer(playerId: string, quizId: string, choice: number): {
    quizId: string;
    correct: boolean;
    correctChoice: number;
    word: VocabWord;
    monsterId: string;
  } | null {
    const pending = this.pending.get(quizId);
    if (!pending) return null;
    if (this.playerToCurrent.get(playerId) !== quizId) return null;

    const expired = Date.now() > pending.deadlineMs;
    const correct = !expired && choice === pending.correctIndex;

    // Record into queue
    const q = this.queues.get(playerId);
    q?.recordAnswer(pending.word, correct);

    // Cleanup
    this.pending.delete(quizId);
    this.playerToCurrent.delete(playerId);

    return {
      quizId,
      correct,
      correctChoice: pending.correctIndex,
      word: pending.word,
      monsterId: pending.monsterId,
    };
  }

  forceTimeoutAll(now: number): { playerId: string; quizId: string }[] {
    const expired: { playerId: string; quizId: string }[] = [];
    for (const [pid, qid] of this.playerToCurrent.entries()) {
      const p = this.pending.get(qid);
      if (p && now > p.deadlineMs) {
        expired.push({ playerId: pid, quizId: qid });
      }
    }
    return expired;
  }

  getPlayerStats(playerId: string) {
    return this.queues.get(playerId)?.getStats() ?? { active: 0, cycledCorrect: 0, wrongPool: 0, total: 0 };
  }

  cleanupPlayer(playerId: string): void {
    const qid = this.playerToCurrent.get(playerId);
    if (qid) this.pending.delete(qid);
    this.playerToCurrent.delete(playerId);
    this.queues.delete(playerId);
  }
}
