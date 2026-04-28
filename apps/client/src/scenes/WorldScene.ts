import Phaser from 'phaser';
import { getStateCallbacks } from 'colyseus.js';
import { NetClient } from '../network/ColyseusClient.js';
import { TILE_SIZE } from 'shared';
import { AudioManager } from '../systems/AudioManager.js';
import { Wordbook } from '../ui/WordbookModal.js';

interface PlayerSprite {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  isMe: boolean;
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

  constructor() { super({ key: 'WorldScene' }); }

  create() {
    const charPayload = JSON.parse(sessionStorage.getItem('rwc-char') ?? '{}');
    this.myCharId = charPayload.charId ?? '';

    this.cameras.main.setBackgroundColor('#0f1218');
    this.tileLayer = this.add.container(0, 0);
    this.tapMarker = this.add.image(-1000, -1000, 'tap_target').setVisible(false);

    this.setupInput();
    this.bindNetwork();
    this.renderTiles('aurora_town');
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
      // Position updates
      $(player).onChange(() => {
        sprite.container.setPosition(
          player.x * TILE_SIZE + TILE_SIZE / 2,
          player.y * TILE_SIZE + TILE_SIZE / 2
        );
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
    body.setScale(1.0);
    const label = this.add.text(0, -22, player.name + (isMe ? ' ✦' : ''), {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '11px',
      color: isMe ? '#FCD34D' : '#E8E1C9',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    c.add([body, label]);
    if (isMe) c.setDepth(100);
    return { container: c, body, label, isMe };
  }

  private makeMonsterSprite(m: any, key: string): MonsterSprite {
    const c = this.add.container(m.x * TILE_SIZE + TILE_SIZE/2, m.y * TILE_SIZE + TILE_SIZE/2);
    const tier = m.isBoss ? 'boss' : m.isNamed ? 'named' : 't1';
    const body = this.add.image(0, 0, `mon_${tier}`).setScale(m.isBoss ? 1.6 : m.isNamed ? 1.3 : 1.0);
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
