// Main multiplayer room — one per map. Up to 50 players per room.

import { Room, Client } from '@colyseus/core';
import { WorldState } from './schemas/WorldState.js';
import { PlayerState } from './schemas/PlayerState.js';
import { MonsterSpawner } from '../game/MonsterSpawner.js';
import { CombatResolver } from '../game/CombatResolver.js';
import { DropResolver } from '../game/DropResolver.js';
import { QuizManager } from '../game/QuizManager.js';
import { GachaManager } from '../game/GachaManager.js';
import { attemptEnchant } from '../game/EnchantSystem.js';
import { getMapDef } from '../data/maps-data.js';
import { ALL_NPCS } from '../data/npcs-data.js';
import { ALL_ITEMS } from '../data/items-data.js';
import { ALL_RECIPES } from '../data/recipes-data.js';
import {
  CLASSES,
  expForNextLevel,
  type ClassId,
  type ClientMessage,
  PLAYER_BASE_SPEED,
  TILE_SIZE,
  SERVER_TICK_HZ,
  STARTING_MAP,
  STARTING_X,
  STARTING_Y,
  PROFANITY_KO,
  PROFANITY_EN,
} from 'shared';

const TICK_MS = 1000 / SERVER_TICK_HZ;
const MAX_CLIENTS_PER_ROOM = 50;

export class WorldRoom extends Room<WorldState> {
  maxClients = MAX_CLIENTS_PER_ROOM;
  state = new WorldState();
  private mapId: string = STARTING_MAP;
  private spawner!: MonsterSpawner;
  private quiz = new QuizManager();
  private gacha = new GachaManager();
  private tickInterval: any = null;
  private playerInventories = new Map<string, any[]>();         // simple in-memory per-session inventory

  onCreate(options: { mapId?: string }) {
    this.mapId = options.mapId ?? STARTING_MAP;
    const mapDef = getMapDef(this.mapId);
    if (!mapDef) {
      console.error(`[WorldRoom] Unknown map ${this.mapId}, falling back to ${STARTING_MAP}`);
      this.mapId = STARTING_MAP;
    }
    const def = getMapDef(this.mapId)!;
    this.state.mapId = this.mapId;
    this.state.mapWidth = def.width;
    this.state.mapHeight = def.height;
    this.state.isSafeZone = def.is_safe_zone;

    this.spawner = new MonsterSpawner(this.state, this.mapId);
    this.spawner.initSpawns();

    this.registerHandlers();

    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
    // Lower patch rate (50→30ms) → snappier client position updates → less perceived "cuts"
    this.setPatchRate(30);
    console.log(`[WorldRoom] Created room for ${this.mapId} (${def.name_ko})`);
  }

  private registerHandlers() {
    this.onMessage('move', (client, msg: any) => this.handleMove(client, msg));
    this.onMessage('attack', (client, msg: any) => this.handleAttack(client, msg));
    this.onMessage('quiz_answer', (client, msg: any) => this.handleQuizAnswer(client, msg));
    this.onMessage('use_item', (client, msg: any) => this.handleUseItem(client, msg));
    this.onMessage('equip_item', (client, msg: any) => this.handleEquipItem(client, msg));
    this.onMessage('unequip_item', (client, msg: any) => this.handleUnequipItem(client, msg));
    this.onMessage('drop_item', (client, msg: any) => this.handleDropItem(client, msg));
    this.onMessage('pickup_drop', (client, msg: any) => this.handlePickupDrop(client, msg));
    this.onMessage('chat', (client, msg: any) => this.handleChat(client, msg));
    this.onMessage('enchant_item', (client, msg: any) => this.handleEnchant(client, msg));
    this.onMessage('craft', (client, msg: any) => this.handleCraft(client, msg));
    this.onMessage('shop_buy', (client, msg: any) => this.handleShopBuy(client, msg));
    this.onMessage('shop_sell', (client, msg: any) => this.handleShopSell(client, msg));
    this.onMessage('change_map', (client, msg: any) => this.handleChangeMap(client, msg));
    this.onMessage('transform', (client, msg: any) => this.handleTransform(client, msg));
    this.onMessage('interact_npc', (client, msg: any) => this.handleInteractNPC(client, msg));
    this.onMessage('gacha_request_challenge', (client, msg: any) => this.handleGachaRequest(client, msg));
    this.onMessage('gacha_answer_challenge', (client, msg: any) => this.handleGachaAnswer(client, msg));
    this.onMessage('gacha_open_box', (client, msg: any) => this.handleGachaOpen(client, msg));
    this.onMessage('set_grade_level', (client, msg: any) => this.handleSetGrade(client, msg));
    this.onMessage('ping', (client) => client.send('pong', { serverTime: Date.now() }));
  }

