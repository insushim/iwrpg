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
          const walkKey = `char_${sprite.classId}_walk_${dir}`;
          if (this.textures.exists(walkKey)) sprite.body.setTexture(walkKey);
        } else {
          const idleKey = `char_${sprite.classId}`;
          if (this.textures.exists(idleKey)) sprite.body.setTexture(idleKey);
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
              return;
            }
          }
        }
      }
      // Otherwise: move to clicked tile
      const me = (NetClient.inst.worldRoom?.state as any).players.get(this.myCharId);
      if (me) {
        // Step 1 tile toward target each call (server enforces)
        const stepX = me.x + Math.sign(tx - me.x);
        const stepY = me.y + Math.sign(ty - me.y);
        NetClient.inst.send('move', { tx: stepX, ty: stepY });
      }
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

    let lastMoveAt = 0;
    this.events.on('update', (_t: number, delta: number) => {
      const now = this.time.now;
      if (now - lastMoveAt < 220) return;
      const me = (NetClient.inst.worldRoom?.state as any)?.players?.get(this.myCharId);
      if (!me) return;
      let dx = 0, dy = 0;
      if (keys.A.isDown || keys.LEFT.isDown) dx = -1;
      else if (keys.D.isDown || keys.RIGHT.isDown) dx = 1;
      if (keys.W.isDown || keys.UP.isDown) dy = -1;
      else if (keys.S.isDown || keys.DOWN.isDown) dy = 1;
      if (dx !== 0 || dy !== 0) {
        NetClient.inst.send('move', { tx: me.x + dx, ty: me.y + dy });
        lastMoveAt = now;
      }
    });
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
    return { container: c, body, label, isMe, lastX: player.x, lastY: player.y, classId: player.classId };
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
      const img = this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, key)
        .setOrigin(0.5, 0.85)
        .setDepth(depth);
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
      const fsize = this.textures.exists('bld_fountain') ? 4 : 1;  // large illustration occupies more tiles visually
      const fountain = this.add.image(cx * TILE_SIZE + TILE_SIZE / 2, cy * TILE_SIZE + TILE_SIZE / 2, fkey)
        .setOrigin(0.5, 0.85).setDepth(5);
      if (fkey === 'bld_fountain') fountain.setScale(2.0 * TILE_SIZE / 1024 * fsize);
      this.tileLayer.add(fountain);
      // Buildings: codex illustrations mapped by NPC role
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
        const bx = loc.x;
        const by = Math.max(3, loc.y - 3);
        const img = this.add.image(bx * TILE_SIZE + TILE_SIZE / 2, by * TILE_SIZE + TILE_SIZE / 2, finalKey)
          .setOrigin(0.5, 0.85).setDepth(3);
        if (useReal) {
          // Codex illustrations are 1024×1024 — scale to ~3×3 tile footprint
          const tex = this.textures.get(finalKey).getSourceImage() as any;
          const w = tex?.width ?? 1024;
          img.setScale(3 * TILE_SIZE / w);
        }
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
      // Real codex NPC sprite if available (Aurora town atlas), else fallback placeholder
      const frame = AURORA_NPC_FRAME[loc.id];
      const codexKey = frame !== undefined ? `npc_aurora_${frame}` : '';
      const useReal = codexKey && this.textures.exists(codexKey);
      const finalKey = useReal ? codexKey : 'npc_default';
      const body = this.add.image(0, 0, finalKey).setOrigin(0.5, 0.78);
      if (useReal) {
        const tex = this.textures.get(finalKey).getSourceImage() as any;
        const w = tex?.width ?? 256;
        body.setScale(48 / w);
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

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        // Roads in towns
        let key = tileKey;
        if (mapId.includes('town')) {
          if (x === Math.floor(this.mapWidth / 2) || y === Math.floor(this.mapHeight / 2)) key = 'tile_stone';
        }
        const t = this.add.image(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, key);
        this.tileLayer.add(t);
      }
    }
  }
}
