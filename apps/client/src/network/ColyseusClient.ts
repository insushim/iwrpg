import { Client, Room } from 'colyseus.js';

export class NetClient {
  private static _inst: NetClient | null = null;
  client: Client;
  worldRoom: Room | null = null;
  charPayload: any = null;

  private constructor() {
    const wsUrl = (import.meta as any).env?.VITE_SERVER_WS ?? 'ws://localhost:2567';
    this.client = new Client(wsUrl);
  }
  static get inst(): NetClient {
    if (!this._inst) this._inst = new NetClient();
    return this._inst;
  }

  setCharPayload(p: any) { this.charPayload = p; }

  async joinWorld(mapId: string): Promise<Room> {
    if (this.worldRoom) {
      try { await this.worldRoom.leave(); } catch {}
    }
    this.worldRoom = await this.client.joinOrCreate(`world_${mapId}`, this.charPayload);
    return this.worldRoom;
  }

  send(type: string, msg: any) {
    if (this.worldRoom) this.worldRoom.send(type, msg);
  }

  on(type: string, cb: (msg: any) => void) {
    if (this.worldRoom) this.worldRoom.onMessage(type, cb);
  }
}
