// World map / minimap modal — shows all 17 maps with current location highlighted.
// Read-only — teleporting between maps still goes through portals + NPCs.
import { ALL_MAPS } from '../data/maps/index.js';
import { NetClient } from '../network/ColyseusClient.js';
import { AudioManager } from '../systems/AudioManager.js';

interface MapNode {
  id: string;
  name_ko: string;
  level_band: [number, number];
  ambient: string;
  is_safe_zone: boolean;
  /** Layout position in the world atlas (relative cells, not pixel) */
  col: number;
  row: number;
}

// Hand-tuned layout for the 17 maps + 4 boss dungeons (rows go bottom→top in difficulty)
const ATLAS_LAYOUT: Record<string, [number, number]> = {
  // Row 0 — starter towns
  aurora_town:       [1, 0],
  treeshade_town:    [3, 0],
  // Row 1 — early hunting grounds (lv 1-15)
  aurora_fields:     [0, 1],
  forgotten_meadow:  [2, 1],
  whisper_woods:     [4, 1],
  // Row 2 — mid towns + grounds (lv 15-30)
  crimson_fortress:  [1, 2],
  starhaven:         [3, 2],
  sunken_mine:       [0, 2],
  mistwail_marsh:    [2, 3],
  azure_grove:       [4, 2],
  // Row 3 — advanced
  ruined_citadel:    [1, 3],
  ashen_caverns:     [3, 3],
  ruined_temple:     [4, 3],
  // Row 4 — endgame (lv 40+)
  pyre_peaks:        [0, 4],
  drakensvale:       [2, 4],
  aether_rift:       [4, 4],
  verity_citadel:    [3, 4],
};

const COLS = 5;
const ROWS = 5;

function buildNodes(): MapNode[] {
  const nodes: MapNode[] = [];
  for (const [id, def] of Object.entries(ALL_MAPS)) {
    const pos = ATLAS_LAYOUT[id] ?? [Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS)];
    nodes.push({
      id,
      name_ko: def.name_ko,
      level_band: def.level_band,
      ambient: def.ambient,
      is_safe_zone: def.is_safe_zone,
      col: pos[0],
      row: pos[1],
    });
  }
  return nodes.sort((a, b) => a.level_band[0] - b.level_band[0]);
}

const AMBIENT_COLOR: Record<string, string> = {
  town: '#D4A857',
  forest: '#4ADE80',
  cave: '#94A3B8',
  swamp: '#84CC16',
  fortress: '#EF4444',
  ruins: '#9CA3AF',
  temple: '#E5E1D5',
  fire: '#F97316',
  aether: '#7DD3FC',
  dragon: '#A855F7',
};

export class MinimapModal {
  private static visible = false;
  private static rootEl: HTMLDivElement | null = null;
  private static hoveredId: string | null = null;
  private static nodes: MapNode[] = [];

