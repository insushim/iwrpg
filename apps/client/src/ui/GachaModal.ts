// Gacha modal — three states:
//  1. List of 5 boxes (open with tokens) + "도전하기" button to earn tokens
//  2. Active C1/C2 sentence challenge with timer
//  3. Result reveal animation

import Phaser from 'phaser';
import { NetClient } from '../network/ColyseusClient.js';
import { ALL_GACHA_BOXES } from '../data/gacha.js';
import { ALL_ITEMS } from '../data/items.js';
import { getMyChar } from './state.js';

interface ChallengePromptData {
  challenge: { id: string; sentence_en: string; choices: string[]; difficulty: 'C1'|'C2'; reward_tokens: 1|2|3 };
  deadlineMs: number;
}

export class GachaModal {
  private static state: 'closed' | 'list' | 'challenge' | 'result' = 'closed';
  private static current: ChallengePromptData | null = null;
  private static timer: any = null;
  private static answered = false;

  static init(scene: Phaser.Scene) {
    scene.events.on('gacha:prompt', (msg: any) => this.showChallenge(msg));
    scene.events.on('gacha:result', (msg: any) => this.showChallengeResult(msg));
    scene.events.on('gacha:box_result', (msg: any) => this.showBoxResult(msg));
  }

  static toggle() {
    if (this.state === 'closed') this.show();
    else this.hide();
  }

  static show() {
    this.state = 'list';
    this.render();
  }
  static hide() {
    if (this.state === 'challenge') return;  // can't close mid-challenge
    document.getElementById('gacha-backdrop')?.remove();
    if (this.timer) clearInterval(this.timer);
    this.state = 'closed';
  }

