import { DropState } from '../rooms/schemas/DropState.js';
import type { WorldState } from '../rooms/schemas/WorldState.js';
import type { PlayerState } from '../rooms/schemas/PlayerState.js';
import type { MonsterState } from '../rooms/schemas/MonsterState.js';
import { ALL_MONSTERS } from '../data/monsters-data.js';
import { BASE_ITEM_DROP_CHANCE } from 'shared';

let dropIdCounter = 1;

export interface DropOutcome {
  exp: number;
  gold: number;
  drops: { itemId: string; quantity: number; enchant: number }[];
}

export class DropResolver {
  /** Determine rewards on a CORRECT-answer kill. */
  static rollKillRewards(monster: MonsterState, killer: PlayerState): DropOutcome {
    const def = ALL_MONSTERS.find(m => m.id === monster.defId);
    if (!def) return { exp: 0, gold: 0, drops: [] };

    const exp = def.exp_reward;
    const gold = randInt(def.gold_min, def.gold_max);
    const drops: { itemId: string; quantity: number; enchant: number }[] = [];

    for (const dr of def.drops) {
      // For named/boss "guaranteed" tribute materials marked with chance >= 1.0
      const roll = Math.random();
      if (roll < dr.chance) {
        drops.push({
          itemId: dr.item_id,
          quantity: randInt(dr.qty_min, dr.qty_max),
          enchant: 0,
        });
      }
    }
    return { exp, gold, drops };
  }

  /** Spawn drop entities into the world (visible to all players). */
  static spawnDrops(state: WorldState, mapId: string, x: number, y: number, drops: DropOutcome['drops'], ownerCharacterId: string): void {
    const now = Date.now();
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const drop = new DropState();
      drop.id = `drop_${mapId}_${dropIdCounter++}`;
      drop.itemId = d.itemId;
      drop.quantity = d.quantity;
      drop.enchantLevel = d.enchant;
      drop.x = x + (i % 3) - 1;
      drop.y = y + Math.floor(i / 3);
      drop.expiresAt = now + 60_000; // 60 sec on ground
      drop.ownerCharacterId = ownerCharacterId;
      drop.ownerExpiresAt = now + 10_000; // 10s priority window
      state.drops.set(drop.id, drop);
    }
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