  static init(_worldScene: any): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.hide();
    });
  }

  static toggle(): void { this.visible ? this.hide() : this.show(); }

  static show(): void {
    if (this.visible) return;
    this.visible = true;
    AudioManager.playSfx('ui_open');
    this.nodes = buildNodes();
    if (!this.rootEl) {
      this.rootEl = document.createElement('div');
      this.rootEl.className = 'modal-backdrop';
      this.rootEl.id = 'minimap-backdrop';
      this.rootEl.addEventListener('click', (e) => {
        if (e.target === this.rootEl) this.hide();
      });
      document.getElementById('ui-root')?.appendChild(this.rootEl);
    }
    this.render();
    this.rootEl.style.display = 'flex';
  }

  static hide(): void {
    if (!this.visible) return;
    this.visible = false;
    AudioManager.playSfx('ui_close');
    if (this.rootEl) this.rootEl.style.display = 'none';
  }

  private static currentMapId(): string {
    return (NetClient.inst.worldRoom?.state as any)?.mapId ?? 'aurora_town';
  }

  private static render(): void {
    if (!this.rootEl) return;
    const currentId = this.currentMapId();
    const hovered = this.hoveredId ? this.nodes.find(n => n.id === this.hoveredId) : null;

    this.rootEl.innerHTML = `
      <div class="modal-window minimap-modal">
        <button class="modal-close" id="minimap-close">✕</button>
        <div class="modal-title">🗺️ 천공 대륙 · Aether Continent</div>
        <div class="minimap-legend">
          <span class="legend-item"><i style="background:${AMBIENT_COLOR.town}"></i>마을 (안전)</span>
          <span class="legend-item"><i style="background:${AMBIENT_COLOR.forest}"></i>숲</span>
          <span class="legend-item"><i style="background:${AMBIENT_COLOR.cave}"></i>동굴</span>
          <span class="legend-item"><i style="background:${AMBIENT_COLOR.fortress}"></i>요새</span>
          <span class="legend-item"><i style="background:${AMBIENT_COLOR.aether}"></i>에테르</span>
          <span class="legend-item"><i style="background:${AMBIENT_COLOR.dragon}"></i>용족</span>
        </div>
        <div class="minimap-grid" style="grid-template-columns: repeat(${COLS}, 1fr); grid-template-rows: repeat(${ROWS}, 1fr);">
          ${this.nodes.map(n => {
            const isCurrent = n.id === currentId;
            const color = AMBIENT_COLOR[n.ambient] ?? '#9CA3AF';
            return `
              <div class="map-cell ${isCurrent ? 'current' : ''} ${n.is_safe_zone ? 'safe' : ''}"
                   data-id="${n.id}"
                   style="grid-column:${n.col + 1};grid-row:${ROWS - n.row};border-color:${color};">
                <div class="map-cell-name">${escapeHtml(n.name_ko)}</div>
                <div class="map-cell-meta">Lv ${n.level_band[0]}–${n.level_band[1]}</div>
                ${isCurrent ? '<div class="map-cell-marker">✦ 현재 위치</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div class="minimap-detail" id="minimap-detail">
          ${hovered ? this.renderDetail(hovered, hovered.id === currentId) : '<div style="color:var(--color-text-muted)">맵을 가리키면 상세 정보가 표시됩니다.</div>'}
        </div>
        <div class="minimap-hint">
          맵 이동은 마을의 <b>전령 NPC</b> 또는 사냥터 가장자리의 <b>출입구</b>로만 가능합니다 (학급 모드).
        </div>
      </div>
    `;
    this.rootEl.querySelector('#minimap-close')?.addEventListener('click', () => this.hide());
    this.rootEl.querySelectorAll<HTMLElement>('.map-cell').forEach(cell => {
      cell.addEventListener('mouseenter', () => {
        this.hoveredId = cell.dataset.id ?? null;
        this.render();
      });
    });
  }

  private static renderDetail(node: MapNode, isCurrent: boolean): string {
    const safeBadge = node.is_safe_zone
      ? '<span class="badge safe">안전 지역</span>'
      : '<span class="badge danger">전투 가능</span>';
    return `
      <div class="minimap-detail-head">
        <span class="minimap-detail-name">${escapeHtml(node.name_ko)}</span>
        ${safeBadge}
        ${isCurrent ? '<span class="badge current">현재</span>' : ''}
      </div>
      <div class="minimap-detail-row">권장 레벨 <b>${node.level_band[0]} – ${node.level_band[1]}</b></div>
      <div class="minimap-detail-row">지형 <b>${ambientLabel(node.ambient)}</b></div>
    `;
  }
}

function ambientLabel(a: string): string {
  return ({
    town: '마을', forest: '숲', cave: '동굴', swamp: '늪지', fortress: '요새',
    ruins: '폐허', temple: '신전', fire: '화염지대', aether: '에테르', dragon: '용족 영지',
  } as Record<string, string>)[a] ?? a;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
