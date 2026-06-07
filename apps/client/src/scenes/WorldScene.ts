import Phaser from 'phaser';
import { getStateCallbacks } from 'colyseus.js';
import { NetClient } from '../network/ColyseusClient.js';
import { TILE_SIZE } from 'shared';
import { AudioManager } from '../systems/AudioManager.js';
import { Wordbook } from '../ui/WordbookModal.js';
import { ALL_MAPS } from '../data/maps/index.js';
import { ALL_NPCS } from '../data/npcs.js';

interface PlayerSprite {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  isMe: boolean;
  lastX: number;
  lastY: number;
  classId: string;
  dir: number;
  walkFrame: number;
  lastWalkAt: number;
  lastFrameAt: number;
  lastDustAt: number;
}

// Map 8-direction index → 3 walk-atlas rows (front/side/back) + flipX
// Used by P10 walk atlases (4×3 grid: row1=front, row2=side facing right, row3=back)
function dirToWalkRow(dir: number): { row: 'front' | 'side' | 'back'; flipX: boolean } {
  switch (dir) {
    case 0: return { row: 'front', flipX: false }; // S
    case 1: return { row: 'front', flipX: false }; // SE
    case 7: return { row: 'front', flipX: true };  // SW (mirror front)
    case 2: return { row: 'side',  flipX: false }; // E
    case 3: return { row: 'side',  flipX: false }; // NE (use side; close enough)
    case 6: return { row: 'side',  flipX: true };  // W
    case 5: return { row: 'side',  flipX: true };  // NW
    case 4: return { row: 'back',  flipX: false }; // N
    default: return { row: 'front', flipX: false };
  }
}

// 8-direction frame index (matches codex 4×2 atlas: row1=s/se/e/ne, row2=n/nw/w/sw)
function dirToFrame(dx: number, dy: number): number {
  if (dy > 0 && dx === 0) return 0;  // s
  if (dy > 0 && dx > 0) return 1;    // se
  if (dy === 0 && dx > 0) return 2;  // e
  if (dy < 0 && dx > 0) return 3;    // ne
  if (dy < 0 && dx === 0) return 4;  // n
  if (dy < 0 && dx < 0) return 5;    // nw
  if (dy === 0 && dx < 0) return 6;  // w
  if (dy > 0 && dx < 0) return 7;    // sw
  return -1; // idle
}

// NPC id → atlas frame index (matches codex aurora_town atlas order)
const AURORA_NPC_FRAME: Record<string, number> = {
  npc_aurora_merchant_lina: 0,
  npc_aurora_smith_dorgan: 1,
  npc_aurora_priest_mirelle: 2,
  npc_aurora_quest_baren: 3,
  npc_aurora_innkeeper_haru: 4,
  npc_aurora_guard_kael: 5,
  npc_aurora_guard_renn: 6,
  npc_aurora_bard_seon: 7,
  npc_aurora_banker_milos: 8,
  npc_aurora_scholar_aleth: 9,
  npc_aurora_transformer_vael: 10,
  npc_aurora_gacha_selevis: 11,
};

// Role-based atlas frame index for non-Aurora towns (8-frame atlases)
function npcFrameForRole(id: string): number {
  if (id.includes('merchant')) return 0;
  if (id.includes('smith')) return 1;
  if (id.includes('priest') || id.includes('healer')) return 2;
  if (id.includes('quest') || id.includes('chief') || id.includes('marshal') || id.includes('chancellor') || id.includes('skylord') || id.includes('warden') || id.includes('oracle')) return 3;
  if (id.includes('innkeeper')) return 4;
  if (id.includes('guard') || id.includes('captain')) return 5;
  if (id.includes('bard') || id.includes('hunter') || id.includes('scholar') || id.includes('monk') || id.includes('cleric')) return 6;
  return 7; // banker / auctioneer / transformer / gacha / rune / engineer / etc.
}

function npcAtlasPrefixForMap(mapId: string): string | null {
  if (mapId.startsWith('aurora_town')) return null; // uses AURORA_NPC_FRAME
  if (mapId.startsWith('treeshade')) return 'npc_treeshade';
  if (mapId.startsWith('crimson')) return 'npc_crimson';
  if (mapId.startsWith('verity')) return 'npc_verity';
  if (mapId.startsWith('starhaven')) return 'npc_starhaven';
  return null;
}
interface MonsterSprite {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  selectionRing?: Phaser.GameObjects.Image;
}
interface DropSprite { container: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image; }

export class WorldScene extends Phaser.Scene {
  private players = new Map<string, PlayerSprite>();
  private monsters = new Map<string, MonsterSprite>();
  private drops = new Map<string, DropSprite>();
  private myCharId = '';
  private myPlayer: PlayerSprite | null = null;
  private selectedMonsterId: string | null = null;
  private mapWidth = 60;
  private mapHeight = 60;
  private tileLayer!: Phaser.GameObjects.Container;
  private heldKeys = new Set<string>();
  private tapMarker!: Phaser.GameObjects.Image;
  private lastQuizPrompt: any = null;
  private walkTarget: { tx: number; ty: number } | null = null;
  private lastMoveSentAt = 0;
  private lastSeenPos = { x: -1, y: -1, t: 0 };
  private lastPortalSentAt = 0;
  private lastPortalId = '';

  constructor() { super({ key: 'WorldScene' }); }

  create() {
    const charPayload = JSON.parse(sessionStorage.getItem('rwc-char') ?? '{}');
    this.myCharId = charPayload.charId ?? '';

    // Defensive: clear any stale sprite refs from previous scene incarnation
    this.players.clear();
    this.monsters.clear();
    this.drops.clear();
    this.myPlayer = null;
    this.walkTarget = null;
    this.lastSeenPos = { x: -1, y: -1, t: 0 };

    this.cameras.main.setBackgroundColor('#0f1218');
    this.tileLayer = this.add.container(0, 0);
    this.tapMarker = this.add.image(-1000, -1000, 'tap_target').setVisible(false);

    // Authoritative map id (synced when joinWorld succeeds; state.mapId is unreliable
    // immediately after scene.restart since Colyseus state needs a tick to populate).
    const initialMap = NetClient.inst.currentMap
      || (NetClient.inst.worldRoom?.state as any)?.mapId
      || 'aurora_town';
    // Set map dimensions from the client map def NOW — BEFORE bindNetwork's onAdd sets the
    // camera bounds. Otherwise bounds default to 60×60 and on a larger map (forgotten_meadow
    // is 100×80) the player spawns beyond the clamp (e.g. x=96) so the camera can never scroll
    // far enough to follow → the character sits off-screen and looks "invisible".
    const initialDef = ALL_MAPS[initialMap];
    if (initialDef) { this.mapWidth = initialDef.width; this.mapHeight = initialDef.height; }

    this.setupInput();
    this.bindNetwork();
    this.renderTiles(initialMap);
    this.renderScenery(initialMap);
    this.renderNPCs(initialMap);
    this.renderPortals(initialMap);
    this.applyAtmosphere(initialMap);

    // Re-assert camera bounds + follow with the FINAL map dimensions, in case onAdd ran
    // before dims were known or the local player sprite was created after the first bind.
    this.cameras.main.setBounds(0, 0, this.mapWidth * TILE_SIZE, this.mapHeight * TILE_SIZE);
    if (this.myPlayer) this.cameras.main.startFollow(this.myPlayer.container, true, 0.12, 0.12);

    // Re-bind on reconnect (server preserves state via allowReconnection)
    NetClient.inst.onReconnected = () => {
      console.log('[WorldScene] reconnected — restarting scene');
      this.scene.restart();
    };
    NetClient.inst.onDisconnected = () => {
      console.warn('[WorldScene] disconnected — attempting reconnect');
    };

    // Manual recovery button for stuck-state escape hatch
    this.installResetButton();
    // Diagnostic overlay (toggle with backtick `)
    this.installDebugOverlay();
    // Live sprite position/size tuner (🛠 button, bottom-right)
    this.installSpriteTuner();
    // If we arrived here via a map change, the veil is showing — fade it out once the
    // fresh map has been built and the first state has had a moment to sync.
    this.time.delayedCall(450, () => this.hideMapLoading());
  }

