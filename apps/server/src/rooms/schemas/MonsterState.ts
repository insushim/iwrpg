import { Schema, type } from '@colyseus/schema';

export class MonsterState extends Schema {
  @type('string') id: string = '';
  @type('string') defId: string = '';      // refs MonsterDef.id
  @type('uint16') x: number = 0;
  @type('uint16') y: number = 0;
  @type('int32') hp: number = 0;
  @type('int32') maxHp: number = 0;
  @type('string') aiState: string = 'idle'; // idle/chase/attack/dead/return
  @type('string') targetPlayerId: string = '';
  @type('uint16') homeX: number = 0;
  @type('uint16') homeY: number = 0;
  @type('uint32') lastActionAt: number = 0;
  @type('boolean') isNamed: boolean = false;
  @type('boolean') isBoss: boolean = false;
  @type('string') displayNameKo: string = '';
}
