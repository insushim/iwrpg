import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

export class StatBlock extends Schema {
  @type('uint16') str: number = 10;
  @type('uint16') con: number = 10;
  @type('uint16') dex: number = 10;
  @type('uint16') int: number = 10;
  @type('uint16') wis: number = 10;
}

export class PlayerEquip extends Schema {
  @type('string') weapon: string = '';
  @type('string') shield: string = '';
  @type('string') armor: string = '';
  @type('string') helm: string = '';
  @type('string') cloak: string = '';
  @type('string') boots: string = '';
  @type('string') ring1: string = '';
  @type('string') ring2: string = '';
  @type('string') amulet: string = '';
}

export class PlayerState extends Schema {
  @type('string') id: string = '';
  @type('string') sessionId: string = '';
  @type('string') name: string = 'Hero';
  @type('string') classId: string = 'iron-sentinel';
  @type('uint16') level: number = 1;
  @type('uint32') exp: number = 0;
  @type('int16') hp: number = 50;
  @type('int16') maxHp: number = 50;
  @type('int16') mp: number = 20;
  @type('int16') maxMp: number = 20;
  @type('uint16') x: number = 30;
  @type('uint16') y: number = 30;
  @type('int16') alignment: number = 0;
  @type('uint32') gold: number = 100;
  @type('uint8') statPointsAvailable: number = 0;
  @type(StatBlock) stats: StatBlock = new StatBlock();
  @type(PlayerEquip) equip: PlayerEquip = new PlayerEquip();
  @type('string') currentMap: string = 'aurora_town';
  @type('boolean') isInQuiz: boolean = false;
  @type('string') transformId: string = '';
  @type('uint32') transformEndsAt: number = 0;
  @type('string') grade: string = 'g5';
  @type('uint8') gachaTokensToday: number = 0;
  @type('uint32') gachaTokenResetAt: number = 0;
  @type('uint8') quizStreak: number = 0;
}
