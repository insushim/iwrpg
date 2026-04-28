// Quiz modal — rendered as DOM for Korean text rendering quality.
// Listens to 'quiz:prompt' and 'quiz:result' from WorldScene.

import Phaser from 'phaser';
import { NetClient } from '../network/ColyseusClient.js';

interface QuizPromptData {
  quizId: string;
  word_id: string;
  display: string;
  mode: 'en2ko' | 'ko2en';
  choices: string[];
  deadlineMs: number;
  monsterId: string;
  graded_seconds: number;
}

export class QuizModal {
  private static current: QuizPromptData | null = null;
  private static timerInterval: any = null;
  private static answered = false;

  static init(scene: Phaser.Scene) {
    scene.events.on('quiz:prompt', (msg: any) => this.show(msg));
    scene.events.on('quiz:result', (result: any) => this.showResult(result));
  }

  private static show(prompt: QuizPromptData) {
    this.cleanup();
    this.current = prompt;
    this.answered = false;

    const root = document.getElementById('ui-root')!;
    const modal = document.createElement('div');
    modal.className = 'quiz-modal';
    modal.id = 'quiz-modal';
    const isEn = prompt.mode === 'en2ko';
    modal.innerHTML = `
      <div class="quiz-modal-header">
        <div class="quiz-modal-title">⚔ Word Gate ⚔</div>
        <div class="quiz-modal-mode">${isEn ? 'EN → KO' : 'KO → EN'} · ${prompt.graded_seconds}s</div>
      </div>
      <div class="quiz-display ${isEn ? '' : 'korean'}">${escapeHtml(prompt.display)}</div>
      ${isEn ? `<div class="quiz-pronunciation">단어를 보고 한글 뜻을 고르세요</div>`
             : `<div class="quiz-pronunciation">한글 뜻을 보고 영어 단어를 고르세요</div>`}
      <div class="quiz-timer-bar"><div class="quiz-timer-fill" id="quiz-timer-fill" style="width: 100%"></div></div>
      <div class="quiz-choices" id="quiz-choices">
        ${prompt.choices.map((c, i) => `<button class="quiz-choice" data-idx="${i}">${escapeHtml(c)}</button>`).join('')}
      </div>
    `;
    root.appendChild(modal);

    document.querySelectorAll<HTMLButtonElement>('#quiz-choices .quiz-choice').forEach(btn => {
      btn.addEventListener('click', () => this.answer(parseInt(btn.dataset.idx!, 10)));
    });

    // Keyboard shortcuts 1-4
    const keyHandler = (e: KeyboardEvent) => {
      if (this.answered) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0) this.answer(idx);
    };
    (modal as any)._keyHandler = keyHandler;
    document.addEventListener('keydown', keyHandler);

    this.startTimer();
  }

  private static startTimer() {
    if (!this.current) return;
    const fill = document.getElementById('quiz-timer-fill') as HTMLElement;
    if (!fill) return;
    const total = this.current.deadlineMs - Date.now();
    if (total <= 0) {
      this.answer(-1);
      return;
    }
    const startedAt = Date.now();
    this.timerInterval = setInterval(() => {
      if (!this.current) return;
      const remaining = this.current.deadlineMs - Date.now();
      const pct = Math.max(0, Math.min(1, remaining / total));
      fill.style.width = `${pct * 100}%`;
      if (remaining <= 0) {
        clearInterval(this.timerInterval);
        if (!this.answered) this.answer(-1);
      }
    }, 50);
  }

  private static answer(choice: number) {
    if (!this.current || this.answered) return;
    this.answered = true;
    NetClient.inst.send('quiz_answer', { quizId: this.current.quizId, choice });
    // Highlight selection
    const btns = document.querySelectorAll<HTMLButtonElement>('#quiz-choices .quiz-choice');
    btns.forEach((b, i) => {
      if (i === choice) b.style.borderColor = 'var(--color-accent-aether)';
      b.disabled = true;
    });
  }

  private static showResult(result: any) {
    if (!this.current) return;
    const btns = document.querySelectorAll<HTMLButtonElement>('#quiz-choices .quiz-choice');
    btns.forEach((b, i) => {
      if (i === result.correctChoice) b.classList.add('correct');
      else if (b.style.borderColor.includes('aether') && i !== result.correctChoice) b.classList.add('wrong');
    });
    setTimeout(() => this.cleanup(), 900);
  }

  private static cleanup() {
    const modal = document.getElementById('quiz-modal');
    if (modal) {
      const handler = (modal as any)._keyHandler;
      if (handler) document.removeEventListener('keydown', handler);
      modal.remove();
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.current = null;
    this.answered = false;
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
