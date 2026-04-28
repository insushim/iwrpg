import type { PlayerState } from '../rooms/schemas/PlayerState.js';
import type { MonsterState } from '../rooms/schemas/MonsterState.js';
import { calcDamage, critChance, CLASSES, type ClassId } from 'shared';
import { ALL_MONSTERS } from '../data/monsters-data.js';
import { ALL_ITEMS } from '../data/items-data.js';

export interface DamageEvent {
  damage: number;
  isCrit: boolean;
  killed: boolean;
}

export class CombatResolver {
  /** Resolve damage on a CORRECT quiz answer. */
  static playerHitsMonster(player: PlayerState, monster: MonsterState): DamageEvent {
    const cls = CLASSES[player.classId as ClassId];
    if (!cls) return { damage: 1, isCrit: false, killed: false };

    // Pull weapon stats from equipped item (if any)
    const weaponDef = ALL_ITEMS.find(i => i.id === player.equip.weapon);
    const weaponBonus = weaponDef?.base_stats.atk ?? 0;
    // Enchant bonus is parsed later from inventory; for now estimate via equipped enchant level (TODO: pass via PlayerState extension)
    const enchantBonus = 0;
    const monsterDef = ALL_MONSTERS.find(m => m.id === monster.defId);
    const targetDef = monsterDef?.def ?? 0;

    const baseDamage = 5 + Math.floor(player.level * 1.2);
    const isCrit = Math.random() < critChance(player.stats.dex);
    const damage = calcDamage({
      baseDamage,
      str: player.stats.str,
      weaponBonus,
      enchantBonus,
      targetDef,
      isCrit,
    });

    monster.hp -= damage;
    const killed = monster.hp <= 0;
    if (killed) {
      monster.hp = 0;
      monster.aiState = 'dead';
    }
    return { damage, isCrit, killed };
  }

  /** Monster attacks player (every attack tick). */
  static monsterHitsPlayer(monster: MonsterState, player: PlayerState): DamageEvent {
    const monsterDef = ALL_MONSTERS.find(m => m.id === monster.defId);
    const baseAtk = monsterDef?.atk ?? 5;
    const armorDef = ALL_ITEMS.find(i => i.id === player.equip.armor);
    const helmDef = ALL_ITEMS.find(i => i.id === player.equip.helm);
    const totalDef = (armorDef?.base_stats.def ?? 0) + (helmDef?.base_stats.def ?? 0) + player.stats.con;

    const damage = Math.max(1, Math.floor(baseAtk * (1 - totalDef * 0.012)));
    player.hp = Math.max(0, player.hp - damage);
    const killed = player.hp <= 0;
    return { damage, isCrit: false, killed };
  }
}
