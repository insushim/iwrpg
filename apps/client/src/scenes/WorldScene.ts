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
  label: Phaser.GameObjects.Text;
  isMe: boolean;
  lastX: number;
  lastY: number;
  classId: string;
  dir: number;        // last facing direction 0..7
  walkFrame: number;  // current walk-cycle frame 0..3
  lastWalkAt: number; // ms timestamp of last position change (for idle detection)
  lastFrameAt: number; // ms timestamp of last frame swap
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
  private tapMarker!: Phaser.GameObjects.Image;
  private lastQuizPrompt: any = null;
  private walkTarget: { tx: number; ty: number } | null = null;
  private lastMoveSentAt = 0;
  private lastSeenPos = { x: -1, y: -1, t: 0 };

  constructor() { super({ key: 'WorldScene' }); }

  create() {
    const charPayload = JSON.parse(sessionStorage.getItem('rwc-char') ?? '{}');
    this.myCharId = charPayload.charId ?? '';

    this.cameras.main.setBackgroundColor('#0f1218');
    this.tileLayer = this.add.container(0, 0);
    this.tapMarker = this.add.image(-1000, -1000, 'tap_target').setVisible(false);

    this.setupInput();
    this.bindNetwork();
    // Try to read mapId from world room state when ready; default to aurora_town
    const initialMap = (NetClient.inst.worldRoom?.state as any)?.mapId || 'aurora_town';
    this.renderTiles(initialMap);
    this.renderScenery(initialMap);
    this.renderNPCs(initialMap);
    this.renderPortals(initialMap);
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
      // Position + 8-dir walk frame
      $(player).onChange(() => {
        const dx = Math.sign(player.x - sprite.lastX);
        const dy = Math.sign(player.y - sprite.lastY);
        sprite.container.setPosition(
          player.x * TILE_SIZE + TILE_SIZE / 2,
          player.y * TILE_SIZE + TILE_SIZE / 2
        );
        const dir = dirToFrame(dx, dy);
        if (dir >= 0) {
          sprite.dir = dir;
          sprite.lastWalkAt = this.time.now;
        }
        sprite.lastX = player.x;
        sprite.lastY = player.y;
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
        sprite.container.setPosition(m.x * TILE_SIZE + TILE_SIZE/2, m.y * TILE_SIZE + TILE_SIZE/2);
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
    room.onMessage('change_map_request', (msg: any) => {
      // Reconnect to new map room
      NetClient.inst.joinWorld(msg.targetMap).then(() => {
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

    // Keyboard movement (WASD or arrow keys)
    const keys = this.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      UP: Phaser.Input.Keyboard.KeyCodes.UP,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    }) as any;

    this.events.on('update', () => {
      const now = this.time.now;
      if (now - this.lastMoveSentAt < 160) return;
      const me = (NetClient.inst.worldRoom?.state as any)?.players?.get(this.myCharId);
      if (!me) return;

      // Stuck detection: if our last sent move never changed pos in 1500ms, clear walk target
      if (this.lastSeenPos.x !== me.x || this.lastSeenPos.y !== me.y) {
        this.lastSeenPos = { x: me.x, y: me.y, t: now };
      } else if (this.walkTarget && now - this.lastSeenPos.t > 1500) {
        this.walkTarget = null; // give up — collision or rejected
      }

      let dx = 0, dy = 0;
      // Keyboard takes precedence and cancels click-to-walk
      const kbX = (keys.A.isDown || keys.LEFT.isDown) ? -1 : (keys.D.isDown || keys.RIGHT.isDown) ? 1 : 0;
      const kbY = (keys.W.isDown || keys.UP.isDown) ? -1 : (keys.S.isDown || keys.DOWN.isDown) ? 1 : 0;
      if (kbX !== 0 || kbY !== 0) {
        this.walkTarget = null;
        dx = kbX; dy = kbY;
      } else if (this.walkTarget) {
        if (this.walkTarget.tx === me.x && this.walkTarget.ty === me.y) {
          this.walkTarget = null;
        } else {
          dx = Math.sign(this.walkTarget.tx - me.x);
          dy = Math.sign(this.walkTarget.ty - me.y);
        }
      }
      if (dx !== 0 || dy !== 0) {
        NetClient.inst.send('move', { tx: me.x + dx, ty: me.y + dy });
        this.lastMoveSentAt = now;
      }
    });

    // Sprite walk-frame cycling (per-player) — 4 frames @ 150ms = full step every 600ms
    this.events.on('update', () => this.tickPlayerAnimations());
  }

  private tickPlayerAnimations() {
    const now = this.time.now;
    for (const sprite of this.players.values()) {
      const cls = sprite.classId;
      const isMoving = (now - sprite.lastWalkAt) < 350;
      if (isMoving) {
        if (now - sprite.lastFrameAt > 140) {
          sprite.walkFrame = (sprite.walkFrame + 1) % 4;
          sprite.lastFrameAt = now;
        }
        // Try walk32 first (8 dir × 4 frames). Fallback to walk_{dir} (8 dir × 1 frame). Final fallback to idle.
        const w32Key = `char_${cls}_walk32_${sprite.dir * 4 + sprite.walkFrame}`;
        if (this.textures.exists(w32Key)) {
          sprite.body.setTexture(w32Key);
          continue;
        }
        const wKey = `char_${cls}_walk_${sprite.dir}`;
        if (this.textures.exists(wKey)) {
          sprite.body.setTexture(wKey);
          continue;
        }
      } else {
        // idle: snap to frame 0 of current direction (or default idle)
        const w32Idle = `char_${cls}_walk32_${sprite.dir * 4}`;
        if (this.textures.exists(w32Idle)) {
          sprite.body.setTexture(w32Idle);
          continue;
        }
        const idleKey = `char_${cls}`;
        if (this.textures.exists(idleKey)) sprite.body.setTexture(idleKey);
      }
    }
  }

  private makePlayerSprite(player: any, isMe: boolean): PlayerSprite {
    const c = this.add.container(player.x * TILE_SIZE + TILE_SIZE/2, player.y * TILE_SIZE + TILE_SIZE/2);
    const body = this.add.image(0, 0, `char_${player.classId}`);
    // Auto-scale: codex art is 256+px while procedural placeholder is 32×32. Normalize to ~32×32 footprint.
    const tex = this.textures.get(`char_${player.classId}`).getSourceImage() as any;
    const w = tex?.width ?? 32;
    body.setScale(w > 64 ? 56 / w : 1.0);
    body.setOrigin(0.5, 0.78);
    const label = this.add.text(0, -32, player.name + (isMe ? ' ✦' : ''), {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '11px',
      color: isMe ? '#FCD34D' : '#E8E1C9',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    c.add([body, label]);
    if (isMe) c.setDepth(100);
    return {
      container: c, body, label, isMe,
      lastX: player.x, lastY: player.y,
      classId: player.classId,
      dir: 0, walkFrame: 0,
      lastWalkAt: 0, lastFrameAt: 0,
    };
  }

  private makeMonsterSprite(m: any, key: string): MonsterSprite {
    const c = this.add.container(m.x * TILE_SIZE + TILE_SIZE/2, m.y * TILE_SIZE + TILE_SIZE/2);
    const tier = m.isBoss ? 'boss' : m.isNamed ? 'named' : `t${m.tier ?? 1}`;
    const body = this.add.image(0, 0, `mon_${tier}`);
    const tex = this.textures.get(`mon_${tier}`).getSourceImage() as any;
    const w = tex?.width ?? 28;
    const baseScale = w > 64 ? 48 / w : 1.0;
    body.setScale(baseScale * (m.isBoss ? 1.8 : m.isNamed ? 1.3 : 1.0));
    body.setOrigin(0.5, 0.75);
    c.add(body);
    return { container: c, body };
  }

  private playAttackAnimation(sprite: PlayerSprite) {
    const cls = sprite.classId;
    const frames = [`char_${cls}_atk_0`, `char_${cls}_atk_1`, `char_${cls}_atk_2`, `char_${cls}_atk_3`];
    let i = 0;
    const tick = () => {
      if (i >= frames.length) {
        // Restore idle / walk frame
        const idleKey = `char_${cls}`;
        if (this.textures.exists(idleKey)) sprite.body.setTexture(idleKey);
        return;
      }
      if (this.textures.exists(frames[i])) sprite.body.setTexture(frames[i]);
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
        // Fountain ~10 tiles wide
        fountain.setScale(10 * TILE_SIZE / w);
      }
      this.tileLayer.add(fountain);
      // Buildings: codex illustrations mapped by NPC role
      // Track placed building cells to avoid overlap
      const placedBuildings: Array<{ x: number; y: number }> = [];
      const minBuildingDistance = 7; // tiles
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
        // Find nearest non-overlapping spot above the NPC
        let bx = loc.x;
        let by = Math.max(3, loc.y - 4);
        let attempts = 0;
        while (attempts < 8) {
          const overlap = placedBuildings.some(p => Math.abs(p.x - bx) < minBuildingDistance && Math.abs(p.y - by) < 5);
          if (!overlap) break;
          // Shift sideways
          bx += (attempts % 2 === 0 ? 1 : -1) * (Math.floor(attempts / 2) + 1) * 2;
          attempts++;
        }
        placedBuildings.push({ x: bx, y: by });
        const img = this.add.image(bx * TILE_SIZE + TILE_SIZE / 2, by * TILE_SIZE + TILE_SIZE / 2, finalKey)
          .setOrigin(0.5, 0.85).setDepth(3);
        if (useReal) {
          const tex = this.textures.get(finalKey).getSourceImage() as any;
          const w = tex?.width ?? 1024;
          img.setScale(6 * TILE_SIZE / w);
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
      // Cave: rocks scattered, lanterns on edges
      for (let i = 0; i < 80; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_rock', x, y, 1);
      }
      for (let i = 0; i < 15; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_lantern', x, y, 2);
      }
    } else if (mapId.includes('citadel') || mapId.includes('temple') || mapId.includes('ruined')) {
      // Ruins: occasional pillars (use temple sprite small) + rocks
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_temple', x, y, 2);
      }
      for (let i = 0; i < 50; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_rock', x, y, 1);
      }
    } else {
      // Field / forest: lots of trees, some rocks and bushes
      const treeCount = mapId.includes('woods') || mapId.includes('grove') || mapId.includes('meadow') ? 120 : 60;
      for (let i = 0; i < treeCount; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_tree', x, y, 2);
      }
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(rand() * W);
        const y = Math.floor(rand() * H);
        if (isWalkable(x, y)) place('scenery_rock', x, y, 1);
      }
      for (let i = 0; i < 50; i++) {
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
        // Scale by HEIGHT for tall (vertical) NPC cells so full body fits at ~64px tall
        const scale = h > w ? 64 / h : 80 / w;
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
    // Pull map dimensions from room state once it's ready
    const state = NetClient.inst.worldRoom?.state as any;
    if (state) {
      this.mapWidth = state.mapWidth || 60;
      this.mapHeight = state.mapHeight || 60;
    }
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
