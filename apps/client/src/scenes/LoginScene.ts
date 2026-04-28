import Phaser from 'phaser';
import { CLASSES } from 'shared';

interface LoginPayload {
  inviteCode: string;
  nickname: string;
  grade: string;
}

export class LoginScene extends Phaser.Scene {
  constructor() { super({ key: 'LoginScene' }); }

  create() {
    // We render UI as DOM overlay because input/Korean IME is much smoother in HTML.
    this.injectLoginDOM();
  }

  private injectLoginDOM() {
    const root = document.getElementById('ui-root');
    if (!root) return;
    root.innerHTML = '';
    const screen = document.createElement('div');
    screen.className = 'login-screen';
    screen.id = 'login-screen';
    screen.innerHTML = `
      <div class="login-card">
        <div class="login-title">RUNEWORD CHRONICLE</div>
        <div class="login-subtitle">천공의 부름 · 학급 길드 모드</div>
        <div class="input-row">
          <label>학급 초대 코드</label>
          <input id="invite-code" type="text" placeholder="TEST1234" maxlength="20" value="TEST1234"/>
        </div>
        <div class="input-row">
          <label>플레이어 닉네임</label>
          <input id="nickname" type="text" placeholder="2~12자 한글/영문" maxlength="12"/>
        </div>
        <div class="input-row">
          <label>학년</label>
          <select id="grade">
            <option value="g3">3학년</option>
            <option value="g4">4학년</option>
            <option value="g5" selected>5학년</option>
            <option value="g6">6학년</option>
            <option value="m1">중1 예비</option>
            <option value="m2">중2</option>
          </select>
        </div>
        <button class="btn-primary" id="enter-btn">⚔ 입장 ⚔</button>
        <div style="margin-top: 16px; font-size: 11px; color: var(--color-text-muted); text-align: center;">
          교실 모드 — PvP 비활성, 채팅 필터 강화
        </div>
      </div>
    `;
    root.appendChild(screen);

    const enterBtn = document.getElementById('enter-btn') as HTMLButtonElement;
    enterBtn?.addEventListener('click', () => this.handleEnter());
    document.getElementById('nickname')?.addEventListener('keydown', (e: any) => {
      if (e.key === 'Enter') this.handleEnter();
    });
  }

  private handleEnter() {
    const inviteCode = (document.getElementById('invite-code') as HTMLInputElement).value.trim();
    const nickname = (document.getElementById('nickname') as HTMLInputElement).value.trim();
    const grade = (document.getElementById('grade') as HTMLSelectElement).value;
    if (!nickname || nickname.length < 2) {
      alert('닉네임을 2자 이상 입력해주세요.');
      return;
    }
    if (!inviteCode) {
      alert('학급 초대 코드를 입력해주세요.');
      return;
    }
    const payload: LoginPayload = { inviteCode, nickname, grade };
    sessionStorage.setItem('rwc-login', JSON.stringify(payload));
    this.scene.start('CharCreateScene');
  }
}
