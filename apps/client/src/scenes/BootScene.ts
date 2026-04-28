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

    // Try to load real assets — if they exist
    // (codex CLI will populate these later — for now we generate placeholder textures programmatically)
    this.load.image('bg_aurora_town', 'assets/img/tiles/aurora_town_bg.png');
    this.load.image('player_aether-lord', 'assets/img/characters/aether_lord_concept.png');
    this.load.image('player_iron-sentinel', 'assets/img/characters/iron_sentinel_concept.png');
    this.load.image('player_sylvan-ranger', 'assets/img/characters/sylvan_ranger_concept.png');
    this.load.image('player_rune-weaver', 'assets/img/characters/rune_weaver_concept.png');

    // Mark loaders as optional (don't error on 404)
    this.load.on('loaderror', (file: any) => {
      console.warn('[BootScene] missing asset:', file.key, '— will use procedural placeholder');
    });
  }

  create() {
    this.generatePlaceholderTextures();
    this.scene.start('LoginScene');
  }

  /** Generate procedural placeholder textures so the game can run before codex assets arrive. */
  private generatePlaceholderTextures() {
    // Tile (32x32 grass for towns, dirt for fields)
    this.makeColorTile('tile_grass', 0x2D4F30, 0x3A6240);
    this.makeColorTile('tile_dirt', 0x5C3D24, 0x4A2D1A);
    this.makeColorTile('tile_stone', 0x4A4F58, 0x363B43);
    this.makeColorTile('tile_water', 0x1E3A5F, 0x162B47);
    this.makeColorTile('tile_wood', 0x4A2C19, 0x3A2010);
    this.makeColorTile('tile_marble', 0xE5E1D5, 0xCFCBC0);

    // Character placeholders by class — simple colored circles with class initial
    this.makeCharSprite('char_aether-lord', 0x4F46E5, 'A');
    this.makeCharSprite('char_iron-sentinel', 0x78716C, 'I');
    this.makeCharSprite('char_sylvan-ranger', 0x059669, 'S');
    this.makeCharSprite('char_rune-weaver', 0x9333EA, 'R');

    // Monster placeholder colors by tier
    this.makeMonsterSprite('mon_t1', 0x84CC16);
    this.makeMonsterSprite('mon_t2', 0x06B6D4);
    this.makeMonsterSprite('mon_t3', 0xF59E0B);
    this.makeMonsterSprite('mon_t4', 0xE11D48);
    this.makeMonsterSprite('mon_t5', 0x7E22CE);
    this.makeMonsterSprite('mon_named', 0xFCD34D);
    this.makeMonsterSprite('mon_boss', 0xF97316);

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
