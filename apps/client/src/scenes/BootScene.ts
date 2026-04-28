import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    // Show progress bar
    const w = this.scale.width;
    const h = this.scale.height;
    const barBg = this.add.rectangle(w/2, h/2, 320, 16, 0x1F2530).setStrokeStyle(1, 0x2A3140);
    const bar = this.add.rectangle(w/2 - 160, h/2, 0, 14, 0xC9A227).setOrigin(0, 0.5);
    const text = this.add.text(w/2, h/2 - 36, '에셋 불러오는 중', {
      fontFamily: 'Cinzel, serif',
      fontSize: '18px',
      color: '#D4A857',
    }).setOrigin(0.5);

    this.load.on('progress', (p: number) => { bar.width = 318 * p; });

    // === Real codex-generated assets (load first; placeholder fallback if 404) ===
    // Characters: idle frame as the main sprite
    this.load.image('char_aether-lord', 'assets/img/characters/aether_lord/idle_0.png');
    this.load.image('char_iron-sentinel', 'assets/img/characters/iron_sentinel/idle_0.png');
    this.load.image('char_sylvan-ranger', 'assets/img/characters/sylvan_ranger/idle_0.png');
    this.load.image('char_rune-weaver', 'assets/img/characters/rune_weaver/idle_0.png');

    // Monsters: pick representative sprite per tier
    this.load.image('mon_t1', 'assets/img/monsters/tier12_0.png');
    this.load.image('mon_t2', 'assets/img/monsters/tier12_4.png');
    this.load.image('mon_t3', 'assets/img/monsters/tier3_0.png');
    this.load.image('mon_t4', 'assets/img/monsters/tier4_0.png');
    this.load.image('mon_t5', 'assets/img/monsters/tier5_0.png');
    this.load.image('mon_named', 'assets/img/monsters/tier4_3.png');
    this.load.image('mon_boss', 'assets/img/monsters/tier5_5.png');

    // UI
    this.load.image('ui_panel', 'assets/img/ui/panel_9slice.png');

    // === Priority-2: village buildings ===
    this.load.image('bld_house', 'assets/img/scenery/building_house.png');
    this.load.image('bld_shop', 'assets/img/scenery/building_shop.png');
    this.load.image('bld_inn', 'assets/img/scenery/building_inn.png');
    this.load.image('bld_smith', 'assets/img/scenery/building_smith.png');
    this.load.image('bld_temple', 'assets/img/scenery/building_temple.png');
    this.load.image('bld_bank', 'assets/img/scenery/building_bank.png');
    this.load.image('bld_gacha', 'assets/img/scenery/building_gacha.png');
    this.load.image('bld_fountain', 'assets/img/scenery/building_fountain.png');

    // === Priority-2: Aurora Town NPC sprites ===
    for (let i = 0; i < 12; i++) {
      this.load.image(`npc_aurora_${i}`, `assets/img/npcs/aurora_npc_${i}.png`);
    }

    // === Character 8-direction walk frames (loaded for animation) ===
    for (const cls of ['aether_lord', 'iron_sentinel', 'sylvan_ranger', 'rune_weaver']) {
      for (let i = 0; i < 8; i++) {
        this.load.image(`char_${cls}_walk_${i}`, `assets/img/characters/${cls}/walk8_${i}.png`);
      }
    }

    // Mark loaders as optional (don't error on 404)
    this.load.on('loaderror', (file: any) => {
      console.warn('[BootScene] missing asset:', file.key, '— procedural fallback');
    });
  }

  create() {
    this.generatePlaceholderTextures();
    this.scene.start('LoginScene');
  }

  /** Generate procedural placeholder textures so the game can run before codex assets arrive. */
  private generatePlaceholderTextures() {
    // Tiles always procedural (32×32 mosaic — codex tilesets are 1024×1024 atlases, used differently)
    this.makeColorTile('tile_grass', 0x2D4F30, 0x3A6240);
    this.makeColorTile('tile_dirt', 0x5C3D24, 0x4A2D1A);
    this.makeColorTile('tile_stone', 0x4A4F58, 0x363B43);
    this.makeColorTile('tile_water', 0x1E3A5F, 0x162B47);
    this.makeColorTile('tile_wood', 0x4A2C19, 0x3A2010);
    this.makeColorTile('tile_marble', 0xE5E1D5, 0xCFCBC0);

    // Character placeholder — only if real codex art failed to load
    if (!this.textures.exists('char_aether-lord')) this.makeCharSprite('char_aether-lord', 0x4F46E5, 'A');
    if (!this.textures.exists('char_iron-sentinel')) this.makeCharSprite('char_iron-sentinel', 0x78716C, 'I');
    if (!this.textures.exists('char_sylvan-ranger')) this.makeCharSprite('char_sylvan-ranger', 0x059669, 'S');
    if (!this.textures.exists('char_rune-weaver')) this.makeCharSprite('char_rune-weaver', 0x9333EA, 'R');

    // Monster placeholder — only if real codex sprite failed
    if (!this.textures.exists('mon_t1')) this.makeMonsterSprite('mon_t1', 0x84CC16);
    if (!this.textures.exists('mon_t2')) this.makeMonsterSprite('mon_t2', 0x06B6D4);
    if (!this.textures.exists('mon_t3')) this.makeMonsterSprite('mon_t3', 0xF59E0B);
    if (!this.textures.exists('mon_t4')) this.makeMonsterSprite('mon_t4', 0xE11D48);
    if (!this.textures.exists('mon_t5')) this.makeMonsterSprite('mon_t5', 0x7E22CE);
    if (!this.textures.exists('mon_named')) this.makeMonsterSprite('mon_named', 0xFCD34D);
    if (!this.textures.exists('mon_boss')) this.makeMonsterSprite('mon_boss', 0xF97316);

    // NPC marker
    this.makeCharSprite('npc_default', 0xFBBF24, 'N');

    // Drop item
    const g = this.add.graphics();
    g.fillStyle(0xC9A227, 1);
    g.fillCircle(8, 8, 6);
    g.lineStyle(1, 0xFFD700);
    g.strokeCircle(8, 8, 6);
    g.generateTexture('drop_marker', 16, 16);
    g.destroy();

    // ========= Scenery (procedural buildings, trees, rocks, fountain) =========
    // House — wooden walls + tile roof
    const h = this.add.graphics();
    h.fillStyle(0x6B4423, 1); h.fillRect(2, 18, 28, 18);     // wall
    h.fillStyle(0x4A2C19, 1); h.fillRect(2, 18, 28, 2);       // wall top trim
    h.fillStyle(0x8B2E2E, 1); h.fillTriangle(0, 18, 16, 4, 32, 18);  // roof
    h.fillStyle(0x6B1F1F, 1); h.fillTriangle(0, 18, 16, 6, 32, 18);
    h.fillStyle(0x2A1810, 1); h.fillRect(13, 24, 6, 12);      // door
    h.fillStyle(0xFCD34D, 0.8); h.fillRect(6, 22, 4, 4); h.fillRect(22, 22, 4, 4); // windows
    h.generateTexture('scenery_house', 32, 38);
    h.destroy();

    // Shop — bigger, with banner
    const s = this.add.graphics();
    s.fillStyle(0x7A4F2A, 1); s.fillRect(2, 20, 36, 22);
    s.fillStyle(0xC9A227, 1); s.fillTriangle(0, 20, 20, 4, 40, 20);  // golden roof
    s.fillStyle(0xA08233, 1); s.fillTriangle(0, 20, 20, 7, 40, 20);
    s.fillStyle(0xB33A3A, 1); s.fillRect(36, 8, 3, 12);  // flag pole
    s.fillStyle(0xC9A227, 1); s.fillTriangle(39, 8, 48, 12, 39, 16);
    s.fillStyle(0x2A1810, 1); s.fillRect(17, 30, 6, 12);
    s.fillStyle(0xE8E1C9, 0.7); s.fillRect(7, 24, 5, 5); s.fillRect(28, 24, 5, 5);
    s.generateTexture('scenery_shop', 48, 44);
    s.destroy();

    // Inn — large, multi-window
    const i = this.add.graphics();
    i.fillStyle(0x7A4F2A, 1); i.fillRect(2, 22, 44, 26);
    i.fillStyle(0x4A2D1A, 1); i.fillRect(2, 22, 44, 3);
    i.fillStyle(0x4A2C19, 1); i.fillTriangle(0, 22, 24, 5, 48, 22);
    i.fillStyle(0x2D2010, 1); i.fillTriangle(0, 22, 24, 8, 48, 22);
    i.fillStyle(0x2A1810, 1); i.fillRect(20, 34, 8, 14);
    i.fillStyle(0xFCD34D, 0.85); i.fillRect(6, 28, 5, 5); i.fillRect(15, 28, 5, 5); i.fillRect(28, 28, 5, 5); i.fillRect(37, 28, 5, 5);
    i.generateTexture('scenery_inn', 48, 48);
    i.destroy();

    // Temple/altar — marble + golden orb
    const t1 = this.add.graphics();
    t1.fillStyle(0xCFCBC0, 1); t1.fillRect(2, 14, 28, 26);
    t1.fillStyle(0xE5E1D5, 1); t1.fillTriangle(0, 14, 16, 0, 32, 14);
    t1.fillStyle(0xC9A227, 1); t1.fillCircle(16, 22, 5);
    t1.lineStyle(2, 0xFFD700, 1); t1.strokeCircle(16, 22, 7);
    t1.fillStyle(0x2A1810, 1); t1.fillRect(13, 30, 6, 10);
    t1.generateTexture('scenery_temple', 32, 40);
    t1.destroy();

    // Fountain — circular blue water + stone rim
    const f = this.add.graphics();
    f.fillStyle(0x363B43, 1); f.fillCircle(20, 20, 18);
    f.fillStyle(0x4A4F58, 1); f.fillCircle(20, 20, 16);
    f.fillStyle(0x1E3A5F, 1); f.fillCircle(20, 20, 12);
    f.fillStyle(0x7DD3FC, 0.8); f.fillCircle(20, 20, 8);
    f.fillStyle(0xCFCBC0, 1); f.fillCircle(20, 20, 3);
    f.fillStyle(0xE5E1D5, 0.9); f.fillCircle(20, 18, 1.5);
    f.generateTexture('scenery_fountain', 40, 40);
    f.destroy();

    // Tree — pine cluster
    const tr = this.add.graphics();
    tr.fillStyle(0x4A2C19, 1); tr.fillRect(10, 22, 4, 8);    // trunk
    tr.fillStyle(0x1F3A1A, 1); tr.fillTriangle(0, 24, 12, 4, 24, 24);
    tr.fillStyle(0x2D5030, 1); tr.fillTriangle(2, 22, 12, 6, 22, 22);
    tr.fillStyle(0x3A6240, 1); tr.fillTriangle(4, 18, 12, 8, 20, 18);
    tr.fillStyle(0x4A7848, 1); tr.fillTriangle(5, 14, 12, 10, 19, 14);
    tr.generateTexture('scenery_tree', 24, 30);
    tr.destroy();

    // Rock — gray boulder
    const r = this.add.graphics();
    r.fillStyle(0x363B43, 1); r.fillCircle(10, 12, 9);
    r.fillStyle(0x4A4F58, 1); r.fillCircle(10, 11, 8);
    r.fillStyle(0x6B7280, 0.7); r.fillCircle(8, 9, 3);
    r.generateTexture('scenery_rock', 20, 22);
    r.destroy();

    // Bush — green tuft
    const b = this.add.graphics();
    b.fillStyle(0x2D4F30, 1); b.fillCircle(8, 10, 7);
    b.fillStyle(0x3A6240, 1); b.fillCircle(7, 9, 6);
    b.fillStyle(0x4A7848, 0.8); b.fillCircle(6, 8, 3);
    b.generateTexture('scenery_bush', 16, 18);
    b.destroy();

    // Banner — fabric flag
    const bn = this.add.graphics();
    bn.fillStyle(0x4A2C19, 1); bn.fillRect(7, 0, 2, 24);     // pole
    bn.fillStyle(0xC9A227, 1); bn.fillTriangle(9, 4, 18, 8, 9, 14);
    bn.fillStyle(0xB33A3A, 1); bn.fillRect(9, 4, 9, 2);
    bn.generateTexture('scenery_banner', 18, 24);
    bn.destroy();

    // Lantern — glowing fire
    const ln = this.add.graphics();
    ln.fillStyle(0x4A2C19, 1); ln.fillRect(6, 0, 2, 8);
    ln.fillStyle(0xFCD34D, 1); ln.fillCircle(7, 12, 5);
    ln.fillStyle(0xF97316, 0.8); ln.fillCircle(7, 11, 3);
    ln.fillStyle(0xFFD700, 1); ln.fillCircle(7, 10, 1.5);
    ln.generateTexture('scenery_lantern', 14, 18);
    ln.destroy();

    // Tap target indicator
    const t = this.add.graphics();
    t.lineStyle(2, 0x7DD3FC, 0.8);
    t.strokeCircle(16, 16, 14);
    t.generateTexture('tap_target', 32, 32);
    t.destroy();
  }

  private makeColorTile(key: string, primary: number, accent: number) {
    const g = this.add.graphics();
    g.fillStyle(primary, 1); g.fillRect(0, 0, 32, 32);
    g.fillStyle(accent, 1);
    g.fillRect(0, 0, 32, 1); g.fillRect(0, 31, 32, 1);
    g.fillRect(0, 0, 1, 32); g.fillRect(31, 0, 1, 32);
    // dot pattern
    g.fillStyle(accent, 0.5);
    g.fillRect(8, 8, 2, 2); g.fillRect(22, 14, 2, 2); g.fillRect(14, 22, 2, 2);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makeCharSprite(key: string, color: number, initial: string) {
    const g = this.add.graphics();
    // body
    g.fillStyle(0x000000, 0.5);
    g.fillCircle(16, 18, 12);
    g.fillStyle(color, 1);
    g.fillCircle(16, 16, 11);
    // border
    g.lineStyle(2, 0xC9A227, 1);
    g.strokeCircle(16, 16, 11);
    g.generateTexture(key, 32, 32);
    g.destroy();

    // We'll render the initial as a separate text at runtime via Container.
  }

  private makeMonsterSprite(key: string, color: number) {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillCircle(14, 16, 11);
    g.fillStyle(color, 1);
    g.fillCircle(14, 14, 10);
    g.lineStyle(1, 0xB33A3A, 1);
    g.strokeCircle(14, 14, 10);
    // angry eyes
    g.fillStyle(0xFFFFFF, 1);
    g.fillRect(10, 11, 2, 2);
    g.fillRect(16, 11, 2, 2);
    g.generateTexture(key, 28, 28);
    g.destroy();
  }
}
