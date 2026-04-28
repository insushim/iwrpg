import Phaser from 'phaser';
import { CLASSES, type ClassId } from 'shared';
import { NetClient } from '../network/ColyseusClient.js';

export class CharCreateScene extends Phaser.Scene {
  private selectedClass: ClassId = 'iron-sentinel';

  constructor() { super({ key: 'CharCreateScene' }); }

  create() {
    this.injectDOM();
  }

  private injectDOM() {
    const root = document.getElementById('ui-root');
    if (!root) return;
    root.innerHTML = '';

    const data = JSON.parse(sessionStorage.getItem('rwc-login') ?? '{}');

    const screen = document.createElement('div');
    screen.className = 'char-create-screen';
    screen.id = 'char-create';
    screen.innerHTML = `
      <div class="char-create-card" style="max-width: 720px;">
        <div class="login-title">CHOOSE YOUR PATH</div>
        <div class="login-subtitle">${data.nickname ?? ''} · 직업을 선택하세요</div>
        <div class="class-cards" id="class-cards">
          ${(Object.values(CLASSES)).map(c => this.classCardHtml(c)).join('')}
        </div>
        <button class="btn-primary" id="confirm-char">⚔ 모험 시작 ⚔</button>
        <button class="btn-secondary" id="back-btn" style="margin-top: 8px;">뒤로</button>
      </div>
    `;
    root.appendChild(screen);

    document.querySelectorAll<HTMLElement>('#class-cards .class-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('#class-cards .class-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedClass = card.dataset.classId as ClassId;
      });
    });
    // default selection
    document.querySelector(`[data-class-id="${this.selectedClass}"]`)?.classList.add('selected');

    document.getElementById('confirm-char')?.addEventListener('click', () => this.handleConfirm());
    document.getElementById('back-btn')?.addEventListener('click', () => this.scene.start('LoginScene'));
  }

  private classCardHtml(c: typeof CLASSES[ClassId]): string {
    return `
      <div class="class-card" data-class-id="${c.id}">
        <div class="name">${c.name_ko}</div>
        <div class="role">${c.name_en}</div>
        <div class="desc">${c.description_ko}</div>
        <div class="stats">
          <span>STR ${c.base_stats.str}</span>
          <span>CON ${c.base_stats.con}</span>
          <span>DEX ${c.base_stats.dex}</span>
          <span>INT ${c.base_stats.int}</span>
          <span>WIS ${c.base_stats.wis}</span>
        </div>
        <div class="stats" style="border-top: 0; padding-top: 4px;">
          <span style="color: var(--color-accent-aether);">⚡ ${c.special_ability_ko}</span>
        </div>
      </div>
    `;
  }

  private async handleConfirm() {
    const data = JSON.parse(sessionStorage.getItem('rwc-login') ?? '{}');
    const charPayload = {
      charId: 'char_' + Math.random().toString(36).slice(2, 10),
      name: data.nickname,
      classId: this.selectedClass,
      grade: data.grade,
      level: 1,
      exp: 0,
      gold: 100,
      x: 30,
      y: 30,
      inviteCode: data.inviteCode,
    };
    NetClient.inst.setCharPayload(charPayload);
    sessionStorage.setItem('rwc-char', JSON.stringify(charPayload));

    const btn = document.getElementById('confirm-char') as HTMLButtonElement;
    if (btn) { btn.disabled = true; btn.innerText = '연결 중…'; }

    try {
      await NetClient.inst.joinWorld('aurora_town');
      // Clear DOM
      const root = document.getElementById('ui-root');
      if (root) root.innerHTML = '';
      this.scene.start('WorldScene');
      this.scene.launch('HUDScene');
      (window as any).gameReady = true;
    } catch (e: any) {
      console.error(e);
      alert('서버 연결 실패: ' + (e?.message ?? '알 수 없는 오류'));
      if (btn) { btn.disabled = false; btn.innerText = '⚔ 모험 시작 ⚔'; }
    }
  }
}
