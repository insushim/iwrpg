// Persistent HUD panels (stat bar, target info, chat, minimap, skillbar, quickbar).
import { NetClient } from '../network/ColyseusClient.js';
import { getMyChar } from './state.js';

export class HUDPanels {
  private static targetInfo: { id: string; name: string; hp: number; maxHp: number } | null = null;

  static mount() {
    const root = document.getElementById('ui-root')!;
    root.innerHTML = '';

    // Stat bar (top right)
    const stat = document.createElement('div');
    stat.className = 'hud-panel hud-stat-bar';
    stat.id = 'hud-stat-bar';
    stat.innerHTML = `
      <div class="row"><span class="label">LV</span><span class="value" id="stat-level">1</span></div>
      <div class="row"><span class="label">HP</span><div class="gauge"><div class="gauge-fill hp-fill" id="stat-hp-fill" style="width:100%"></div></div><span class="value" id="stat-hp-text">50/50</span></div>
      <div class="row"><span class="label">MP</span><div class="gauge"><div class="gauge-fill mp-fill" id="stat-mp-fill" style="width:100%"></div></div><span class="value" id="stat-mp-text">20/20</span></div>
      <div class="row"><span class="label">XP</span><div class="gauge"><div class="gauge-fill exp-fill" id="stat-exp-fill" style="width:0%"></div></div></div>
      <div class="row"><span class="label">GOLD</span><span class="value" id="stat-gold">100</span></div>
      <div class="row"><span class="label">RUNE</span><span class="value" id="stat-tokens">0/3</span></div>
    `;
    root.appendChild(stat);

    // Target info (top left)
    const target = document.createElement('div');
    target.className = 'hud-panel hud-target-info';
    target.id = 'hud-target-info';
    target.style.display = 'none';
    target.innerHTML = `
      <div class="target-name" id="target-name">—</div>
      <div class="target-hp" id="target-hp">HP —</div>
      <div style="font-size:10px; color: var(--color-text-muted); margin-top:4px;" id="target-hint">근접 시 클릭하여 공격</div>
    `;
    root.appendChild(target);

    // Chat
    const chat = document.createElement('div');
    chat.className = 'hud-panel hud-chat';
    chat.id = 'hud-chat';
    chat.innerHTML = `
      <div class="hud-chat-tabs">
        <div class="hud-chat-tab active" data-channel="world">전체</div>
        <div class="hud-chat-tab" data-channel="guild">학급</div>
        <div class="hud-chat-tab" data-channel="whisper">귓속말</div>
      </div>
      <div class="hud-chat-messages" id="hud-chat-messages"></div>
      <input class="hud-chat-input" id="hud-chat-input" placeholder="채팅 입력 후 Enter…" maxlength="120" />
    `;
    root.appendChild(chat);
    document.querySelectorAll('.hud-chat-tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.hud-chat-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
      });
    });
    document.getElementById('hud-chat-input')?.addEventListener('keydown', (e: any) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        const channel = (document.querySelector('.hud-chat-tab.active') as HTMLElement)?.dataset.channel ?? 'world';
        NetClient.inst.send('chat', { channel, text: e.target.value });
        e.target.value = '';
      }
    });

    // Quickbar (top center buttons)
    const qb = document.createElement('div');
    qb.className = 'hud-panel hud-quickbar';
    qb.id = 'hud-quickbar';
    qb.innerHTML = `
      <button data-modal="inventory" title="인벤토리 (I)">I</button>
      <button data-modal="character" title="캐릭터 (C)">C</button>
      <button data-modal="gacha" title="가챠 (G)">G</button>
      <button data-modal="map" title="지도 (M)">M</button>
      <button data-modal="wordbook" title="단어장 (W)">W</button>
    `;
    root.appendChild(qb);

    // Listen to events from world scene for target info
    const game = (window as any).__game;
    const worldScene = game.scene.getScene('WorldScene');
    worldScene.events.on('hud:target_selected', (data: any) => {
      this.targetInfo = data;
      this.renderTargetInfo();
    });
    worldScene.events.on('hud:target_cleared', () => {
      this.targetInfo = null;
      this.renderTargetInfo();
    });
    worldScene.events.on('chat:message', (msg: any) => this.appendChatMsg(msg));
  }

  static refresh() {
    const me = getMyChar();
    if (!me) return;
    const set = (id: string, v: string | number) => {
      const el = document.getElementById(id); if (el) el.textContent = String(v);
    };
    const setW = (id: string, w: number) => {
      const el = document.getElementById(id) as HTMLElement; if (el) el.style.width = w + '%';
    };
    set('stat-level', me.level);
    set('stat-hp-text', `${me.hp}/${me.maxHp}`);
    set('stat-mp-text', `${me.mp}/${me.maxMp}`);
    set('stat-gold', me.gold);
    set('stat-tokens', `${me.gachaTokensToday ?? 0}/3`);
    setW('stat-hp-fill', me.maxHp ? (me.hp / me.maxHp) * 100 : 0);
    setW('stat-mp-fill', me.maxMp ? (me.mp / me.maxMp) * 100 : 0);

    // Target HP also live-update
    if (this.targetInfo) {
      const monster = (NetClient.inst.worldRoom?.state as any)?.monsters?.get(this.targetInfo.id);
      if (monster) {
        this.targetInfo.hp = monster.hp;
        this.targetInfo.maxHp = monster.maxHp;
        this.renderTargetInfo();
      } else {
        this.targetInfo = null;
        this.renderTargetInfo();
      }
    }
  }

  private static renderTargetInfo() {
    const div = document.getElementById('hud-target-info');
    if (!div) return;
    if (!this.targetInfo) { div.style.display = 'none'; return; }
    div.style.display = 'block';
    const nm = document.getElementById('target-name'); if (nm) nm.textContent = this.targetInfo.name;
    const hp = document.getElementById('target-hp'); if (hp) hp.textContent = `HP ${this.targetInfo.hp}/${this.targetInfo.maxHp}`;
  }

  private static appendChatMsg(msg: any) {
    const box = document.getElementById('hud-chat-messages'); if (!box) return;
    const div = document.createElement('div');
    div.className = 'hud-chat-msg';
    const channelTag = msg.channel === 'guild' ? '[학급]' : msg.channel === 'whisper' ? '[귓속말]' : '';
    div.innerHTML = `<span class="from">${channelTag}${escapeHtml(msg.from)}:</span><span>${escapeHtml(msg.text)}</span>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    // Limit to 50 messages
    while (box.children.length > 50) box.removeChild(box.firstChild!);
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
