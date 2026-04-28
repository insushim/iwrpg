import { MonsterState } from '../rooms/schemas/MonsterState.js';
import type { WorldState } from '../rooms/schemas/WorldState.js';
import { ALL_MONSTERS, type MonsterDef } from '../data/monsters-data.js';
import { getMapDef, type MapSpawnPoint } from '../data/maps-data.js';

interface ActiveSpawn {
  spawnId: string;
  monsterId: string;
  defId: string;
  deadAt: number;
  respawnSec: number;
  homeX: number;
  homeY: number;
  pool: string[];
}

export class MonsterSpawner {
  private state: WorldState;
  private mapId: string;
  private active: Map<string, ActiveSpawn> = new Map();
  private nextMonsterIdCounter = 1;

  constructor(state: WorldState, mapId: string) {
    this.state = state;
    this.mapId = mapId;
  }

  initSpawns(): void {
    const mapDef = getMapDef(this.mapId);
    if (!mapDef || mapDef.is_safe_zone) return;
    for (const sp of mapDef.spawn_points) {
      this.spawnAt(sp);
    }
  }

  private spawnAt(sp: MapSpawnPoint, isInitial = true): void {
    const defId = sp.monster_pool[Math.floor(Math.random() * sp.monster_pool.length)];
    const def = ALL_MONSTERS.find(m => m.id === defId);
    if (!def) return;

    const monsterId = `mon_${this.mapId}_${this.nextMonsterIdCounter++}`;
    const m = new MonsterState();
    m.id = monsterId;
    m.defId = def.id;
    m.x = sp.x + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 2);
    m.y = sp.y + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 2);
    m.homeX = sp.x;
    m.homeY = sp.y;
    m.hp = def.hp;
    m.maxHp = def.max_hp;
    m.aiState = 'idle';
    m.isNamed = def.category === 'named';
    m.isBoss = def.category === 'world_boss';
    m.displayNameKo = def.name_ko;
    this.state.monsters.set(monsterId, m);

    this.active.set(sp.id + '|' + monsterId, {
      spawnId: sp.id,
      monsterId,
      defId: def.id,
      deadAt: 0,
      respawnSec: sp.respawn_sec,
      homeX: sp.x,
      homeY: sp.y,
      pool: sp.monster_pool,
    });
  }

  /** Called every tick. Handles death cleanup + respawn. */
  tick(now: number): void {
    // Detect deaths
    for (const [key, spawn] of this.active.entries()) {
      const m = this.state.monsters.get(spawn.monsterId);
      if (!m) continue;
      if (m.aiState === 'dead' && spawn.deadAt === 0) {
        spawn.deadAt = now;
        this.state.monsters.delete(spawn.monsterId);
      }
    }
    // Respawn
    for (const [key, spawn] of [...this.active.entries()]) {
      if (spawn.deadAt > 0 && now - spawn.deadAt >= spawn.respawnSec * 1000) {
        this.active.delete(key);
        const sp: MapSpawnPoint = {
          id: spawn.spawnId,
          x: spawn.homeX,
          y: spawn.homeY,
          monster_pool: spawn.pool,
          max_concurrent: 1,
          respawn_sec: spawn.respawnSec,
        };
        this.spawnAt(sp);
      }
    }
  }

  cleanup(): void {
    this.active.clear();
  }
}
