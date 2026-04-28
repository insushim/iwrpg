// Wordbook modal — student-facing learning stats. Pure client-side: accumulates
// quiz history into localStorage, no extra server traffic. Tied to characterId.
import { AudioManager } from '../systems/AudioManager.js';

interface WordRecord {
  word_id: string;
  display_en: string;
  display_ko: string;
  correct: number;
  wrong: number;
  lastAt: number;
  lastResult: 'correct' | 'wrong';
}

interface WordbookSnapshot {
  charId: string;
  totalAnswered: number;
  totalCorrect: number;
  startedAt: number;
  records: Record<string, WordRecord>;
}

const STORAGE_KEY = (charId: string) => `rwc-wordbook-${charId}`;

function loadSnapshot(charId: string): WordbookSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(charId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { charId, totalAnswered: 0, totalCorrect: 0, startedAt: Date.now(), records: {} };
}

function saveSnapshot(s: WordbookSnapshot): void {
  try { localStorage.setItem(STORAGE_KEY(s.charId), JSON.stringify(s)); } catch {}
}

function getCharId(): string {
  try {
    const p = JSON.parse(sessionStorage.getItem('rwc-char') ?? '{}');
    return p.charId ?? 'guest';
  } catch { return 'guest'; }
}

// Latest pending quiz prompt (so we can resolve word_id when result arrives)
let pendingPrompt: {
  word_id: string;
  display: string;          // shown side
  mode: 'en2ko' | 'ko2en';
  answer?: string;          // resolved on result
} | null = null;

export const Wordbook = {
  /** Called when server sends quiz_prompt — remember the word. */
  trackPrompt(prompt: { word_id: string; display: string; mode: 'en2ko' | 'ko2en'; choices: string[] }): void {
    pendingPrompt = { word_id: prompt.word_id, display: prompt.display, mode: prompt.mode };
  },

  /** Called when server sends quiz_result — record correct/wrong. */
  trackResult(result: { quizId?: string; correct: boolean; correctChoice: number }, prompt?: { word_id: string; display: string; mode: 'en2ko' | 'ko2en'; choices: string[] }): void {
    const p = prompt ?? pendingPrompt;
    if (!p) return;
    const correctText = (prompt?.choices ?? [])[result.correctChoice] ?? '';
    const charId = getCharId();
    const snap = loadSnapshot(charId);
    const display_en = p.mode === 'en2ko' ? p.display : correctText;
    const display_ko = p.mode === 'en2ko' ? correctText : p.display;

    const rec = snap.records[p.word_id] ?? {
      word_id: p.word_id,
      display_en, display_ko,
      correct: 0, wrong: 0,
      lastAt: 0, lastResult: 'correct' as const,
    };
    if (display_en) rec.display_en = display_en;
    if (display_ko) rec.display_ko = display_ko;
    if (result.correct) rec.correct++; else rec.wrong++;
    rec.lastAt = Date.now();
    rec.lastResult = result.correct ? 'correct' : 'wrong';
    snap.records[p.word_id] = rec;
    snap.totalAnswered++;
    if (result.correct) snap.totalCorrect++;
    saveSnapshot(snap);
    pendingPrompt = null;
  },
};

export class WordbookModal {
  private static visible = false;
  private static rootEl: HTMLDivElement | null = null;
  private static currentTab: 'overview' | 'wrong' | 'all' = 'overview';

