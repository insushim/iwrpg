import { Client, Room } from 'colyseus.js';

export class NetClient {
  private static _inst: NetClient | null = null;
  client: Client;
  worldRoom: Room | null = null;
  charPayload: any = null;
  private currentMap: string = '';
  private reconnecting = false;
  private heartbeatTimer: any = null;
  private listeners: Array<{ type: string; cb: (msg: any) => void }> = [];
  onReconnected?: () => void;
  onDisconnected?: () => void;
  /** Track last known position so we can resume there on reconnect (avoid respawn at STARTING). */
  lastKnownPos: { x?: number; y?: number; map?: string } = {};

  /** Force a full reconnect — closes room, joins fresh (with last known position), fires onReconnected. */
  async forceReconnect(): Promise<void> {
    this.stopHeartbeat();
    if (this.worldRoom) {
      try { await this.worldRoom.leave(true); } catch {}
      this.worldRoom = null;
    }
    if (!this.charPayload || !this.currentMap) return;
    const payload = { ...this.charPayload };
    if (this.lastKnownPos.x !== undefined && this.lastKnownPos.map === this.currentMap) {
      payload.x = this.lastKnownPos.x;
      payload.y = this.lastKnownPos.y;
    }
    try {
      this.worldRoom = await this.client.joinOrCreate(`world_${this.currentMap}`, payload);
      this.installLifecycle();
      this.startHeartbeat();
      this.onReconnected?.();
    } catch (e) {
      console.warn('[NetClient] forceReconnect failed', e);
    }
  }

  private constructor() {
    const wsUrl = (import.meta as any).env?.VITE_SERVER_WS ?? 'ws://localhost:2567';
    this.client = new Client(wsUrl);
  }
  static get inst(): NetClient {
    if (!this._inst) this._inst = new NetClient();
    return this._inst;
  }

  setCharPayload(p: any) { this.charPayload = p; }

  async joinWorld(mapId: string, spawnAt?: { x: number; y: number }): Promise<Room> {
    if (this.worldRoom) {
      try { await this.worldRoom.leave(); } catch {}
    }
    const payload = { ...this.charPayload };
    if (spawnAt) {
      payload.x = spawnAt.x;
      payload.y = spawnAt.y;
    }
    this.worldRoom = await this.client.joinOrCreate(`world_${mapId}`, payload);
    this.currentMap = mapId;
    // Update lastKnownPos to the portal target so subsequent reconnects don't snap to STARTING
    if (spawnAt) this.lastKnownPos = { x: spawnAt.x, y: spawnAt.y, map: mapId };
    this.installLifecycle();
    this.startHeartbeat();
    return this.worldRoom;
  }

  private installLifecycle() {
    if (!this.worldRoom) return;
    this.worldRoom.onLeave((code: number) => {
      console.warn('[NetClient] room left, code=', code);
      this.stopHeartbeat();
      // 1000 = normal close (changing map intentionally). 1006 = abnormal (network drop).
      if (code !== 1000 && this.charPayload && this.currentMap) {
        this.attemptReconnect();
      }
    });
    this.worldRoom.onError((code: number, msg?: string) => {
      console.warn('[NetClient] room error', code, msg);
    });
  }

  private async attemptReconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    this.onDisconnected?.();
    const token = this.worldRoom?.reconnectionToken;
    let attempt = 0;
    while (attempt < 6 && this.charPayload) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise(r => setTimeout(r, delay));
      try {
        if (token && attempt === 0) {
          console.log('[NetClient] reconnecting with token…');
          this.worldRoom = await (this.client as any).reconnect(token);
        } else {
          // Fallback: fresh join with last known position so server doesn't respawn at STARTING
          const payload = { ...this.charPayload };
          if (this.lastKnownPos.x !== undefined && this.lastKnownPos.map === this.currentMap) {
            payload.x = this.lastKnownPos.x;
            payload.y = this.lastKnownPos.y;
          }
          console.log(`[NetClient] reconnect attempt ${attempt + 1} → ${this.currentMap}`);
          this.worldRoom = await this.client.joinOrCreate(`world_${this.currentMap}`, payload);
        }
        this.installLifecycle();
        this.startHeartbeat();
        this.reconnecting = false;
        this.onReconnected?.();
        return;
      } catch (e) {
        console.warn('[NetClient] reconnect failed', e);
        attempt++;
      }
    }
    this.reconnecting = false;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      try { this.worldRoom?.send('ping', {}); } catch {}
    }, 15000);
  }
  private stopHeartbeat() {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  send(type: string, msg: any) {
    if (this.worldRoom && !this.reconnecting) {
      try { this.worldRoom.send(type, msg); } catch (e) {
        console.warn('[NetClient] send failed', type, e);
      }
    }
  }

  on(type: string, cb: (msg: any) => void) {
    if (this.worldRoom) this.worldRoom.onMessage(type, cb);
  }
}
