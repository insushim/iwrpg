import { Schema, type, MapSchema } from '@colyseus/schema';
import { PlayerState } from './PlayerState.js';
import { MonsterState } from './MonsterState.js';
import { DropState } from './DropState.js';

export class WorldState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: MonsterState }) monsters = new MapSchema<MonsterState>();
  @type({ map: DropState }) drops = new MapSchema<DropState>();
  @type('string') mapId: string = '';
  @type('uint16') mapWidth: number = 60;
  @type('uint16') mapHeight: number = 60;
  @type('uint32') tickCount: number = 0;
  @type('boolean') isSafeZone: boolean = false;
}