  /** Full-screen "이동 중" veil shown during a map transition (scene rebuild). */
  private showMapLoading(mapNameKo?: string) {
    let el = document.getElementById('rwc-maploading');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rwc-maploading';
      el.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:100000', 'display:flex',
        'align-items:center', 'justify-content:center', 'flex-direction:column',
        'gap:14px', 'background:#0b0d12', 'color:#FCD34D', 'transition:opacity .3s',
        'font:600 20px/1.4 Cinzel,serif',
      ].join(';');
      document.body.appendChild(el);
    }
    el.innerHTML = `<div style="font-size:34px">🗺️</div><div>${mapNameKo ? mapNameKo + ' (으)로 이동 중…' : '이동 중…'}</div>`
      + '<div style="width:140px;height:4px;background:#2a2f3a;border-radius:2px;overflow:hidden">'
      + '<div style="width:40%;height:100%;background:#C9A227;animation:rwcload 1s ease-in-out infinite"></div></div>';
    if (!document.getElementById('rwc-load-kf')) {
      const st = document.createElement('style');
      st.id = 'rwc-load-kf';
      st.textContent = '@keyframes rwcload{0%{margin-left:-40%}100%{margin-left:140%}}';
      document.head.appendChild(st);
    }
    el.style.opacity = '1';
    el.style.display = 'flex';
  }

  private hideMapLoading() {
    const el = document.getElementById('rwc-maploading');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 320);
  }

  /** Re-apply the current tunable params to every player sprite (live preview). */
  private applySpriteParams() {
    for (const sprite of this.players.values()) {
      this.setBodyTexture(sprite.body, sprite.body.texture.key); // re-trim scale + origin
      sprite.shadow.setPosition(this.shadowX, this.shadowY).setScale(this.shadowScale).setAlpha(this.shadowAlpha);
      sprite.label.setPosition(this.nameX, this.nameY);
    }
  }

  /** In-game editor to fine-tune character size, origin, and shadow offset/size.
   *  Drag sliders → live preview on your character → copy the numbers into code. */
  private installSpriteTuner() {
    if (document.getElementById('rwc-tuner')) return;
    const wrap = document.createElement('div');
    wrap.id = 'rwc-tuner';
    wrap.style.cssText = [
      'position:fixed', 'right:12px', 'bottom:96px', 'z-index:99999',
      'width:260px', 'background:rgba(10,10,15,0.94)', 'color:#FCD34D',
      'border:1px solid #C9A227', 'border-radius:10px', 'padding:10px 12px',
      'font:12px/1.5 ui-monospace,Menlo,monospace', 'display:none',
      'box-shadow:0 8px 24px rgba(0,0,0,0.5)', 'max-height:82vh', 'overflow:auto',
    ].join(';');

    type TKey = 'charDisplayH'|'charOffsetX'|'charOffsetY'|'nameX'|'nameY'|'shadowX'|'shadowY'|'shadowScale'|'shadowAlpha';
    const rows: Array<{ key: TKey; label: string; min: number; max: number; step: number; }> = [
      { key: 'charDisplayH', label: '캐릭터 크기(px)', min: 40, max: 200, step: 1 },
      { key: 'charOffsetX',  label: '캐릭터 X 위치',   min: -40, max: 40, step: 1 },
      { key: 'charOffsetY',  label: '캐릭터 Y 위치',   min: -40, max: 60, step: 1 },
      { key: 'nameX',        label: '이름 X 위치',     min: -60, max: 60, step: 1 },
      { key: 'nameY',        label: '이름 Y 위치',     min: -160, max: 10, step: 1 },
      { key: 'shadowX',      label: '그림자 X 오프셋', min: -40, max: 40, step: 1 },
      { key: 'shadowY',      label: '그림자 Y 오프셋', min: -30, max: 40, step: 1 },
      { key: 'shadowScale',  label: '그림자 크기',      min: 0.20, max: 2.60, step: 0.01 },
      { key: 'shadowAlpha',  label: '그림자 투명도',    min: 0.0, max: 1.0, step: 0.01 },
    ];

    let html = '<div style="font-weight:bold;margin-bottom:6px">🛠 스프라이트 편집기</div>';
    for (const r of rows) {
      html += `<label style="display:block;margin:6px 0 2px">${r.label}: <span id="rwc-v-${r.key}">${this[r.key]}</span></label>`;
      html += `<input id="rwc-s-${r.key}" type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${this[r.key]}" style="width:100%">`;
    }
    html += '<div style="margin-top:8px;display:flex;gap:6px">'
      + '<button id="rwc-copy" style="flex:1;background:#2A1810;color:#FCD34D;border:1px solid #C9A227;border-radius:6px;padding:4px;cursor:pointer">📋 값 복사</button>'
      + '<button id="rwc-reset" style="background:#2A1810;color:#FCD34D;border:1px solid #C9A227;border-radius:6px;padding:4px 8px;cursor:pointer">↺</button>'
      + '</div>';
    html += '<div id="rwc-code" style="margin-top:6px;white-space:pre-wrap;color:#9CA3AF;font-size:11px"></div>';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    // Floating toggle button
    const btn = document.createElement('button');
    btn.textContent = '🛠';
    btn.title = '스프라이트 편집기';
    btn.style.cssText = [
      'position:fixed', 'right:12px', 'bottom:56px', 'z-index:99999',
      'width:36px', 'height:36px', 'border-radius:50%', 'cursor:pointer',
      'background:rgba(10,10,15,0.92)', 'color:#FCD34D', 'border:1px solid #C9A227',
      'font-size:18px',
    ].join(';');
    btn.onclick = () => { wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none'; };
    document.body.appendChild(btn);

    // Live direction readout (updated each frame in tickPlayerAnimations)
    const dirBox = document.createElement('div');
    dirBox.id = 'rwc-dir';
    dirBox.style.cssText = 'margin-top:8px;padding:6px;background:#05070b;border:1px solid #2a2f3a;border-radius:6px;color:#7DD3FC;font-size:12px';
    dirBox.textContent = '방향: (걸어보세요)';
    wrap.appendChild(dirBox);

    const defaults: Record<TKey, number> = {
      charDisplayH: this.charDisplayH,
      charOffsetX: this.charOffsetX, charOffsetY: this.charOffsetY,
      nameX: this.nameX, nameY: this.nameY,
      shadowX: this.shadowX, shadowY: this.shadowY,
      shadowScale: this.shadowScale, shadowAlpha: this.shadowAlpha,
    };
    const codeBox = wrap.querySelector('#rwc-code') as HTMLElement;
    const refresh = () => {
      for (const r of rows) {
        const v = wrap.querySelector(`#rwc-v-${r.key}`) as HTMLElement;
        if (v) v.textContent = String(this[r.key]);
      }
      codeBox.textContent =
        `charDisplayH=${this.charDisplayH}\n` +
        `charOffsetX=${this.charOffsetX}\ncharOffsetY=${this.charOffsetY}\n` +
        `nameX=${this.nameX}\nnameY=${this.nameY}\n` +
        `shadowX=${this.shadowX}\nshadowY=${this.shadowY}\n` +
        `shadowScale=${this.shadowScale}\nshadowAlpha=${this.shadowAlpha}`;
    };
    for (const r of rows) {
      const s = wrap.querySelector(`#rwc-s-${r.key}`) as HTMLInputElement;
      s.oninput = () => {
        (this[r.key] as number) = parseFloat(s.value);
        this.applySpriteParams();
        refresh();
      };
    }
    const copyBtn = wrap.querySelector('#rwc-copy') as HTMLButtonElement;
    copyBtn.onclick = () => {
      const txt = codeBox.textContent || '';
      // Robust copy: clipboard API can silently fail off https → textarea fallback.
      try { navigator.clipboard?.writeText(txt); } catch { /* ignore */ }
      try {
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy'); ta.remove();
      } catch { /* ignore */ }
      const old = copyBtn.textContent;
      copyBtn.textContent = '✓ 복사됨!';
      setTimeout(() => { copyBtn.textContent = old; }, 1200);
    };
    (wrap.querySelector('#rwc-reset') as HTMLButtonElement).onclick = () => {
      Object.assign(this, defaults);
      for (const r of rows) {
        (wrap.querySelector(`#rwc-s-${r.key}`) as HTMLInputElement).value = String(this[r.key]);
      }
      this.applySpriteParams();
      refresh();
    };
    refresh();
    this.events.once('shutdown', () => { wrap.remove(); btn.remove(); });
  }

  private installDebugOverlay() {
    const existing = document.getElementById('rwc-debug');
    if (existing) existing.remove();
    const panel = document.createElement('div');
    panel.id = 'rwc-debug';
    panel.style.cssText = `
      position: fixed; top: 8px; left: 8px; z-index: 9999;
      background: rgba(10,10,15,0.92); color: #FCD34D;
      border: 1px solid #C9A227; padding: 8px 10px; border-radius: 4px;
      font: 11px/1.5 'Menlo', monospace; min-width: 240px;
      pointer-events: none; display: none; white-space: pre;`;
    document.body.appendChild(panel);

    const tickKey = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
    };
    document.addEventListener('keydown', tickKey);

    const ticker = setInterval(() => {
      if (panel.style.display === 'none') return;
      const net = NetClient.inst;
      const now = Date.now();
      const sinceSend = net.lastSendAt ? `${now - net.lastSendAt}ms` : '—';
      const sinceState = net.lastStateAt ? `${now - net.lastStateAt}ms` : '—';
      const ws = net.wsReadyState;
      const wsTxt = ws === 0 ? 'CONNECTING' : ws === 1 ? 'OPEN' : ws === 2 ? 'CLOSING' : ws === 3 ? 'CLOSED' : '?';
      const me = (net.worldRoom?.state as any)?.players?.get(this.myCharId);
      const inQuiz = me?.isInQuiz ?? false;
      const ping = net.pingRttMs >= 0 ? `${net.pingRttMs}ms` : '—';
      const map = net.currentMap || '—';
      panel.textContent =
        `RWC DEBUG (\` to toggle)\n` +
        `WS:        ${wsTxt}\n` +
        `Ping RTT:  ${ping}\n` +
        `Last send: ${sinceSend} (${net.lastSendType || '—'})\n` +
        `Last sync: ${sinceState}\n` +
        `Map:       ${map}\n` +
        `Pos:       ${me ? `${me.x}, ${me.y}` : '—'}\n` +
        `In Quiz:   ${inQuiz ? 'YES — Esc to cancel' : 'no'}\n` +
        `Reconns:   ${net.reconnectCount}`;
    }, 250);

    this.events.once('shutdown', () => {
      clearInterval(ticker);
      document.removeEventListener('keydown', tickKey);
      panel.remove();
    });
  }

  private installResetButton() {
    const existing = document.getElementById('rwc-reset-btn');
    if (existing) existing.remove();
    const btn = document.createElement('button');
    btn.id = 'rwc-reset-btn';
    btn.textContent = '⟲ 재접속';
    btn.style.cssText = `
      position: fixed; top: 8px; right: 320px; z-index: 9999;
      background: #2A1810; color: #FCD34D; border: 1px solid #C9A227;
      padding: 6px 10px; border-radius: 4px; cursor: pointer;
      font: 12px Cinzel, serif; opacity: 0.85;
      display: none;`;
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = '⟳ 재접속중…';
      try { await NetClient.inst.forceReconnect(); }
      catch (e) { console.warn(e); }
      finally { btn.disabled = false; btn.textContent = '⟲ 재접속'; }
    };
    document.body.appendChild(btn);
    // Auto-show only if WS goes down for >12s (user said: stop showing reconnect noise)
    let hiddenSince = Date.now();
    const watcher = setInterval(() => {
      const room = NetClient.inst.worldRoom;
      const me = (room?.state as any)?.players?.get(this.myCharId);
      if (room && me) { hiddenSince = Date.now(); btn.style.display = 'none'; return; }
      if (Date.now() - hiddenSince > 12000) btn.style.display = 'inline-block';
    }, 2000);
    this.events.once('shutdown', () => { clearInterval(watcher); btn.remove(); });
  }

  private bindNetwork() {
    const room = NetClient.inst.worldRoom;
    if (!room) return;
    const $ = getStateCallbacks(room);

    // STATE: players added/removed
    $(room.state).players.onAdd((player: any, key: string) => {
      const sprite = this.makePlayerSprite(player, key === this.myCharId);
      this.players.set(key, sprite);
      if (key === this.myCharId) {
        this.myPlayer = sprite;
        this.cameras.main.startFollow(sprite.container, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, this.mapWidth * TILE_SIZE, this.mapHeight * TILE_SIZE);
      }
      // Position + 8-dir walk frame — tween-smooth between tile snaps to avoid jerk
      $(player).onChange(() => {
        const dx = Math.sign(player.x - sprite.lastX);
        const dy = Math.sign(player.y - sprite.lastY);
        const targetX = player.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = player.y * TILE_SIZE + TILE_SIZE / 2;
        // Big jumps (teleport / map change / desync >3 tiles) — snap, no tween
        const jumpDist = Math.hypot(targetX - sprite.container.x, targetY - sprite.container.y);
        this.tweens.killTweensOf(sprite.container);
        if (jumpDist > TILE_SIZE * 3) {
          sprite.container.setPosition(targetX, targetY);
        } else {
          this.tweens.add({
            targets: sprite.container,
            x: targetX, y: targetY,
            duration: 110, ease: 'Linear',
          });
        }
        const dir = dirToFrame(dx, dy);
        if (dir >= 0) {
          sprite.dir = dir;
          sprite.lastWalkAt = this.time.now;
        }
        sprite.lastX = player.x;
        sprite.lastY = player.y;
        // Persist last known position for resilient reconnect
        if (key === this.myCharId) {
          NetClient.inst.lastKnownPos = {
            x: player.x, y: player.y,
            map: NetClient.inst.currentMap,
          };
        }
      });
    });
    $(room.state).players.onRemove((_player: any, key: string) => {
      const s = this.players.get(key);
      s?.container.destroy();
      this.players.delete(key);
    });

    // STATE: monsters
    $(room.state).monsters.onAdd((m: any, key: string) => {
      const sprite = this.makeMonsterSprite(m, key);
      this.monsters.set(key, sprite);
      $(m).onChange(() => {
        const tx = m.x * TILE_SIZE + TILE_SIZE/2;
        const ty = m.y * TILE_SIZE + TILE_SIZE/2;
        const jump = Math.hypot(tx - sprite.container.x, ty - sprite.container.y);
        this.tweens.killTweensOf(sprite.container);
        if (jump > TILE_SIZE * 3) sprite.container.setPosition(tx, ty);
        else this.tweens.add({ targets: sprite.container, x: tx, y: ty, duration: 200, ease: 'Linear' });
        if (m.aiState === 'dead') {
          this.tweens.add({
            targets: sprite.container,
            alpha: 0, scaleX: 0.5, scaleY: 0.5,
            duration: 300,
            onComplete: () => sprite.container.destroy(),
          });
        }
      });
    });
    $(room.state).monsters.onRemove((_m: any, key: string) => {
      const s = this.monsters.get(key);
      s?.container.destroy();
      this.monsters.delete(key);
      if (this.selectedMonsterId === key) {
        this.selectedMonsterId = null;
        this.events.emit('hud:target_cleared');
      }
    });

    // STATE: drops
    $(room.state).drops.onAdd((d: any, key: string) => {
      const c = this.add.container(d.x * TILE_SIZE + TILE_SIZE/2, d.y * TILE_SIZE + TILE_SIZE/2);
      const body = this.add.image(0, 0, 'drop_marker').setScale(1.5);
      c.add(body);
      this.tweens.add({ targets: body, y: -3, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
      this.drops.set(key, { container: c, body });
      AudioManager.playSfx('pickup');
    });
    $(room.state).drops.onRemove((_d: any, key: string) => {
      const s = this.drops.get(key);
      s?.container.destroy();
      this.drops.delete(key);
    });

    // Messages
    room.onMessage('damage_dealt', (msg: any) => {
      this.spawnDamageNumber(msg);
      AudioManager.playSfx('hit');
      // Play 4-frame attack animation on the attacker (if it's a player we know)
      const attacker = this.players.get(msg.sourceId);
      if (attacker && this.textures.exists(`char_${attacker.classId}_atk_0`)) {
        this.playAttackAnimation(attacker);
      }
    });
    room.onMessage('monster_killed', (_msg: any) => {
      this.cameras.main.shake(80, 0.004);
      AudioManager.playSfx('monster_die');
    });
    room.onMessage('level_up', (msg: any) => {
      if (msg.characterId === this.myCharId) {
        this.events.emit('hud:toast', { text: `레벨업! Lv.${msg.newLevel}`, kind: 'success' });
        this.cameras.main.flash(400, 212, 168, 87);
        AudioManager.playSfx('level_up');
      }
    });
    room.onMessage('quiz_prompt', (msg: any) => {
      this.lastQuizPrompt = msg.prompt;
      Wordbook.trackPrompt(msg.prompt);
      // Stop any pending auto-walk + held keys so the character doesn't keep walking
      // (and end up far away / "teleported") while the quiz modal is open.
      this.walkTarget = null;
      this.input.keyboard?.resetKeys();
      this.events.emit('quiz:prompt', msg.prompt);
    });
    room.onMessage('quiz_result', (msg: any) => {
      Wordbook.trackResult(msg.result, this.lastQuizPrompt);
      AudioManager.playSfx(msg.result.correct ? 'correct' : 'wrong');
      this.events.emit('quiz:result', msg.result);
    });
    room.onMessage('inventory_update', (msg: any) => {
      this.events.emit('inventory:update', msg.entries);
    });
    room.onMessage('chat_message', (msg: any) => {
      this.events.emit('chat:message', msg.message);
    });
    room.onMessage('system_msg', (msg: any) => {
      this.events.emit('hud:toast', { text: msg.text_ko, kind: msg.severity });
    });
    room.onMessage('npc_dialog', (msg: any) => {
      this.events.emit('hud:npc_dialog', msg);
    });
    room.onMessage('gacha_challenge_prompt', (msg: any) => {
      this.events.emit('gacha:prompt', msg);
    });
    room.onMessage('gacha_challenge_result', (msg: any) => {
      this.events.emit('gacha:result', msg);
    });
    room.onMessage('gacha_box_result', (msg: any) => {
      const rarity = msg.result?.rolledItems?.[0]?.rarity ?? 'common';
      AudioManager.playSfx(rarity === 'legendary' || rarity === 'unique' ? 'gacha_rare' : 'gacha_open');
      this.events.emit('gacha:box_result', msg.result);
    });
    room.onMessage('quiz_lock_warn', (msg: any) => {
      // Server is silently rejecting moves because a quiz is still pending.
      // Surface it once so the user isn't confused by frozen movement.
      const lastWarn = (this as any)._lastQuizWarn ?? 0;
      const now = Date.now();
      if (now - lastWarn > 4000) {
        (this as any)._lastQuizWarn = now;
        this.events.emit('hud:toast', { text: '퀴즈 응답 중이라 이동할 수 없습니다 (Esc로 취소)', kind: 'warn' });
      }
    });
    room.onMessage('change_map_request', (msg: any) => {
      // Show a loading veil so the scene rebuild doesn't flash like an error.
      this.showMapLoading(msg.targetMapNameKo);
      // Reconnect to new map room, spawning at the portal exit coordinates
      NetClient.inst.joinWorld(msg.targetMap, { x: msg.x, y: msg.y }).then(() => {
        this.scene.restart();
      });
    });
    room.onMessage('enchant_result', (msg: any) => {
      AudioManager.playSfx(msg.success ? 'enchant_ok' : 'enchant_fail');
      this.events.emit('hud:enchant_result', msg);
    });
  }

  private setupInput() {
    // Click on tile = move; click on monster = attack
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const tx = Math.floor(wp.x / TILE_SIZE);
      const ty = Math.floor(wp.y / TILE_SIZE);

      // Show tap marker
      this.tapMarker.setPosition(tx * TILE_SIZE + TILE_SIZE/2, ty * TILE_SIZE + TILE_SIZE/2)
        .setVisible(true).setAlpha(1);
      this.tweens.add({ targets: this.tapMarker, alpha: 0, duration: 600 });

      // Was a monster clicked?
      let target: { id: string; sprite: MonsterSprite } | null = null;
      for (const [key, sprite] of this.monsters.entries()) {
        const m = (NetClient.inst.worldRoom?.state as any).monsters.get(key);
        if (m && m.x === tx && m.y === ty && m.aiState !== 'dead') {
          target = { id: key, sprite };
          break;
        }
      }
      if (target) {
        this.selectedMonsterId = target.id;
        const m = (NetClient.inst.worldRoom?.state as any).monsters.get(target.id);
        this.events.emit('hud:target_selected', { id: target.id, name: m?.displayNameKo, hp: m?.hp, maxHp: m?.maxHp });
        // Within attack range?
        if (this.myPlayer) {
          const me = (NetClient.inst.worldRoom?.state as any).players.get(this.myCharId);
          if (me) {
            const dx = Math.abs(me.x - m.x);
            const dy = Math.abs(me.y - m.y);
            if (dx + dy <= 5) {
              NetClient.inst.send('attack', { targetId: target.id });
              AudioManager.playSfx('attack');
              if (this.myPlayer) this.playAttackAnimation(this.myPlayer);
              return;
            }
          }
        }
      }
      // Otherwise: continuous walk to clicked tile (multi-step until reached)
      this.walkTarget = { tx, ty };
    });

    // Movement keys tracked via NATIVE keydown/keyup (Phaser's isDown can get "stuck"
    // when a keyup is dropped during focus changes → character walks on its own). We
    // ignore keys while typing in the chat box, and clear everything on focus loss.
    const typingInField = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (typingInField()) return;
      this.heldKeys.add(e.code);
      // Stop arrow keys / space from scrolling the page.
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space') this.attackNearest();
    };
    const onKeyUp = (e: KeyboardEvent) => this.heldKeys.delete(e.code);
    const resetKeys = () => { this.heldKeys.clear(); this.input.keyboard?.resetKeys(); this.walkTarget = null; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', resetKeys);
    document.addEventListener('visibilitychange', () => { if (document.hidden) resetKeys(); });
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', resetKeys);
    });

    this.events.on('update', () => {
      const now = this.time.now;
      // Portal entry check runs every frame (cheap), independent of move throttle
      this.tickPortalCheck(now);
      if (now - this.lastMoveSentAt < 120) return;
      const me = (NetClient.inst.worldRoom?.state as any)?.players?.get(this.myCharId);
      if (!me) {
        // Tolerant watchdog: only restart if "me" is missing for an extreme duration
        // (30s) AND the WS room itself is gone. False positives during normal Render
        // lag previously caused respawn loops.
        if (this.lastSeenPos.t === 0) this.lastSeenPos.t = now;
        const gone = !NetClient.inst.worldRoom;
        if (gone && now - this.lastSeenPos.t > 30000) {
          console.warn('[WorldScene] room gone for 30s — soft reconnect');
          this.lastSeenPos.t = 0;
          NetClient.inst.forceReconnect().catch(() => {});
        }
        return;
      }

      // Track position changes for slide-around logic
      const positionChanged = this.lastSeenPos.x !== me.x || this.lastSeenPos.y !== me.y;
      if (positionChanged) {
        this.lastSeenPos = { x: me.x, y: me.y, t: now };
      }

      let dx = 0, dy = 0;
      // Keyboard takes precedence and cancels click-to-walk
      const h = this.heldKeys;
      const kbX = (h.has('KeyA') || h.has('ArrowLeft')) ? -1 : (h.has('KeyD') || h.has('ArrowRight')) ? 1 : 0;
      const kbY = (h.has('KeyW') || h.has('ArrowUp')) ? -1 : (h.has('KeyS') || h.has('ArrowDown')) ? 1 : 0;
      if (kbX !== 0 || kbY !== 0) {
        this.walkTarget = null;
        dx = kbX; dy = kbY;
      } else if (this.walkTarget) {
        if (this.walkTarget.tx === me.x && this.walkTarget.ty === me.y) {
          this.walkTarget = null;
        } else {
          // Direct step toward target. If stuck (no progress 600ms), slide along single axis.
          const stuckMs = now - this.lastSeenPos.t;
          const wantX = Math.sign(this.walkTarget.tx - me.x);
          const wantY = Math.sign(this.walkTarget.ty - me.y);
          if (stuckMs < 600) {
            dx = wantX; dy = wantY;
          } else if (stuckMs < 1200) {
            // Try X-only slide
            dx = wantX; dy = 0;
            if (dx === 0) { dx = 0; dy = wantY; }
          } else if (stuckMs < 1800) {
            // Try Y-only slide
            dx = 0; dy = wantY;
            if (dy === 0) { dx = wantX; dy = 0; }
          } else {
            // Truly stuck — give up
            this.walkTarget = null;
          }
        }
      }
      if (dx !== 0 || dy !== 0) {
        NetClient.inst.send('move', { tx: me.x + dx, ty: me.y + dy });
        this.lastMoveSentAt = now;
      }
      // NOTE: removed auto-reconnect watchdog — false positives during normal Render lag
      // were triggering reconnects → server respawned player at STARTING (on fountain) →
      // felt like the game reset every few moves. Reconnect is now manual (재접속 button)
      // OR explicit on Colyseus onLeave (real disconnect, not heuristic).
    });

    // Sprite walk-frame cycling (per-player) — 4 frames @ 150ms = full step every 600ms
    this.events.on('update', () => this.tickPlayerAnimations());
  }

  /** Per-biome cinematic atmosphere — postFX, ambient particles, color grading. */
  private applyAtmosphere(mapId: string) {
    const cam = this.cameras.main;
    // Biome → palette + ambient
    type Biome = {
      bg: number; tint: [number, number, number, number];
      vignette: number; bloom: number; particle?: 'mote' | 'ash' | 'snow';
      particleTint: number; particleAlpha: number; ambientLightColor?: number;
    };
    // Toned-down values — bloom + vignette were too aggressive (color smearing).
    // Goal: subtle cinematic depth, NOT washed-out fog. Bloom now <0.4 max.
    // Daylight pass. NOTE: `vignette` here is the RADIUS of the lit area passed to
    // addVignette(x,y,RADIUS,strength) — bigger = more of the screen is bright.
    const town: Biome = {
      bg: 0x6E8A66, tint: [1.0, 1.0, 1.0, 1.0], vignette: 0.95,
      bloom: 0.12, particle: 'mote', particleTint: 0xFCD34D, particleAlpha: 0.18,
    };
    const cave: Biome = {
      bg: 0x1A1E26, tint: [1.0, 1.0, 1.0, 1.0], vignette: 0.7,
      bloom: 0.1, particle: 'mote', particleTint: 0x9CA3AF, particleAlpha: 0.15,
    };
    const ruin: Biome = {
      bg: 0x3A3F48, tint: [1.0, 1.0, 1.0, 1.0], vignette: 0.9,
      bloom: 0.12, particle: 'ash', particleTint: 0xCBD5E1, particleAlpha: 0.16,
    };
    const fire: Biome = {
      bg: 0x4A2418, tint: [1.0, 1.0, 1.0, 1.0], vignette: 0.85,
      bloom: 0.22, particle: 'ash', particleTint: 0xF59E0B, particleAlpha: 0.25,
    };
    const ice: Biome = {
      bg: 0x33506E, tint: [1.0, 1.0, 1.0, 1.0], vignette: 0.95,
      bloom: 0.15, particle: 'snow', particleTint: 0xE0F2FE, particleAlpha: 0.3,
    };
    const field: Biome = {
      bg: 0x4E6E44, tint: [1.0, 1.0, 1.0, 1.0], vignette: 0.95,
      bloom: 0.12, particle: 'mote', particleTint: 0xCFE9A8, particleAlpha: 0.16,
    };
    const aether: Biome = {
      bg: 0x3A2860, tint: [1.0, 1.0, 1.0, 1.0], vignette: 0.85,
      bloom: 0.26, particle: 'mote', particleTint: 0xC084FC, particleAlpha: 0.3,
    };
    const biome: Biome =
      mapId.includes('cave') || mapId.includes('mine') || mapId.includes('caverns') ? cave
      : mapId.includes('citadel') || mapId.includes('temple') || mapId.includes('ruined') ? ruin
      : mapId.includes('pyre') || mapId.includes('drake') || mapId.includes('fortress') ? fire
      : mapId.includes('whisper') || mapId.includes('mistwail') ? ice
      : mapId.includes('aether') || mapId.includes('rift') ? aether
      : mapId.includes('town') || mapId.includes('haven') ? town
      : field;
    cam.setBackgroundColor(biome.bg);
    // Subtle vignette only (bloom was smearing colors). PostFX-tolerant Phaser 3.60+.
    try {
      const fx = (cam as any).postFX;
      fx?.clear();
      fx?.addVignette(0.5, 0.5, biome.vignette, 0.2);
      // Bloom kept very low — at <0.35 it adds depth without color bleed.
      if (biome.bloom > 0.05) fx?.addBloom(0xFFFFFF, 1.0, 1.0, 1.0, biome.bloom, 2);
    } catch { /* postFX unsupported */ }
    // Ambient particles (motes/ash/snow) — drift across viewport
    const W = this.mapWidth * TILE_SIZE;
    const H = this.mapHeight * TILE_SIZE;
    if (biome.particle) {
      const isSnow = biome.particle === 'snow';
      const isAsh = biome.particle === 'ash';
      const emitter = this.add.particles(0, 0, 'fx_glow', {
        x: { min: 0, max: W },
        y: { min: 0, max: H },
        scale: { start: 0.18, end: 0.05 },
        alpha: { start: biome.particleAlpha, end: 0 },
        speed: isSnow ? { min: 8, max: 22 } : isAsh ? { min: 6, max: 16 } : { min: 2, max: 8 },
        angle: isSnow ? { min: 80, max: 100 } : isAsh ? { min: 70, max: 110 } : { min: 0, max: 360 },
        lifespan: { min: 6000, max: 10000 },
        quantity: 1,
        frequency: 280,
        tint: biome.particleTint,
        blendMode: Phaser.BlendModes.ADD,
      });
      emitter.setDepth(150);
      this.events.once('shutdown', () => emitter.destroy());
    }
    // Fountain/sun radial glow at fountain in town
    if (mapId.includes('town') || mapId.includes('haven')) {
      const cx = Math.floor(this.mapWidth / 2) * TILE_SIZE + TILE_SIZE / 2;
      const cy = Math.floor(this.mapHeight / 2) * TILE_SIZE + TILE_SIZE / 2;
      const halo = this.add.image(cx, cy, 'fx_glow').setScale(8).setAlpha(0.25)
        .setBlendMode(Phaser.BlendModes.ADD).setTint(0xFCD34D).setDepth(2);
      this.tweens.add({ targets: halo, scale: 9.5, alpha: 0.35, yoyo: true, repeat: -1, duration: 2400, ease: 'Sine.inOut' });
      this.events.once('shutdown', () => halo.destroy());
      // Subtle water sparkle particles around fountain
      const sparkle = this.add.particles(cx, cy, 'fx_sparkle', {
        x: { min: -64, max: 64 },
        y: { min: -56, max: 24 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.9, end: 0 },
        speed: { min: 10, max: 30 },
        angle: { min: 240, max: 300 },
        lifespan: 1400,
        quantity: 1,
        frequency: 180,
        tint: 0xBFDBFE,
        blendMode: Phaser.BlendModes.ADD,
      });
      sparkle.setDepth(8);
      this.events.once('shutdown', () => sparkle.destroy());
    }
  }

  /** Spawn a small dust puff at the player's feet — called from animation tick. */
  private spawnFootstepDust(x: number, y: number) {
    const dust = this.add.image(x, y + 8, 'fx_dust').setScale(1).setAlpha(0.7).setDepth(50);
    this.tweens.add({
      targets: dust,
      scale: 0.4, alpha: 0, y: y + 4,
      duration: 600, ease: 'Cubic.out',
      onComplete: () => dust.destroy(),
    });
  }

  /** Detect when the local player walks into a portal AABB → fire change_map once. */
  private tickPortalCheck(now: number) {
    const room = NetClient.inst.worldRoom;
    if (!room) return;
    const me = (room.state as any)?.players?.get(this.myCharId);
    if (!me) return;
    const mapId = NetClient.inst.currentMap || (room.state as any)?.mapId;
    const map = ALL_MAPS[mapId];
    if (!map?.portals) { this.lastPortalId = ''; return; }
    let hit: any = null;
    for (const p of map.portals) {
      if (me.x >= p.x && me.x < p.x + p.w && me.y >= p.y && me.y < p.y + p.h) {
        hit = p; break;
      }
    }
    if (!hit) { this.lastPortalId = ''; return; }
    // Already sent for this portal recently? skip until player leaves and re-enters
    if (this.lastPortalId === hit.id && now - this.lastPortalSentAt < 4000) return;
    this.lastPortalId = hit.id;
    this.lastPortalSentAt = now;
    this.events.emit('hud:toast', { text: `${hit.label_ko}(으)로 이동…`, kind: 'info' });
    this.cameras.main.flash(300, 125, 211, 252);
    NetClient.inst.send('change_map', { portalId: hit.id });
  }

  private tickPlayerAnimations() {
    const now = this.time.now;
    for (const sprite of this.players.values()) {
      const cls = sprite.classId;
      const isMoving = (now - sprite.lastWalkAt) < 350;
      const { row, flipX } = dirToWalkRow(sprite.dir);
      // 3-direction ANIMATED walk cycle (front/side/back × 4 frames). The walk8 set
      // has accurate facing but only 1 static (combat-pose) frame per dir, so it looked
      // frozen / attack-like — animation matters more here.
      sprite.body.setFlipX(flipX);
      const offX = flipX ? -this.charOffsetX : this.charOffsetX;
      sprite.body.setX(offX);

      if (isMoving) {
        const phase = now / 90;
        const bounce = Math.abs(Math.sin(phase)) * -4;
        const sway = Math.sin(phase) * 0.05;
        sprite.body.setY(this.charOffsetY + bounce);
        // Sway only on the side view; up/down stay upright.
        sprite.body.setRotation(row === 'side' ? (flipX ? -sway : sway) : 0);
        if (now - sprite.lastDustAt > 280) {
          this.spawnFootstepDust(sprite.container.x, sprite.container.y);
          sprite.lastDustAt = now;
        }
        sprite.shadow.setScale(this.shadowScale - bounce * 0.03);
        sprite.shadow.setAlpha(this.shadowAlpha + bounce * 0.04);
      } else {
        sprite.body.setY(this.charOffsetY + (sprite.body.y - this.charOffsetY) * 0.7);
        sprite.body.setRotation(sprite.body.rotation * 0.7);
        sprite.shadow.setScale(this.shadowScale);
        sprite.shadow.setAlpha(this.shadowAlpha);
      }

      if (isMoving) {
        if (now - sprite.lastFrameAt > 130) {
          sprite.walkFrame = (sprite.walkFrame + 1) % 4;
          sprite.lastFrameAt = now;
        }
        const wKey = `char_${cls}_walk_${row}_${sprite.walkFrame}`;
        if (this.textures.exists(wKey)) { this.setBodyTexture(sprite.body, wKey); continue; }
        const idleKey = `char_${cls}`;
        if (this.textures.exists(idleKey)) this.setBodyTexture(sprite.body, idleKey);
      } else {
        const idleKey = `char_${cls}_walk_${row}_0`;
        if (this.textures.exists(idleKey)) { this.setBodyTexture(sprite.body, idleKey); continue; }
        const fallbackIdle = `char_${cls}`;
        if (this.textures.exists(fallbackIdle)) this.setBodyTexture(sprite.body, fallbackIdle);
      }
    }
  }

  // ── Live-tunable sprite params (tuned via the in-game 🛠 panel) ──
  private charDisplayH = 78;    // on-screen CONTENT height (px) after alpha-trim
  private charOffsetX = 0;      // body x nudge (mirrors when facing left)
  private charOffsetY = 0;      // body y nudge from the feet line
  private nameX = 3;            // name label x offset
  private nameY = -91;          // name label y offset (above the head)
  private shadowX = 0;          // shadow horizontal offset
  private shadowY = 2;          // shadow vertical offset from the feet
  private shadowScale = 1.2;    // shadow size
  private shadowAlpha = 0.75;   // shadow opacity
  // Per-texture alpha-trim cache: actual content height + feet/center ratios.
  private trimCache = new Map<string, { h: number; oy: number; ox: number }>();

  /** Measure the visible (non-transparent) bounds of a texture once, cached.
   *  h = content height px, oy = content-bottom ratio (feet), ox = content-center ratio. */
  private getTrim(key: string): { h: number; oy: number; ox: number } {
    const hit = this.trimCache.get(key);
    if (hit) return hit;
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const w = src.width || 64, h = src.height || 64;
    let res = { h, oy: 0.93, ox: 0.5 };
    try {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(src, 0, 0);
      const d = ctx.getImageData(0, 0, w, h).data;
      let minY = h, maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (d[(y * w + x) * 4 + 3] > 24) { if (y < minY) minY = y; if (y > maxY) maxY = y; break; }
        }
        for (let x = w - 1; x >= 0; x--) {
          if (d[(y * w + x) * 4 + 3] > 24) { if (y > maxY) maxY = y; break; }
        }
      }
      if (maxY >= 0) {
        // Horizontal anchor is FIXED at the frame centre (0.5). Sprite-sheet characters
        // are drawn centred, so this keeps the body planted; measuring the content's own
        // centre made a flowing cape/bow drag the anchor sideways frame-to-frame (drift).
        res = { h: maxY - minY + 1, oy: (maxY + 1) / h, ox: 0.5 };
      }
    } catch { /* CORS/decoding — keep fallback */ }
    this.trimCache.set(key, res);
    return res;
  }

  /** Swap a character body texture AND renormalize by TRIMMED content size, so the
   *  visible character stays the same height and its feet stay on the shadow across
   *  every frame (idle 256×341, side-walk 384×1024, atk 256×256, cast 256×1024). */
  private setBodyTexture(body: Phaser.GameObjects.Image, key: string) {
    body.setTexture(key);
    const t = this.getTrim(key);
    body.setOrigin(t.ox, t.oy);          // anchor at the feet (bottom-center of art)
    body.setScale(this.charDisplayH / t.h);
  }

  private makePlayerSprite(player: any, isMe: boolean): PlayerSprite {
    const c = this.add.container(player.x * TILE_SIZE + TILE_SIZE/2, player.y * TILE_SIZE + TILE_SIZE/2);
    // Soft drop shadow under the body — sells the 3D feel. Sized for the ~100px body.
    const shadow = this.add.image(this.shadowX, this.shadowY, 'fx_shadow').setScale(this.shadowScale).setAlpha(this.shadowAlpha);
    const body = this.add.image(this.charOffsetX, this.charOffsetY, `char_${player.classId}`);
    // Origin (feet) + size come from the alpha-trim — keeps every frame consistent.
    this.setBodyTexture(body, `char_${player.classId}`);
    const label = this.add.text(this.nameX, this.nameY, player.name + (isMe ? ' ✦' : ''), {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '11px',
      color: isMe ? '#FCD34D' : '#E8E1C9',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    c.add([shadow, body, label]);
    // Always keep players above the tile/scenery layer (collision rocks/trees live there).
    // "Me" sits on top of other players.
    c.setDepth(isMe ? 100 : 60);
    return {
      container: c, body, shadow, label, isMe,
      lastX: player.x, lastY: player.y,
      classId: player.classId,
      dir: 0, walkFrame: 0,
      lastWalkAt: 0, lastFrameAt: 0, lastDustAt: 0,
    };
  }

  private makeMonsterSprite(m: any, key: string): MonsterSprite {
    const c = this.add.container(m.x * TILE_SIZE + TILE_SIZE/2, m.y * TILE_SIZE + TILE_SIZE/2);
    const tier = m.isBoss ? 'boss' : m.isNamed ? 'named' : `t${m.tier ?? 1}`;
    const sizeMul = m.isBoss ? 1.8 : m.isNamed ? 1.3 : 1.0;
    // Drop shadow scaled with monster size
    const shadow = this.add.image(0, 6, 'fx_shadow').setScale(0.6 * sizeMul).setAlpha(0.6);
    const body = this.add.image(0, 0, `mon_${tier}`);
    const tex = this.textures.get(`mon_${tier}`).getSourceImage() as any;
    const w = tex?.width ?? 28;
    const baseScale = w > 64 ? 48 / w : 1.0;
    body.setScale(baseScale * sizeMul);
    body.setOrigin(0.5, 0.75);
    c.add([shadow, body]);
    if (m.isBoss) {
      // Crimson menacing aura
      const aura = this.add.image(0, 0, 'fx_glow').setScale(3.2).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD).setTint(0xE11D48);
      c.addAt(aura, 0);
      this.tweens.add({ targets: aura, scale: 3.6, alpha: 0.32, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    } else if (m.isNamed) {
      const aura = this.add.image(0, 0, 'fx_glow').setScale(2.4).setAlpha(0.16).setBlendMode(Phaser.BlendModes.ADD).setTint(0xFCD34D);
      c.addAt(aura, 0);
      this.tweens.add({ targets: aura, scale: 2.7, alpha: 0.24, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.inOut' });
    }
    return { container: c, body, shadow };
  }

  /** Attack the closest living monster within range (used by SPACE bar). */
  private attackNearest() {
    const state = NetClient.inst.worldRoom?.state as any;
    const me = state?.players?.get(this.myCharId);
    if (!me) return;
    let bestId: string | null = null;
    let bestD = 999;
    for (const [key] of this.monsters.entries()) {
      const m = state.monsters.get(key);
      if (!m || m.aiState === 'dead') continue;
      const d = Math.abs(me.x - m.x) + Math.abs(me.y - m.y);
      if (d <= 5 && d < bestD) { bestD = d; bestId = key; }
    }
    if (!bestId) return;
    const m = state.monsters.get(bestId);
    this.selectedMonsterId = bestId;
    this.events.emit('hud:target_selected', { id: bestId, name: m?.displayNameKo, hp: m?.hp, maxHp: m?.maxHp });
    NetClient.inst.send('attack', { targetId: bestId });
    AudioManager.playSfx('attack');
    if (this.myPlayer) this.playAttackAnimation(this.myPlayer);
  }

  private playAttackAnimation(sprite: PlayerSprite) {
    const cls = sprite.classId;
    const frames = [`char_${cls}_atk_0`, `char_${cls}_atk_1`, `char_${cls}_atk_2`, `char_${cls}_atk_3`];
    let i = 0;
    const tick = () => {
      if (i >= frames.length) {
        // Restore idle / walk frame
        const idleKey = `char_${cls}`;
        if (this.textures.exists(idleKey)) this.setBodyTexture(sprite.body, idleKey);
        return;
      }
      if (this.textures.exists(frames[i])) this.setBodyTexture(sprite.body, frames[i]);
      i++;
      this.time.delayedCall(80, tick);
    };
    tick();
  }

  private spawnDamageNumber(msg: any) {
    const target = this.monsters.get(msg.targetId) ?? this.players.get(msg.targetId);
    if (!target) return;
    const tx = target.container.x;
    const ty = target.container.y - 16;
    const isCrit = msg.isCrit;
    const text = this.add.text(tx, ty, String(msg.damage), {
      fontFamily: 'Cinzel, serif',
      fontSize: isCrit ? '28px' : '20px',
      color: isCrit ? '#FCD34D' : '#F87171',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({
      targets: text, y: ty - 50, alpha: 0,
      duration: 1200, ease: 'Cubic.out',
      onComplete: () => text.destroy(),
    });
  }

  private renderScenery(mapId: string) {
    const map = ALL_MAPS[mapId];
    if (!map) return;
    // Deterministic pseudo-random by map id so layout is stable per map
    const seed = Array.from(mapId).reduce((a, c) => a + c.charCodeAt(0), 0);
    let rng = seed;
    const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };
    const W = this.mapWidth, H = this.mapHeight;
    const place = (key: string, x: number, y: number, depth = 0) => {
      // Prefer codex nature/decor/prop sprites over procedural placeholders when available
      const codexMap: Record<string, string[]> = {
        'scenery_tree':    ['nature_0', 'nature_1', 'nature_3', 'nature_4'],
        'scenery_bush':    ['nature_6', 'nature_7'],
        'scenery_rock':    ['nature_9', 'nature_10', 'nature_11'],
        'scenery_lantern': ['prop_0'],
        'scenery_banner':  ['prop_7'],
      };
      let useKey = key;
      const alts = codexMap[key];
      if (alts) {
        const idx = (Math.floor(x * 23 + y * 31) % alts.length + alts.length) % alts.length;
        if (this.textures.exists(alts[idx])) useKey = alts[idx];
      }
      const img = this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, useKey)
        .setOrigin(0.5, 0.85)
        .setDepth(depth);
      // Codex sprites are large (256+px) — scale down to fit world tiles
      if (useKey.startsWith('nature_') || useKey.startsWith('prop_')) {
        const tex = this.textures.get(useKey).getSourceImage() as any;
        const w = tex?.width ?? 256;
        // Trees ~3 tiles tall, bushes/rocks ~1.5 tiles
        const target = key === 'scenery_tree' ? 96 : 56;
        img.setScale(target / w);
      }
      this.tileLayer.add(img);
    };
    const isWalkable = (x: number, y: number) => {
      const r = map.collision?.[y]?.[x];
      return r === 0 || r === undefined;
    };

    // Make every BLOCKED tile visible — collision rects were invisible walls because
    // decoration is placed randomly and never matched the collision grid. Drop a rock/
    // tree cluster on each interior blocked tile so what blocks you is what you see.
    // (Towns express their collision via the buildings rendered below, so skip them.)
    const isTown = map.is_safe_zone || mapId.includes('town') || mapId.includes('haven');
    if (map.collision && !isTown) {
      for (let yy = 1; yy < H - 1; yy++) {
        for (let xx = 1; xx < W - 1; xx++) {
          if (map.collision[yy]?.[xx] === 1) {
            const variant = (xx * 7 + yy * 13) % 5;
            place(variant < 3 ? 'scenery_rock' : 'scenery_tree', xx, yy, 1);
          }
        }
      }
    }

    if (map.is_safe_zone || mapId.includes('town') || mapId.includes('haven')) {
      // Town layout: fountain center + codex-illustrated buildings near NPCs + edge trees
      const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
      // Big fountain (uses codex bld_fountain if available, else procedural)
      const fkey = this.textures.exists('bld_fountain') ? 'bld_fountain' : 'scenery_fountain';
      const fountain = this.add.image(cx * TILE_SIZE + TILE_SIZE / 2, cy * TILE_SIZE + TILE_SIZE / 2, fkey)
        .setOrigin(0.5, 0.5).setDepth(5);
      if (fkey === 'bld_fountain') {
        const tex = this.textures.get(fkey).getSourceImage() as any;
        const w = tex?.width ?? 1024;
        // Fountain ~8 tiles wide (was 10 — too big, overlapping nearby buildings)
        fountain.setScale(8 * TILE_SIZE / w);
      }
      this.tileLayer.add(fountain);
      // Buildings: codex illustrations mapped by NPC role
      // Track placed building cells to avoid overlap (each building ~7 tiles wide × 8 tall)
      const placedBuildings: Array<{ x: number; y: number }> = [];
      // Reserve fountain area as a "placed" item so buildings can't overlap it (fountain ~10 tiles)
      placedBuildings.push({ x: cx, y: cy });
      const minBuildingX = 10; // horizontal min distance
      const minBuildingY = 8;  // vertical min distance
      for (const loc of map.npc_locations ?? []) {
        const id = loc.id;
        const codexKey = id.includes('innkeeper') ? 'bld_inn'
          : id.includes('smith') ? 'bld_smith'
          : id.includes('priest') ? 'bld_temple'
          : id.includes('banker') ? 'bld_bank'
          : id.includes('gacha') || id.includes('transformer') ? 'bld_gacha'
          : id.includes('merchant') ? 'bld_shop'
          : 'bld_house';
        const useReal = this.textures.exists(codexKey);
        const procFallback = id.includes('innkeeper') ? 'scenery_inn'
          : id.includes('priest') || id.includes('scholar') ? 'scenery_temple'
          : id.includes('merchant') || id.includes('smith') || id.includes('banker') || id.includes('gacha') ? 'scenery_shop'
          : 'scenery_house';
        const finalKey = useReal ? codexKey : procFallback;
        // Find nearest non-overlapping spot above the NPC, search in a spiral
        let bx = loc.x;
        let by = Math.max(4, loc.y - 5);
        let attempts = 0;
        const initialBx = bx;
        const initialBy = by;
        while (attempts < 24) {
          const overlap = placedBuildings.some(p =>
            Math.abs(p.x - bx) < minBuildingX && Math.abs(p.y - by) < minBuildingY
          );
          if (!overlap && bx > 4 && bx < W - 4 && by > 4 && by < H - 4) break;
          // Spiral search: alternate sides + grow radius
          const step = Math.floor(attempts / 2) + 1;
          const sign = (attempts % 2 === 0 ? 1 : -1);
          if (attempts < 12) {
            bx = initialBx + sign * step * 2; // horizontal first
            by = initialBy;
          } else {
            // After 6 horizontal attempts, also try moving up
            bx = initialBx + sign * (Math.floor((attempts - 12) / 2) + 1) * 2;
            by = Math.max(4, initialBy - 4);
          }
          attempts++;
        }
        placedBuildings.push({ x: bx, y: by });
        const img = this.add.image(bx * TILE_SIZE + TILE_SIZE / 2, by * TILE_SIZE + TILE_SIZE / 2, finalKey)
          .setOrigin(0.5, 0.85).setDepth(3);
        if (useReal) {
          const tex = this.textures.get(finalKey).getSourceImage() as any;
          const w = tex?.width ?? 1024;
          // Building ~5 tiles wide (was 6 — caused overlap; tighter spacing now)
          img.setScale(5 * TILE_SIZE / w);
        }
        // Make building interactive — click → talk to associated NPC
        img.setInteractive({ useHandCursor: true });
        img.on('pointerdown', (p: Phaser.Input.Pointer) => {
          p.event.stopPropagation();
          NetClient.inst.send('npc_interact', { npcId: id });
        });
        this.tileLayer.add(img);
      }
      // Banner pairs near town gates / center
      for (let i = 0; i < 6; i++) {
        const bx = 4 + Math.floor(rand() * (W - 8));
        const by = 4 + Math.floor(rand() * (H - 8));
        if (isWalkable(bx, by)) place('scenery_banner', bx, by, 2);
      }
      // Edge trees + bushes (decoration)
      for (let i = 0; i < 40; i++) {
        const ex = rand() < 0.5 ? Math.floor(rand() * 5) : W - 1 - Math.floor(rand() * 5);
        const ey = Math.floor(rand() * H);
        if (isWalkable(ex, ey)) place('scenery_tree', ex, ey, 2);
      }
      for (let i = 0; i < 20; i++) {
        const bx = Math.floor(rand() * W);
        const by = Math.floor(rand() * H);
        if (isWalkable(bx, by) && Math.abs(bx - cx) > 5) place('scenery_bush', bx, by, 1);
      }
    } else if (mapId.includes('cave') || mapId.includes('mine') || mapId.includes('caverns')) {
      // Cave: rocks scattered, lanterns on edges — density scales with map area.
      const area = W * H;
      const rockCount = Math.floor(area * 0.02);
      const lanternCount = Math.floor(area * 0.004);
      for (let i = 0; i < rockCount; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_rock', x, y, 1);
      }
      for (let i = 0; i < lanternCount; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_lantern', x, y, 2);
      }
    } else if (mapId.includes('citadel') || mapId.includes('temple') || mapId.includes('ruined')) {
      // Ruins: occasional pillars (use temple sprite small) + rocks — area-scaled.
      const area = W * H;
      const pillarCount = Math.floor(area * 0.008);
      const rockCount = Math.floor(area * 0.018);
      for (let i = 0; i < pillarCount; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_temple', x, y, 2);
      }
      for (let i = 0; i < rockCount; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_rock', x, y, 1);
      }
    } else {
      // Field / forest: density scales with map area so big maps aren't empty.
      const area = W * H;
      const isLush = mapId.includes('woods') || mapId.includes('grove') || mapId.includes('meadow');
      const treeCount = Math.floor(area * (isLush ? 0.045 : 0.028));
      const rockCount = Math.floor(area * 0.012);
      const bushCount = Math.floor(area * 0.032);
      for (let i = 0; i < treeCount; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_tree', x, y, 2);
      }
      for (let i = 0; i < rockCount; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_rock', x, y, 1);
      }
      for (let i = 0; i < bushCount; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_bush', x, y, 1);
      }
    }
  }

  private renderNPCs(mapId: string) {
    const map = ALL_MAPS[mapId];
    if (!map?.npc_locations) return;
    for (const loc of map.npc_locations) {
      const def = ALL_NPCS.find(n => n.id === loc.id);
      const cx = loc.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = loc.y * TILE_SIZE + TILE_SIZE / 2;
      const c = this.add.container(cx, cy);
      // Real codex NPC sprite if available — prefer v3 (P9 full-body) > v2 > v1
      let codexKey = '';
      if (mapId.startsWith('aurora_town')) {
        const f = AURORA_NPC_FRAME[loc.id];
        if (f !== undefined) {
          const v3Key = `npc_aurora_v3_${f}`;
          const v2Key = `npc_aurora_v2_${f}`;
          codexKey = this.textures.exists(v3Key) ? v3Key
                   : this.textures.exists(v2Key) ? v2Key
                   : `npc_aurora_${f}`;
        }
      } else {
        const prefix = npcAtlasPrefixForMap(mapId); // e.g. 'npc_treeshade'
        if (prefix) {
          const f = npcFrameForRole(loc.id);
          const town = prefix.replace('npc_', '');
          const v2Key = `npc_${town}_v2_${f}`;
          codexKey = this.textures.exists(v2Key) ? v2Key : `${prefix}_${f}`;
        }
      }
      const useReal = codexKey && this.textures.exists(codexKey);
      const finalKey = useReal ? codexKey : 'npc_default';
      const body = this.add.image(0, 0, finalKey).setOrigin(0.5, 0.95);
      if (useReal) {
        const tex = this.textures.get(finalKey).getSourceImage() as any;
        const w = tex?.width ?? 256;
        const h = tex?.height ?? 384;
        // For vertical cells (h > w), scale by height. ~56px tall (was 64) — leaves
        // visual headroom in case the source atlas cell baked in some cropping near edges.
        const scale = h > w * 1.1 ? 56 / h : 72 / w;
        body.setScale(scale);
      } else {
        body.setScale(1.4); // bigger placeholder circle as fallback
      }
      // Name plate
      const name = def?.name_ko ?? loc.id;
      const label = this.add.text(0, -22, '✦ ' + name, {
        fontFamily: 'Noto Sans KR, sans-serif',
        fontSize: '11px',
        color: '#FCD34D',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      // ! marker above (interaction hint)
      const hint = this.add.text(0, -38, '!', {
        fontFamily: 'Cinzel, serif',
        fontSize: '14px',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      this.tweens.add({ targets: hint, y: -42, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
      c.add([body, label, hint]);
      // Click NPC → talk
      body.setInteractive({ useHandCursor: true });
      const npcId = loc.id;
      body.on('pointerdown', (p: Phaser.Input.Pointer) => {
        p.event.stopPropagation();
        NetClient.inst.send('npc_interact', { npcId });
      });
    }
  }

  private renderPortals(mapId: string) {
    const map = ALL_MAPS[mapId];
    if (!map?.portals) return;
    for (const p of map.portals) {
      const cx = (p.x + p.w / 2) * TILE_SIZE;
      const cy = (p.y + p.h / 2) * TILE_SIZE;
      const ring = this.add.image(cx, cy, 'tap_target').setScale(2.5).setAlpha(0.6).setTint(0x7DD3FC);
      this.tweens.add({ targets: ring, alpha: 0.2, scale: 3, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.inOut' });
      const label = this.add.text(cx, cy - 30, '➤ ' + p.label_ko, {
        fontFamily: 'Cinzel, serif',
        fontSize: '13px',
        color: '#7DD3FC',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(50);
      this.tweens.add({ targets: label, y: cy - 35, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.inOut' });
    }
  }

  private renderTiles(mapId: string) {
    // Map dimensions: prefer the client map def (always available + correct) over room
    // state, which lags a tick after scene.restart and would momentarily reset to 60×60.
    const state = NetClient.inst.worldRoom?.state as any;
    const def = ALL_MAPS[mapId];
    this.mapWidth = def?.width || state?.mapWidth || 60;
    this.mapHeight = def?.height || state?.mapHeight || 60;
    // Procedural tiling: town = grass + stone roads. Field = mostly dirt.
    const tileKey = mapId.includes('town') ? 'tile_grass'
      : mapId.includes('cave') || mapId.includes('mine') ? 'tile_stone'
      : mapId.includes('citadel') || mapId.includes('temple') ? 'tile_marble'
      : mapId.includes('drake') || mapId.includes('pyre') ? 'tile_dirt'
      : 'tile_dirt';

    // Pseudo-random variant pick (deterministic per tile so layout is stable)
    const variantPick = (x: number, y: number, baseKey: string): string => {
      const h = (x * 374761393 + y * 668265263) ^ 0x9e3779b9;
      const v = ((h >>> 0) % 3);
      return v === 0 ? baseKey : `${baseKey}_v${v}`;
    };
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        let key = tileKey;
        if (mapId.includes('town')) {
          // 3-tile wide stone roads with 1-tile dirt buffer for natural transition
          const cx = Math.floor(this.mapWidth / 2);
          const cy = Math.floor(this.mapHeight / 2);
          const dx = Math.abs(x - cx);
          const dy = Math.abs(y - cy);
          if (dx <= 1 || dy <= 1) key = 'tile_stone';
          else if (dx === 2 || dy === 2) key = 'tile_dirt';
        } else if (mapId.includes('field') || mapId.includes('meadow')) {
          // Winding diagonal dirt path
          if (Math.abs((x + y) % 14 - 7) <= 1) key = 'tile_dirt';
        }
        const finalKey = variantPick(x, y, key);
        const useKey = this.textures.exists(finalKey) ? finalKey : key;
        const t = this.add.image(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, useKey);
        this.tileLayer.add(t);
      }
    }
  }
}