  private static render() {
    document.getElementById('gacha-backdrop')?.remove();
    const root = document.getElementById('ui-root')!;
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.id = 'gacha-backdrop';
    const me = getMyChar();
    const tokens = me?.gachaTokensToday ?? 0;

    bd.innerHTML = `
      <div class="modal-window" style="max-width: 760px;">
        <button class="modal-close" id="gacha-close">✕</button>
        <div class="modal-title">🎁 룬 가챠 ✨</div>
        <div style="text-align:center; margin-bottom: 18px; color: var(--color-text-secondary);">
          영문 해석에 도전하여 <strong style="color: var(--color-accent-aether);">룬 토큰</strong>을 획득하세요.<br/>
          하루 최대 <strong style="color: var(--color-accent-gold);">3개</strong> · 현재 <strong id="gacha-token-count" style="color: var(--color-accent-gold);">${tokens}/3</strong>
        </div>
        <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 24px;">
          <button class="btn-secondary" style="width: auto; padding: 8px 24px;" id="challenge-c1">C1 도전 (1 토큰)</button>
          <button class="btn-secondary" style="width: auto; padding: 8px 24px;" id="challenge-c2">C2 도전 (1~3 토큰)</button>
        </div>
        <div style="border-top: 1px solid var(--color-border-subtle); padding-top: 18px;">
          <div style="font-family: var(--font-display); color: var(--color-accent-gold); margin-bottom: 12px; text-align: center; letter-spacing: 0.1em;">RUNE BOX SHRINE</div>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
            ${ALL_GACHA_BOXES.map((b: any) => this.boxHtml(b, tokens)).join('')}
          </div>
        </div>
      </div>
    `;
    root.appendChild(bd);

    document.getElementById('gacha-close')?.addEventListener('click', () => this.hide());
    document.getElementById('challenge-c1')?.addEventListener('click', () => {
      NetClient.inst.send('gacha_request_challenge', { difficulty: 'C1' });
    });
    document.getElementById('challenge-c2')?.addEventListener('click', () => {
      NetClient.inst.send('gacha_request_challenge', { difficulty: 'C2' });
    });
    document.querySelectorAll<HTMLElement>('.gacha-box-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const boxId = btn.dataset.box!;
        NetClient.inst.send('gacha_open_box', { boxId });
      });
    });
  }

  private static boxHtml(box: any, tokens: number): string {
    const colors: Record<string, string> = {
      normal: '#9CA3AF',
      rare: '#60A5FA',
      epic: '#A855F7',
      legendary: '#FB923C',
      rune: '#FCD34D',
    };
    const canOpen = tokens >= box.token_cost;
    return `
      <div style="background: var(--color-bg-elevated); border: 2px solid ${colors[box.rarity]}; border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-family: var(--font-display); color: ${colors[box.rarity]}; font-size: 14px; margin-bottom: 4px;">${box.name_ko ?? box.id}</div>
        <div style="font-size: 36px; margin: 8px 0;">📦</div>
        <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 8px;">${box.token_cost} 토큰</div>
        <button class="gacha-box-btn ${canOpen ? '' : 'disabled'}" data-box="${box.id}"
          style="width:100%; padding: 6px; background: ${canOpen ? colors[box.rarity] : 'var(--color-bg-deep)'}; color: ${canOpen ? '#1A1410' : 'var(--color-text-muted)'}; border: none; border-radius: 4px; cursor: ${canOpen ? 'pointer' : 'not-allowed'}; font-weight: 700; font-family: var(--font-display); font-size: 12px;"
          ${canOpen ? '' : 'disabled'}>
          OPEN
        </button>
      </div>
    `;
  }

  private static showChallenge(msg: ChallengePromptData) {
    this.state = 'challenge';
    this.current = msg;
    this.answered = false;
    document.getElementById('gacha-backdrop')?.remove();
    const root = document.getElementById('ui-root')!;
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.id = 'gacha-backdrop';
    bd.innerHTML = `
      <div class="modal-window" style="max-width: 640px;">
        <div class="modal-title">📜 ${msg.challenge.difficulty} 영문 해석 도전</div>
        <div style="text-align: center; color: var(--color-text-secondary); margin-bottom: 16px;">
          정답 시 <strong style="color: var(--color-accent-gold);">${msg.challenge.reward_tokens}</strong> 토큰 획득
        </div>
        <div style="background: var(--color-bg-deep); border: 1px solid var(--color-border-subtle); padding: 18px; border-radius: 6px; font-family: var(--font-display); font-size: 18px; line-height: 1.6; margin-bottom: 16px; color: var(--color-text-primary);">
          "${escapeHtml(msg.challenge.sentence_en)}"
        </div>
        <div class="quiz-timer-bar"><div class="quiz-timer-fill" id="gacha-timer-fill" style="width:100%; background: linear-gradient(90deg, var(--color-accent-aether), var(--color-accent-gold));"></div></div>
        <div style="display: grid; gap: 8px; margin-top: 16px;" id="gacha-choices">
          ${msg.challenge.choices.map((c, i) => `
            <button class="quiz-choice" data-idx="${i}" style="text-align: left; padding: 12px 16px;">${i + 1}. ${escapeHtml(c)}</button>
          `).join('')}
        </div>
      </div>
    `;
    root.appendChild(bd);

    document.querySelectorAll<HTMLButtonElement>('#gacha-choices .quiz-choice').forEach(btn => {
      btn.addEventListener('click', () => this.answerChallenge(parseInt(btn.dataset.idx!, 10)));
    });

    // Timer
    const total = msg.deadlineMs - Date.now();
    const start = Date.now();
    this.timer = setInterval(() => {
      const remaining = msg.deadlineMs - Date.now();
      const pct = Math.max(0, Math.min(1, remaining / total));
      const fill = document.getElementById('gacha-timer-fill') as HTMLElement;
      if (fill) fill.style.width = `${pct * 100}%`;
      if (remaining <= 0) {
        clearInterval(this.timer);
        if (!this.answered) this.answerChallenge(-1);
      }
    }, 100);
  }

  private static answerChallenge(choice: number) {
    if (this.answered || !this.current) return;
    this.answered = true;
    NetClient.inst.send('gacha_answer_challenge', {
      challengeId: this.current.challenge.id,
      choice,
    });
  }

  private static showChallengeResult(msg: any) {
    if (this.timer) clearInterval(this.timer);
    document.getElementById('gacha-backdrop')?.remove();
    const root = document.getElementById('ui-root')!;
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.id = 'gacha-backdrop';
    const success = msg.correct;
    bd.innerHTML = `
      <div class="modal-window" style="max-width: 480px; text-align: center;">
        <div style="font-size: 64px; margin: 12px 0;">${success ? '🌟' : '💧'}</div>
        <div class="modal-title" style="color: ${success ? 'var(--color-success-rune)' : 'var(--color-danger-rune)'};">
          ${success ? '정답!' : '오답...'}
        </div>
        <div style="font-size: 16px; color: var(--color-text-primary); margin-bottom: 16px;">
          ${success ? `+${msg.tokensAwarded} 룬 토큰 획득!` : '다음 기회에 도전해보세요.'}
        </div>
        <div style="font-size: 13px; color: var(--color-text-secondary);">
          오늘의 토큰: ${msg.totalTokensToday}/3
        </div>
        <button class="btn-primary" style="margin-top: 18px;" id="gacha-back">돌아가기</button>
      </div>
    `;
    root.appendChild(bd);
    document.getElementById('gacha-back')?.addEventListener('click', () => this.show());
    setTimeout(() => { if (this.state === 'challenge') this.show(); }, 3500);
    this.state = 'result';
  }

  private static showBoxResult(msg: any) {
    document.getElementById('gacha-backdrop')?.remove();
    const root = document.getElementById('ui-root')!;
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.id = 'gacha-backdrop';
    const items = msg.itemsAwarded ?? [];
    bd.innerHTML = `
      <div class="modal-window" style="max-width: 480px; text-align: center;">
        <div class="modal-title">✨ ${ALL_GACHA_BOXES.find((b: any) => b.id === msg.boxId)?.name_ko ?? '가챠'} 결과</div>
        <div style="font-size: 64px; margin: 8px 0;">🎁</div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin: 16px 0;">
          ${items.map((it: any) => {
            const def = ALL_ITEMS.find((d: any) => d.id === it.item_id);
            return `<div style="background: var(--color-bg-elevated); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--color-border-arcane);">
              <span style="color: var(--color-accent-gold); font-weight: 600;">${def?.name_ko ?? it.item_id}</span>
              <span style="color: var(--color-text-secondary); float: right;">×${it.qty}</span>
            </div>`;
          }).join('')}
        </div>
        <button class="btn-primary" id="gacha-back2">계속</button>
      </div>
    `;
    root.appendChild(bd);
    document.getElementById('gacha-back2')?.addEventListener('click', () => this.show());
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