  onJoin(client: Client, options: any) {
    const player = new PlayerState();
    player.id = options.charId ?? client.sessionId;
    player.sessionId = client.sessionId;
    player.name = sanitizeName(options.name ?? '익명영웅');
    player.classId = (options.classId ?? 'iron-sentinel') as ClassId;
    player.level = options.level ?? 1;
    player.exp = options.exp ?? 0;
    // Validate provided x/y against this map's bounds + collision; only accept if walkable
    const mapDef = getMapDef(this.mapId);
    const requestedX = typeof options.x === 'number' ? options.x : null;
    const requestedY = typeof options.y === 'number' ? options.y : null;
    let usePos = { x: STARTING_X, y: STARTING_Y };
    if (mapDef && requestedX !== null && requestedY !== null
        && requestedX > 0 && requestedX < mapDef.width - 1
        && requestedY > 0 && requestedY < mapDef.height - 1
        && mapDef.collision[requestedY]?.[requestedX] !== 1) {
      usePos = { x: requestedX, y: requestedY };
    }
    player.x = usePos.x;
    player.y = usePos.y;
    player.currentMap = this.mapId;
    player.gold = options.gold ?? 100;
    player.alignment = options.alignment ?? 0;
    player.grade = options.grade ?? 'g5';

    const cls = CLASSES[player.classId];
    if (cls) {
      player.stats.str = cls.base_stats.str + (player.level - 1);
      player.stats.con = cls.base_stats.con + Math.floor((player.level - 1) * 0.8);
      player.stats.dex = cls.base_stats.dex + Math.floor((player.level - 1) * 0.6);
      player.stats.int = cls.base_stats.int + Math.floor((player.level - 1) * 0.5);
      player.stats.wis = cls.base_stats.wis + Math.floor((player.level - 1) * 0.5);
      player.maxHp = cls.base_hp + cls.hp_per_level * (player.level - 1) + player.stats.con * 2;
      player.maxMp = cls.base_mp + cls.mp_per_level * (player.level - 1) + player.stats.wis * 1;
      player.hp = player.maxHp;
      player.mp = player.maxMp;
      player.equip.weapon = cls.start_weapon_id;
      player.equip.armor = cls.start_armor_id;
    }

    this.state.players.set(player.id, player);
    this.playerInventories.set(player.id, this.makeStarterInventory(player.classId));
    console.log(`[WorldRoom ${this.mapId}] +${player.name} (${player.classId}, lv${player.level})`);

    // Welcome message
    client.send('system_msg', {
      severity: 'info',
      text_ko: `${getMapDef(this.mapId)?.name_ko}에 도착했습니다.`,
    });
    // Sync inventory
    client.send('inventory_update', { entries: this.playerInventories.get(player.id) });
  }

  async onLeave(client: Client, consented: boolean) {
    let foundPid = '';
    let foundPlayer: any = null;
    for (const [pid, p] of this.state.players.entries()) {
      if (p.sessionId === client.sessionId) {
        foundPid = pid;
        foundPlayer = p;
        break;
      }
    }
    if (!foundPlayer) return;

    const cleanup = () => {
      this.state.players.delete(foundPid);
      this.quiz.cleanupPlayer(foundPid);
      this.gacha.cleanupPlayer(foundPid);
      this.playerInventories.delete(foundPid);
    };

    if (consented) {
      cleanup();
      console.log(`[WorldRoom ${this.mapId}] -${foundPlayer.name} (consented)`);
      return;
    }
    // Network drop: hold the player record for 60s for reconnection
    console.log(`[WorldRoom ${this.mapId}] ${foundPlayer.name} dropped, awaiting reconnect…`);
    try {
      const newClient = await this.allowReconnection(client, 60);
      foundPlayer.sessionId = newClient.sessionId;
      console.log(`[WorldRoom ${this.mapId}] ${foundPlayer.name} reconnected`);
    } catch {
      cleanup();
      console.log(`[WorldRoom ${this.mapId}] -${foundPlayer.name} (timeout)`);
    }
  }