  static init(_worldScene: any): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.hide();
    });
  }

  static toggle(): void { this.visible ? this.hide() : this.show(); }

  static show(): void {
    if (this.visible) return;
    this.visible = true;
    AudioManager.playSfx('ui_open');
    if (!this.rootEl) {
      this.rootEl = document.createElement('div');
      this.rootEl.className = 'modal-backdrop';
      this.rootEl.id = 'wordbook-backdrop';
      this.rootEl.addEventListener('click', (e) => {
        if (e.target === this.rootEl) this.hide();
      });
      document.getElementById('ui-root')?.appendChild(this.rootEl);
    }
    this.render();
    this.rootEl.style.display = 'flex';
  }

  static hide(): void {
    if (!this.visible) return;
    this.visible = false;
    AudioManager.playSfx('ui_close');
    if (this.rootEl) this.rootEl.style.display = 'none';
  }

  private static render(): void {
    if (!this.rootEl) return;
    const charId = getCharId();
    const snap = loadSnapshot(charId);
    const records = Object.values(snap.records);
    const wrongOnly = records.filter(r => r.lastResult === 'wrong' || r.wrong > r.correct);
    const accuracy = snap.totalAnswered > 0 ? Math.round((snap.totalCorrect / snap.totalAnswered) * 1000) / 10 : 0;

    const tabs = [
      { id: 'overview', label: '요약', count: null as number | null },
      { id: 'wrong', label: '복습 단어', count: wrongOnly.length },
      { id: 'all', label: '전체', count: records.length },
    ];

    this.rootEl.innerHTML = `
      <div class="modal-window wordbook-modal">
        <button class="modal-close" id="wordbook-close">✕</button>
        <div class="modal-title">📖 나의 단어장</div>
        <div class="wordbook-tabs">
          ${tabs.map(t => `
            <button class="wordbook-tab ${this.currentTab === t.id ? 'active' : ''}" data-tab="${t.id}">
              ${t.label}${t.count !== null ? ` <span class="wordbook-tab-count">${t.count}</span>` : ''}
            </button>
          `).join('')}
        </div>
        <div class="wordbook-body">
          ${this.currentTab === 'overview' ? this.renderOverview(snap, accuracy) : ''}
          ${this.currentTab === 'wrong' ? this.renderList(wrongOnly, '오답이 더 많거나 가장 최근에 틀린 단어') : ''}
          ${this.currentTab === 'all' ? this.renderList(records, '학습한 모든 단어') : ''}
        </div>
      </div>
    `;
    this.rootEl.querySelector('#wordbook-close')?.addEventListener('click', () => this.hide());
    this.rootEl.querySelectorAll<HTMLElement>('.wordbook-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTab = (btn.dataset.tab as any) ?? 'overview';
        AudioManager.playSfx('click');
        this.render();
      });
    });
  }

  private static renderOverview(snap: WordbookSnapshot, accuracy: number): string {
    const accuracyColor = accuracy >= 80 ? 'var(--color-success-rune)'
      : accuracy >= 60 ? 'var(--color-accent-gold)'
      : 'var(--color-danger-rune)';
    const days = snap.startedAt ? Math.max(1, Math.ceil((Date.now() - snap.startedAt) / 86_400_000)) : 1;
    const wordsLearned = Object.keys(snap.records).length;
    const top5Correct = Object.values(snap.records)
      .sort((a, b) => b.correct - a.correct)
      .slice(0, 5);
    const top5Wrong = Object.values(snap.records)
      .filter(r => r.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 5);

    return `
      <div class="wordbook-stats-grid">
        <div class="stat-card">
          <div class="stat-value">${snap.totalAnswered}</div>
          <div class="stat-label">총 풀이</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:${accuracyColor}">${accuracy}%</div>
          <div class="stat-label">정답률</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${wordsLearned}</div>
          <div class="stat-label">학습 단어</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${days}</div>
          <div class="stat-label">학습 일수</div>
        </div>
      </div>
      <div class="wordbook-section">
        <h4>🏆 가장 잘 맞춘 단어</h4>
        ${top5Correct.length === 0
          ? '<div class="wordbook-empty">아직 풀이 기록이 없어요. 사냥터에서 단어를 만나보세요.</div>'
          : `<div class="wordbook-mini-list">${top5Correct.map(r => `
              <div class="wordbook-mini-row">
                <span class="word-en">${escapeHtml(r.display_en || '—')}</span>
                <span class="word-ko">${escapeHtml(r.display_ko || '—')}</span>
                <span class="word-tally" style="color:var(--color-success-rune)">정답 ${r.correct}회</span>
              </div>`).join('')}</div>`
        }
      </div>
      <div class="wordbook-section">
        <h4>🔥 자주 틀린 단어</h4>
        ${top5Wrong.length === 0
          ? '<div class="wordbook-empty">틀린 단어가 없네요. 멋져요!</div>'
          : `<div class="wordbook-mini-list">${top5Wrong.map(r => `
              <div class="wordbook-mini-row">
                <span class="word-en">${escapeHtml(r.display_en || '—')}</span>
                <span class="word-ko">${escapeHtml(r.display_ko || '—')}</span>
                <span class="word-tally" style="color:var(--color-danger-rune)">오답 ${r.wrong}회</span>
              </div>`).join('')}</div>`
        }
      </div>
      <div class="wordbook-tip">
        💡 사냥터에서 만난 단어는 자동으로 단어장에 기록돼요. <b>틀린 단어는 다시 출제될 확률이 30% 더 높아요.</b>
      </div>
    `;
  }

  private static renderList(records: WordRecord[], emptyHint: string): string {
    if (records.length === 0) {
      return `<div class="wordbook-empty">${escapeHtml(emptyHint)}이(가) 아직 없어요.</div>`;
    }
    const sorted = [...records].sort((a, b) => b.lastAt - a.lastAt);
    return `
      <div class="wordbook-list">
        <div class="wordbook-list-head">
          <span>영어</span><span>뜻</span><span style="text-align:center">정답</span><span style="text-align:center">오답</span>
        </div>
        ${sorted.map(r => `
          <div class="wordbook-list-row ${r.lastResult === 'wrong' ? 'last-wrong' : 'last-correct'}">
            <span class="word-en">${escapeHtml(r.display_en || '—')}</span>
            <span class="word-ko">${escapeHtml(r.display_ko || '—')}</span>
            <span style="text-align:center;color:var(--color-success-rune)">${r.correct}</span>
            <span style="text-align:center;color:var(--color-danger-rune)">${r.wrong}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
