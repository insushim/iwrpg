import { Schema, type } from '@colyseus/schema';

export class DropState extends Schema {
  @type('string') id: string = '';
  @type('string') itemId: string = '';
  @type('uint16') quantity: number = 1;
  @type('uint8') enchantLevel: number = 0;
  @type('uint16') x: number = 0;
  @type('uint16') y: number = 0;
  @type('uint32') expiresAt: number = 0;
  @type('string') ownerCharacterId: string = '';   // first-pickup priority for X seconds
  @type('uint32') ownerExpiresAt: number = 0;
}