  onDispose() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.spawner?.cleanup();
  }

  // ============================================
  // Tick: monster AI, regen, drop expiry
  // ============================================
  private tick() {
    const now = Date.now();
    this.state.tickCount++;
    this.spawner.tick(now);
    this.tickMonsterAI(now);
    this.tickRegen(now);
    this.tickDropExpiry(now);
    this.tickQuizTimeouts(now);
  }

  private tickMonsterAI(now: number) {
    if (this.state.isSafeZone) return;
    for (const m of this.state.monsters.values()) {
      if (m.aiState === 'dead') continue;

      // Find nearest player in 8-tile radius
      let nearest: PlayerState | null = null;
      let nearestDist = 9999;
      for (const p of this.state.players.values()) {
        const dx = p.x - m.x;
        const dy = p.y - m.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearestDist && d < 8) {
          nearest = p;
          nearestDist = d;
        }
      }

      if (m.aiState === 'idle' && nearest) {
        m.aiState = 'chase';
        m.targetPlayerId = nearest.id;
      }
      if (m.aiState === 'chase' && nearest) {
        // Move 1 tile toward nearest player every 600ms
        if (now - m.lastActionAt > 600) {
          if (m.x < nearest.x) m.x++; else if (m.x > nearest.x) m.x--;
          if (m.y < nearest.y) m.y++; else if (m.y > nearest.y) m.y--;
          m.lastActionAt = now;
        }
        if (nearestDist < 1.5) {
          m.aiState = 'attack';
        }
      }
      if (m.aiState === 'attack' && nearest) {
        if (now - m.lastActionAt > 1500) {
          m.lastActionAt = now;
          // Monster hits the player (only if monster's range)
          const dx = nearest.x - m.x;
          const dy = nearest.y - m.y;
          if (Math.abs(dx) + Math.abs(dy) <= 2) {
            const ev = CombatResolver.monsterHitsPlayer(m, nearest);
            this.broadcast('damage_dealt', {
              attackerId: m.id,
              targetId: nearest.id,
              damage: ev.damage,
              isCrit: ev.isCrit,
            });
            if (nearest.hp <= 0) {
              this.handlePlayerDeath(nearest);
            }
          } else {
            m.aiState = 'chase';
          }
        }
      }
      if (!nearest && m.aiState !== 'idle' && m.aiState !== 'dead') {
        m.aiState = 'return';
        m.targetPlayerId = '';
      }
      if (m.aiState === 'return') {
        if (now - m.lastActionAt > 600) {
          if (m.x < m.homeX) m.x++; else if (m.x > m.homeX) m.x--;
          if (m.y < m.homeY) m.y++; else if (m.y > m.homeY) m.y--;
          m.lastActionAt = now;
          if (m.x === m.homeX && m.y === m.homeY) m.aiState = 'idle';
        }
      }
    }
  }

  private tickRegen(now: number) {
    if (now % 2000 < TICK_MS) {
      for (const p of this.state.players.values()) {
        if (p.hp > 0 && !p.isInQuiz) {
          p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.floor(p.maxHp * 0.01)));
          p.mp = Math.min(p.maxMp, p.mp + Math.max(1, Math.floor(p.maxMp * 0.015)));
        }
      }
    }
  }

  private tickDropExpiry(now: number) {
    for (const [id, d] of this.state.drops.entries()) {
      if (now > d.expiresAt) this.state.drops.delete(id);
    }
  }

  private tickQuizTimeouts(now: number) {
    const expired = this.quiz.forceTimeoutAll(now);
    for (const e of expired) {
      const result = this.quiz.resolveAnswer(e.playerId, e.quizId, -1);
      if (result) {
        const player = this.state.players.get(e.playerId);
        if (player) player.isInQuiz = false;
        this.broadcastQuizResult(e.playerId, result, false);
      }
    }
  }

  // ============================================
  // Message handlers
  // ============================================
  private getPlayer(client: Client): PlayerState | null {
    for (const p of this.state.players.values()) {
      if (p.sessionId === client.sessionId) return p;
    }
    return null;
  }

  private handleMove(client: Client, msg: { tx: number; ty: number }) {
    const p = this.getPlayer(client);
    if (!p || p.isInQuiz) return;
    const map = getMapDef(p.currentMap);
    if (!map) return;
    const tx = clamp(msg.tx, 1, map.width - 2);
    const ty = clamp(msg.ty, 1, map.height - 2);
    // Movement validation: max 1 tile per send (anti-cheat)
    const dx = Math.abs(tx - p.x);
    const dy = Math.abs(ty - p.y);
    if (dx + dy > 2) return;
    // Collision check
    if (map.collision[ty]?.[tx] === 1) return;
    p.x = tx;
    p.y = ty;
  }

  private handleAttack(client: Client, msg: { targetId: string }) {
    const p = this.getPlayer(client);
    if (!p || p.isInQuiz) return;
    const target = this.state.monsters.get(msg.targetId);
    if (!target || target.aiState === 'dead') return;
    // Range check
    const dx = Math.abs(p.x - target.x);
    const dy = Math.abs(p.y - target.y);
    if (dx + dy > 5) return;

    // Issue quiz
    const quizPrompt = this.quiz.startQuiz(p.id, p.grade as any, target.id);
    if (!quizPrompt) return;
    p.isInQuiz = true;

    const display = quizPrompt.mode === 'en2ko' ? quizPrompt.word.word : quizPrompt.word.meaning_ko;
    client.send('quiz_prompt', {
      prompt: {
        quizId: quizPrompt.quizId,
        word_id: quizPrompt.word.id,
        display,
        mode: quizPrompt.mode,
        choices: quizPrompt.choices,
        deadlineMs: quizPrompt.deadlineMs,
        monsterId: target.id,
        graded_seconds: quizPrompt.graded_seconds,
      },
    });
  }

  private handleQuizAnswer(client: Client, msg: { quizId: string; choice: number }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const result = this.quiz.resolveAnswer(p.id, msg.quizId, msg.choice);
    if (!result) return;
    p.isInQuiz = false;
    const monster = this.state.monsters.get(result.monsterId);
    let damage = 0;
    let killed = false;
    let rewards: any = undefined;

    if (result.correct && monster && monster.aiState !== 'dead') {
      const ev = CombatResolver.playerHitsMonster(p, monster);
      damage = ev.damage;
      killed = ev.killed;
      this.broadcast('damage_dealt', {
        attackerId: p.id,
        targetId: monster.id,
        damage: ev.damage,
        isCrit: ev.isCrit,
      });
      if (killed) {
        const outcome = DropResolver.rollKillRewards(monster, p);
        // Apply EXP/gold to player
        p.exp += outcome.exp;
        p.gold += outcome.gold;
        // Spawn ground drops
        DropResolver.spawnDrops(this.state, this.mapId, monster.x, monster.y, outcome.drops, p.id);
        // Level up check
        while (p.exp >= expForNextLevel(p.level) && p.level < 75) {
          p.exp -= expForNextLevel(p.level);
          p.level++;
          p.statPointsAvailable += 3;
          // Recompute max HP/MP
          const cls = CLASSES[p.classId as ClassId];
          if (cls) {
            p.maxHp = cls.base_hp + cls.hp_per_level * (p.level - 1) + p.stats.con * 2;
            p.maxMp = cls.base_mp + cls.mp_per_level * (p.level - 1) + p.stats.wis;
            p.hp = p.maxHp;
            p.mp = p.maxMp;
          }
          this.broadcast('level_up', { characterId: p.id, newLevel: p.level, statPoints: p.statPointsAvailable });
        }
        // Increment streak
        p.quizStreak = Math.min(50, p.quizStreak + 1);
        this.broadcast('monster_killed', {
          monsterId: monster.id,
          killerId: p.id,
          pos: { x: monster.x, y: monster.y },
        });
        rewards = outcome;
      }
    } else if (result.correct && !monster) {
      // Target died before answer arrived
      p.quizStreak = Math.min(50, p.quizStreak + 1);
    } else {
      p.quizStreak = 0;
    }

    client.send('quiz_result', {
      result: {
        quizId: result.quizId,
        correct: result.correct,
        correctChoice: result.correctChoice,
        damageDealt: damage,
        rewards,
      },
    });
  }

  private broadcastQuizResult(playerId: string, result: any, correct: boolean) {
    const sessionId = this.state.players.get(playerId)?.sessionId;
    if (!sessionId) return;
    const client = this.clients.find(c => c.sessionId === sessionId);
    client?.send('quiz_result', {
      result: {
        quizId: result.quizId,
        correct: false,
        correctChoice: result.correctChoice,
        damageDealt: 0,
      },
    });
  }

  private handleUseItem(client: Client, msg: { inventoryEntryId: string }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const inv = this.playerInventories.get(p.id) ?? [];
    const entry = inv.find((e: any) => e.id === msg.inventoryEntryId);
    if (!entry) return;
    const def = ALL_ITEMS.find(i => i.id === entry.item_id);
    if (!def) return;

    if (def.effect?.type === 'heal_hp') {
      p.hp = Math.min(p.maxHp, p.hp + (def.effect.value ?? 0));
    } else if (def.effect?.type === 'heal_mp') {
      p.mp = Math.min(p.maxMp, p.mp + (def.effect.value ?? 0));
    } else if (def.effect?.type === 'transform' && def.effect.transform_id) {
      p.transformId = def.effect.transform_id;
      p.transformEndsAt = Date.now() + (def.effect.duration_sec ?? 600) * 1000;
      this.broadcast('transform_started', {
        characterId: p.id,
        transformId: p.transformId,
        durationSec: def.effect.duration_sec ?? 600,
      });
    }

    if (def.stackable) {
      entry.quantity--;
      if (entry.quantity <= 0) {
        const idx = inv.indexOf(entry);
        if (idx >= 0) inv.splice(idx, 1);
      }
    } else {
      const idx = inv.indexOf(entry);
      if (idx >= 0) inv.splice(idx, 1);
    }
    client.send('inventory_update', { entries: inv });
  }

  private handleEquipItem(client: Client, msg: { inventoryEntryId: string }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const inv = this.playerInventories.get(p.id) ?? [];
    const entry = inv.find((e: any) => e.id === msg.inventoryEntryId);
    if (!entry) return;
    const def = ALL_ITEMS.find(i => i.id === entry.item_id);
    if (!def) return;

    let slot: 'weapon'|'armor'|'helm'|'cloak'|'boots'|'amulet'|'ring1'|'ring2'|null = null;
    if (def.category === 'weapon') slot = 'weapon';
    else if (def.category === 'armor') slot = 'armor';
    else if (def.category === 'helm') slot = 'helm';
    else if (def.category === 'cloak') slot = 'cloak';
    else if (def.category === 'boots') slot = 'boots';
    else if (def.category === 'amulet') slot = 'amulet';
    else if (def.category === 'ring') slot = p.equip.ring1 ? 'ring2' : 'ring1';
    if (!slot) return;
    setEquipSlot(p.equip, slot, def.id);
    entry.is_equipped = true;
    entry.equipped_slot = slot;
    client.send('inventory_update', { entries: inv });
  }

  private handleUnequipItem(client: Client, msg: { slot: string }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const slot = msg.slot;
    setEquipSlot(p.equip, slot, '');
    const inv = this.playerInventories.get(p.id) ?? [];
    inv.forEach((e: any) => { if (e.equipped_slot === slot) { e.is_equipped = false; e.equipped_slot = undefined; } });
    client.send('inventory_update', { entries: inv });
  }

  private handleDropItem(client: Client, msg: any) {
    const p = this.getPlayer(client);
    if (!p) return;
    const inv = this.playerInventories.get(p.id) ?? [];
    const entry = inv.find((e: any) => e.id === msg.inventoryEntryId);
    if (!entry) return;
    DropResolver.spawnDrops(this.state, this.mapId, p.x, p.y, [{ itemId: entry.item_id, quantity: msg.quantity, enchant: entry.enchant_level ?? 0 }], '');
    entry.quantity -= msg.quantity;
    if (entry.quantity <= 0) inv.splice(inv.indexOf(entry), 1);
    client.send('inventory_update', { entries: inv });
  }

  private handlePickupDrop(client: Client, msg: { dropId: string }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const drop = this.state.drops.get(msg.dropId);
    if (!drop) return;
    const dx = Math.abs(p.x - drop.x);
    const dy = Math.abs(p.y - drop.y);
    if (dx + dy > 2) return;
    if (drop.ownerCharacterId && drop.ownerCharacterId !== p.id && Date.now() < drop.ownerExpiresAt) return;
    this.addInventory(p.id, drop.itemId, drop.quantity, drop.enchantLevel);
    this.state.drops.delete(msg.dropId);
    this.broadcast('item_drop_picked', { dropId: msg.dropId, pickerId: p.id });
    client.send('inventory_update', { entries: this.playerInventories.get(p.id) });
  }

  private handleChat(client: Client, msg: any) {
    const p = this.getPlayer(client);
    if (!p) return;
    const filtered = filterProfanity(msg.text);
    if (msg.channel === 'world' || msg.channel === 'guild') {
      this.broadcast('chat_message', {
        message: { channel: msg.channel, from: p.name, fromCharId: p.id, text: filtered, ts: Date.now() },
      });
    } else if (msg.channel === 'whisper' && msg.to) {
      // Find target by name and send to that client only
      for (const tp of this.state.players.values()) {
        if (tp.name === msg.to) {
          const target = this.clients.find(c => c.sessionId === tp.sessionId);
          target?.send('chat_message', {
            message: { channel: 'whisper', from: p.name, to: msg.to, text: filtered, ts: Date.now() },
          });
        }
      }
      client.send('chat_message', {
        message: { channel: 'whisper', from: p.name, to: msg.to, text: filtered, ts: Date.now() },
      });
    }
  }

  private handleEnchant(client: Client, msg: { inventoryEntryId: string; useBlessed: boolean }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const inv = this.playerInventories.get(p.id) ?? [];
    const entry = inv.find((e: any) => e.id === msg.inventoryEntryId);
    if (!entry) return;
    const def = ALL_ITEMS.find(i => i.id === entry.item_id);
    if (!def?.enchantable) {
      client.send('system_msg', { severity: 'warn', text_ko: '강화할 수 없는 아이템입니다.' });
      return;
    }
    // Consume scroll: find one in inventory
    const scrollId = msg.useBlessed
      ? (def.category === 'weapon' ? 'scroll_blessed_enchant_weapon' : 'scroll_blessed_enchant_armor')
      : (def.category === 'weapon' ? 'scroll_enchant_weapon' : 'scroll_enchant_armor');
    const scroll = inv.find((e: any) => e.item_id === scrollId);
    if (!scroll) {
      client.send('system_msg', { severity: 'warn', text_ko: '강화 주문서가 없습니다.' });
      return;
    }
    scroll.quantity--;
    if (scroll.quantity <= 0) inv.splice(inv.indexOf(scroll), 1);

    const result = attemptEnchant(entry.enchant_level ?? 0, msg.useBlessed);
    if (result.outcome === 'destroyed') {
      inv.splice(inv.indexOf(entry), 1);
    } else {
      entry.enchant_level = result.newLevel;
    }
    client.send('enchant_result', { outcome: result.outcome, newLevel: result.newLevel });
    client.send('inventory_update', { entries: inv });
  }

  private handleCraft(client: Client, msg: { recipeId: string }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const recipe = ALL_RECIPES.find(r => r.id === msg.recipeId);
    if (!recipe) return;
    if (p.level < recipe.level_req) {
      client.send('craft_result', { success: false, reason: 'level_too_low' });
      return;
    }
    if (p.gold < recipe.gold_cost) {
      client.send('craft_result', { success: false, reason: 'insufficient_gold' });
      return;
    }
    const inv = this.playerInventories.get(p.id) ?? [];
    // Check inputs
    for (const input of recipe.inputs) {
      const total = inv.filter((e: any) => e.item_id === input.item_id).reduce((acc: number, e: any) => acc + e.quantity, 0);
      if (total < input.qty) {
        client.send('craft_result', { success: false, reason: `missing_${input.item_id}` });
        return;
      }
    }
    // Consume inputs
    for (const input of recipe.inputs) {
      let need = input.qty;
      for (const e of [...inv]) {
        if (e.item_id !== input.item_id) continue;
        const take = Math.min(need, e.quantity);
        e.quantity -= take;
        need -= take;
        if (e.quantity <= 0) inv.splice(inv.indexOf(e), 1);
        if (need <= 0) break;
      }
    }
    p.gold -= recipe.gold_cost;
    this.addInventory(p.id, recipe.output_item_id, 1, 0);
    client.send('craft_result', { success: true, outputItemId: recipe.output_item_id });
    client.send('inventory_update', { entries: this.playerInventories.get(p.id) });
  }

  private handleShopBuy(client: Client, msg: { npcId: string; itemId: string; quantity: number }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const npc = ALL_NPCS.find(n => n.id === msg.npcId);
    if (!npc?.shop_inventory) return;
    const stock = npc.shop_inventory.find(s => s.item_id === msg.itemId);
    if (!stock) return;
    const def = ALL_ITEMS.find(i => i.id === msg.itemId);
    if (!def) return;
    const price = (stock.price_override ?? def.buy_price) * msg.quantity;
    if (p.gold < price) {
      client.send('system_msg', { severity: 'warn', text_ko: '골드가 부족합니다.' });
      return;
    }
    p.gold -= price;
    this.addInventory(p.id, msg.itemId, msg.quantity, 0);
    client.send('inventory_update', { entries: this.playerInventories.get(p.id) });
  }

  private handleShopSell(client: Client, msg: { inventoryEntryId: string; quantity: number }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const inv = this.playerInventories.get(p.id) ?? [];
    const entry = inv.find((e: any) => e.id === msg.inventoryEntryId);
    if (!entry) return;
    const def = ALL_ITEMS.find(i => i.id === entry.item_id);
    if (!def) return;
    const qty = Math.min(msg.quantity, entry.quantity);
    p.gold += def.sell_price * qty;
    entry.quantity -= qty;
    if (entry.quantity <= 0) inv.splice(inv.indexOf(entry), 1);
    client.send('inventory_update', { entries: inv });
  }

  private handleChangeMap(client: Client, msg: { portalId: string }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const map = getMapDef(p.currentMap);
    const portal = map?.portals.find(pt => pt.id === msg.portalId);
    if (!portal) return;
    // AABB containment + 1-tile tolerance (player can stand at the edge)
    const inX = p.x >= portal.x - 1 && p.x <= portal.x + portal.w;
    const inY = p.y >= portal.y - 1 && p.y <= portal.y + portal.h;
    if (!inX || !inY) {
      console.log(`[WorldRoom] portal ${portal.id} reject — player at ${p.x},${p.y}, portal ${portal.x},${portal.y} ${portal.w}x${portal.h}`);
      return;
    }
    console.log(`[WorldRoom] ${p.name} → ${portal.target_map} via ${portal.id}`);
    client.send('system_msg', { severity: 'info', text_ko: `${portal.label_ko}(으)로 이동합니다…` });
    client.send('change_map_request', {
      targetMap: portal.target_map,
      x: portal.target_x,
      y: portal.target_y,
    });
    p.currentMap = portal.target_map;
  }

  private handleTransform(client: Client, msg: { stoneInventoryEntryId: string }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const inv = this.playerInventories.get(p.id) ?? [];
    const entry = inv.find((e: any) => e.id === msg.stoneInventoryEntryId);
    if (!entry) return;
    const def = ALL_ITEMS.find(i => i.id === entry.item_id);
    if (!def || def.category !== 'transform_stone') return;
    p.transformId = def.effect?.transform_id ?? def.id;
    p.transformEndsAt = Date.now() + (def.effect?.duration_sec ?? 600) * 1000;
    entry.quantity--;
    if (entry.quantity <= 0) inv.splice(inv.indexOf(entry), 1);
    this.broadcast('transform_started', {
      characterId: p.id,
      transformId: p.transformId,
      durationSec: def.effect?.duration_sec ?? 600,
    });
    client.send('inventory_update', { entries: inv });
  }

  private handleInteractNPC(client: Client, msg: { npcId: string }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const npc = ALL_NPCS.find(n => n.id === msg.npcId);
    if (!npc) return;
    const dialog = npc.dialog_lines_ko[Math.floor(Math.random() * npc.dialog_lines_ko.length)];
    client.send('npc_dialog', { npcId: npc.id, name_ko: npc.name_ko, role: npc.role, dialog, shop_inventory: npc.shop_inventory, services: npc.services });
  }

  private handleGachaRequest(client: Client, msg: { difficulty: 'C1' | 'C2' }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const result = this.gacha.issueChallenge(p.id, msg.difficulty);
    if (!result) {
      client.send('system_msg', { severity: 'warn', text_ko: '오늘의 가챠 토큰을 모두 획득했거나 진행 중인 도전이 있습니다.' });
      return;
    }
    client.send('gacha_challenge_prompt', {
      challenge: {
        id: result.quizId,
        sentence_en: result.challenge.sentence_en,
        choices: result.choices,
        difficulty: result.challenge.difficulty,
        reward_tokens: result.challenge.reward_token_count,
      },
      deadlineMs: result.deadlineMs,
    });
  }

  private handleGachaAnswer(client: Client, msg: { challengeId: string; choice: number }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const result = this.gacha.resolveChallenge(p.id, msg.challengeId, msg.choice);
    if (!result) return;
    p.gachaTokensToday = result.totalTokensToday;
    client.send('gacha_challenge_result', result);
  }

  private handleGachaOpen(client: Client, msg: { boxId: string }) {
    const p = this.getPlayer(client);
    if (!p) return;
    const result = this.gacha.openBox(p.id, msg.boxId);
    if (!result.success) {
      client.send('system_msg', { severity: 'warn', text_ko: '가챠 박스를 열 수 없습니다 (토큰 부족).' });
      return;
    }
    p.gachaTokensToday = result.remainingTokens ?? 0;
    for (const it of result.items ?? []) {
      this.addInventory(p.id, it.item_id, it.qty, 0);
    }
    client.send('gacha_box_result', { result: { boxId: msg.boxId, itemsAwarded: result.items ?? [] } });
    client.send('inventory_update', { entries: this.playerInventories.get(p.id) });
  }

  private handleSetGrade(client: Client, msg: { grade: any }) {
    const p = this.getPlayer(client);
    if (!p) return;
    p.grade = msg.grade;
    // Reset queue with new tier set
    this.quiz.cleanupPlayer(p.id);
  }

  private handlePlayerDeath(p: PlayerState) {
    // Respawn at safe town with -5% EXP penalty
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    const lostExp = Math.floor(p.exp * 0.05);
    p.exp = Math.max(0, p.exp - lostExp);
    p.x = STARTING_X;
    p.y = STARTING_Y;
    p.quizStreak = 0;
    this.broadcast('system_msg', { severity: 'info', text_ko: `${p.name}님이 마을에서 부활했습니다 (EXP -${lostExp}).` });
  }

  // ============================================
  // Helpers
  // ============================================
  private addInventory(playerId: string, itemId: string, quantity: number, enchant: number) {
    const inv = this.playerInventories.get(playerId) ?? [];
    const def = ALL_ITEMS.find(i => i.id === itemId);
    if (!def) return;
    if (def.stackable) {
      const existing = inv.find((e: any) => e.item_id === itemId && e.enchant_level === enchant && e.quantity < def.max_stack);
      if (existing) {
        const room = def.max_stack - existing.quantity;
        const add = Math.min(quantity, room);
        existing.quantity += add;
        quantity -= add;
      }
    }
    while (quantity > 0) {
      const stackQty = def.stackable ? Math.min(quantity, def.max_stack) : 1;
      inv.push({
        id: `inv_${Math.random().toString(36).slice(2, 10)}`,
        item_id: itemId,
        quantity: stackQty,
        enchant_level: enchant,
        is_equipped: false,
        slot_position: inv.length,
      });
      quantity -= stackQty;
    }
    this.playerInventories.set(playerId, inv);
  }

  private makeStarterInventory(classId: string): any[] {
    const base = [
      { id: 'inv_pot1', item_id: 'pot_hp_s', quantity: 5, enchant_level: 0, is_equipped: false, slot_position: 0 },
      { id: 'inv_pot2', item_id: 'pot_mp_s', quantity: 3, enchant_level: 0, is_equipped: false, slot_position: 1 },
      { id: 'inv_scroll_return', item_id: 'scroll_return', quantity: 1, enchant_level: 0, is_equipped: false, slot_position: 2 },
    ];
    return base;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function setEquipSlot(equip: any, slot: string, value: string) {
  switch (slot) {
    case 'weapon': equip.weapon = value; break;
    case 'shield': equip.shield = value; break;
    case 'armor': equip.armor = value; break;
    case 'helm': equip.helm = value; break;
    case 'cloak': equip.cloak = value; break;
    case 'boots': equip.boots = value; break;
    case 'ring1': equip.ring1 = value; break;
    case 'ring2': equip.ring2 = value; break;
    case 'amulet': equip.amulet = value; break;
  }
}
function sanitizeName(n: string): string {
  return n.replace(/[<>"&]/g, '').slice(0, 16) || '익명';
}
function filterProfanity(text: string): string {
  let out = text;
  for (const w of [...PROFANITY_KO, ...PROFANITY_EN]) {
    const re = new RegExp(w, 'gi');
    out = out.replace(re, '*'.repeat(w.length));
  }
  return out;
}
