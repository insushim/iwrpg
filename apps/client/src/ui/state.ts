// Convenience accessors over Colyseus state.
import { NetClient } from '../network/ColyseusClient.js';

export function getMyChar(): any | null {
  const charPayload = JSON.parse(sessionStorage.getItem('rwc-char') ?? '{}');
  const charId = charPayload.charId;
  if (!charId) return null;
  return (NetClient.inst.worldRoom?.state as any)?.players?.get(charId) ?? null;
}

let inventoryEntries: any[] = [];
export function setInventory(entries: any[]) { inventoryEntries = entries ?? []; }
export function getInventory(): any[] { return inventoryEntries; }

// Bind inventory updates from world scene
export function bindInventoryListener(scene: any) {
  scene.events.on('inventory:update', (entries: any[]) => setInventory(entries));
}
