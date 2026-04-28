import Phaser from 'phaser';
import { NetClient } from '../network/ColyseusClient.js';
import { ALL_ITEMS } from '../data/items.js';

interface NPCDialog {
  npcId: string;
  name_ko: string;
  role: string;
  dialog: string;
  shop_inventory?: { item_id: string; price_override?: number; stock: number }[];
  services?: string[];
}

export class NPCDialogModal {
  static init(scene: Phaser.Scene) {
    scene.events.on('hud:npc_dialog', (msg: NPCDialog) => this.show(msg));
  }

  static show(msg: NPCDialog) {
    document.getElementById('npc-backdrop')?.remove();
    const root = document.getElementById('ui-root')!;
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.id = 'npc-backdrop';
    const shopHtml = msg.shop_inventory
      ? `
        <div style="margin-top: 18px; border-top: 1px solid var(--color-border-subtle); padding-top: 14px;">
          <div style="font-family: var(--font-display); color: var(--color-accent-gold); margin-bottom: 10px;">상점</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 240px; overflow-y: auto;">
            ${msg.shop_inventory.map(s => {
              const def = ALL_ITEMS.find((d: any) => d.id === s.item_id);
              const price = s.price_override ?? def?.buy_price ?? 0;
              return `<button class="shop-buy-btn" data-id="${s.item_id}" style="background: var(--color-bg-elevated); border: 1px solid var(--color-border-subtle); padding: 8px; border-radius: 4px; color: var(--color-text-primary); cursor: pointer; text-align: left; font-size: 13px;">
                <div style="font-weight: 600;">${def?.name_ko ?? s.item_id}</div>
                <div style="font-size: 11px; color: var(--color-accent-gold);">${price} 골드</div>
              </button>`;
            }).join('')}
          </div>
        </div>`
      : '';

    bd.innerHTML = `
      <div class="modal-window" style="max-width: 560px;">
        <button class="modal-close" id="npc-close">✕</button>
        <div class="modal-title">${escapeHtml(msg.name_ko)}</div>
        <div style="text-align: center; color: var(--color-text-secondary); font-size: 12px; margin-bottom: 16px;">
          ${msg.role}
        </div>
        <div style="background: var(--color-bg-deep); padding: 14px; border-radius: 6px; font-size: 14px; line-height: 1.6;">
          "${escapeHtml(msg.dialog)}"
        </div>
        ${shopHtml}
      </div>
    `;
    root.appendChild(bd);
    document.getElementById('npc-close')?.addEventListener('click', () => this.hide());
    bd.addEventListener('click', e => { if (e.target === bd) this.hide(); });
    document.querySelectorAll<HTMLButtonElement>('.shop-buy-btn').forEach(b => {
      b.addEventListener('click', () => {
        NetClient.inst.send('shop_buy', { npcId: msg.npcId, itemId: b.dataset.id, quantity: 1 });
      });
    });
  }

  static hide() {
    document.getElementById('npc-backdrop')?.remove();
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
