import Phaser from 'phaser';
import { NetClient } from '../network/ColyseusClient.js';
import { getInventory, setInventory } from './state.js';
import { ALL_ITEMS } from '../data/items.js';

export class InventoryModal {
  private static visible = false;

  static init(scene: Phaser.Scene) {
    scene.events.on('inventory:update', (entries: any[]) => {
      setInventory(entries);
      if (this.visible) this.render();
    });
  }

  static toggle() { this.visible ? this.hide() : this.show(); }

  static show() {
    this.visible = true;
    this.render();
  }
  static hide() {
    this.visible = false;
    document.getElementById('inv-backdrop')?.remove();
  }

  private static render() {
    document.getElementById('inv-backdrop')?.remove();
    const root = document.getElementById('ui-root')!;
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.id = 'inv-backdrop';
    const items = getInventory();

    bd.innerHTML = `
      <div class="modal-window">
        <button class="modal-close" id="inv-close">✕</button>
        <div class="modal-title">⚔ 가방 ⚔</div>
        <div class="inv-grid" id="inv-grid">
          ${this.gridCellsHtml(items)}
        </div>
        <div style="margin-top: 14px; font-size: 12px; color: var(--color-text-secondary); text-align:center;">
          왼클릭: 사용/장착 · 우클릭: 판매 · 드래그: 이동
        </div>
      </div>
    `;
    root.appendChild(bd);

    document.getElementById('inv-close')?.addEventListener('click', () => this.hide());
    bd.addEventListener('click', (e) => { if (e.target === bd) this.hide(); });

    document.querySelectorAll<HTMLElement>('#inv-grid .inv-cell[data-entry]').forEach(cell => {
      const entryId = cell.dataset.entry!;
      cell.addEventListener('click', () => this.useOrEquip(entryId));
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.sell(entryId);
      });
    });
  }

  private static gridCellsHtml(items: any[]): string {
    const cellCount = 48;
    const cells: string[] = [];
    for (let i = 0; i < cellCount; i++) {
      const item = items[i];
      if (!item) {
        cells.push(`<div class="inv-cell"></div>`);
        continue;
      }
      const def = ALL_ITEMS.find((d: any) => d.id === item.item_id);
      const name = def?.name_ko ?? item.item_id;
      const qty = item.quantity > 1 ? `<span class="qty">${item.quantity}</span>` : '';
      const ench = item.enchant_level > 0 ? `<span class="enchant">+${item.enchant_level}</span>` : '';
      const colorByCat = colorForCategory(def?.category);
      cells.push(`
        <div class="inv-cell" data-entry="${item.id}" title="${name} ${item.enchant_level > 0 ? '+' + item.enchant_level : ''}">
          <div style="position:absolute; inset:6px; background: ${colorByCat}; border-radius: 3px; opacity: 0.85;"></div>
          ${ench}
          ${qty}
          <div style="position:absolute; bottom:14px; left:0; right:0; text-align:center; font-size:9px; color: white; text-shadow: 0 1px 2px black;">${name.slice(0, 4)}</div>
        </div>
      `);
    }
    return cells.join('');
  }

  private static useOrEquip(entryId: string) {
    const items = getInventory();
    const it = items.find(i => i.id === entryId);
    if (!it) return;
    const def = ALL_ITEMS.find((d: any) => d.id === it.item_id);
    if (!def) return;

    if (def.category === 'potion' || def.category === 'scroll') {
      NetClient.inst.send('use_item', { inventoryEntryId: entryId });
    } else if (def.category === 'transform_stone') {
      NetClient.inst.send('transform', { stoneInventoryEntryId: entryId });
    } else if (['weapon', 'armor', 'helm', 'cloak', 'boots', 'ring', 'amulet'].includes(def.category)) {
      if (it.is_equipped) NetClient.inst.send('unequip_item', { slot: it.equipped_slot });
      else NetClient.inst.send('equip_item', { inventoryEntryId: entryId });
    }
  }

  private static sell(entryId: string) {
    if (!confirm('이 아이템을 1개 판매하시겠습니까?')) return;
    NetClient.inst.send('shop_sell', { inventoryEntryId: entryId, quantity: 1 });
  }
}

function colorForCategory(cat: string | undefined): string {
  switch (cat) {
    case 'weapon': return '#B33A3A';
    case 'armor': return '#4F46E5';
    case 'helm': return '#6366F1';
    case 'potion': return '#22C55E';
    case 'scroll': return '#FCD34D';
    case 'runebook': return '#A855F7';
    case 'transform_stone': return '#F59E0B';
    case 'unique': return '#EC4899';
    case 'legendary': return '#FB923C';
    case 'material': return '#94A3B8';
    default: return '#475569';
  }
}
