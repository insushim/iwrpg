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

    // One-time cache-bust. Earlier deploys served /assets with `immutable`, so browsers
    // pinned the OLD PNGs for a year and ignore hard-refresh. Appending a version query
    // changes the URL → forces a fresh fetch. Bump ASSET_V whenever stale art must be
    // flushed. (vercel.json now uses must-revalidate for media, so this is belt-and-braces.)
    const ASSET_V = '2';
    const _img = this.load.image.bind(this.load);
    (this.load as any).image = (key: string, url?: string | string[]) => {
      if (typeof url === 'string' && !url.includes('?')) url = `${url}?v=${ASSET_V}`;
      return _img(key, url as any);
    };

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

    // === Priority-2: Aurora Town NPC sprites (v1) ===
    for (let i = 0; i < 12; i++) {
      this.load.image(`npc_aurora_${i}`, `assets/img/npcs/aurora_npc_${i}.png`);
    }
    // === Priority-5: Aurora NPC v2 (clearer guard/bard) — overrides v1 if present ===
    for (let i = 0; i < 12; i++) {
      this.load.image(`npc_aurora_v2_${i}`, `assets/img/npcs/aurora_npc_v2_${i}.png`);
    }
    // === Priority-9: Aurora NPC v3 (full-body, no cropping) — preferred ===
    for (let i = 0; i < 12; i++) {
      this.load.image(`npc_aurora_v3_${i}`, `assets/img/npcs/aurora_npc_v3_${i}.png`);
    }
    // === Priority-9: Other towns NPC v2 (full-body) — preferred ===
    for (const town of ['treeshade', 'crimson', 'verity', 'starhaven']) {
      for (let i = 0; i < 8; i++) {
        this.load.image(`npc_${town}_v2_${i}`, `assets/img/npcs/${town}_npc_v2_${i}.png`);
      }
    }
    // === Priority-3: Treeshade NPCs (8) ===
    for (let i = 0; i < 8; i++) {
      this.load.image(`npc_treeshade_${i}`, `assets/img/npcs/treeshade_npc_${i}.png`);
    }
    // === Priority-4: 3 town NPC atlases (Crimson / Verity / Starhaven, 8 each) ===
    for (const town of ['crimson', 'verity', 'starhaven']) {
      for (let i = 0; i < 8; i++) {
        this.load.image(`npc_${town}_${i}`, `assets/img/npcs/${town}_npc_${i}.png`);
      }
    }

    // === Character 8-direction walk + 4-frame attack ===
    // classId uses hyphen (aether-lord) but file paths use underscore (aether_lord/...)
    for (const cls of ['aether-lord', 'iron-sentinel', 'sylvan-ranger', 'rune-weaver']) {
      const dir = cls.replace(/-/g, '_'); // directory name
      for (let i = 0; i < 8; i++) {
        this.load.image(`char_${cls}_walk_${i}`, `assets/img/characters/${dir}/walk8_${i}.png`);
      }
      for (let i = 0; i < 4; i++) {
        this.load.image(`char_${cls}_atk_${i}`, `assets/img/characters/${dir}/atk_${i}.png`);
      }
      // P9: 32-frame walk cycle (8 directions × 4 frames each) — used if generated
      for (let i = 0; i < 32; i++) {
        this.load.image(`char_${cls}_walk32_${i}`, `assets/img/characters/${dir}/walk32_${i}.png`);
      }
      // P10: 3-direction walk atlas (front/side/back × 4 frames) — primary anim source
      for (const row of ['front', 'side', 'back']) {
        for (let i = 0; i < 4; i++) {
          this.load.image(`char_${cls}_walk_${row}_${i}`, `assets/img/characters/${dir}/walk_${row}_${i}.png`);
        }
      }
    }

    // === Priority-4: Character portraits (CharCreate selection art) ===
    this.load.image('portrait_aether-lord', 'assets/img/portraits/aether_lord_portrait.png');
    this.load.image('portrait_iron-sentinel', 'assets/img/portraits/iron_sentinel_portrait.png');
    this.load.image('portrait_sylvan-ranger', 'assets/img/portraits/sylvan_ranger_portrait.png');
    this.load.image('portrait_rune-weaver', 'assets/img/portraits/rune_weaver_portrait.png');

    // === Priority-3/4: Map hero shots (loading splashes) for all 17 maps ===
    for (const m of [
      'aurora_town', 'treeshade_town', 'crimson_fortress', 'verity_citadel', 'starhaven',
      'aurora_fields', 'forgotten_meadow', 'whisper_woods', 'sunken_mine', 'mistwail_marsh',
      'ashen_caverns', 'azure_grove', 'ruined_citadel', 'ruined_temple', 'pyre_peaks',
      'aether_rift', 'drakensvale',
    ]) {
      this.load.image(`hero_${m}`, `assets/img/maps_hero/${m}.png`);
    }

    // === Priority-5: Nature & props ===
    for (let i = 0; i < 12; i++) {
      this.load.image(`nature_${i}`, `assets/img/nature/nature_${i}.png`);
    }
    for (let i = 0; i < 8; i++) {
      this.load.image(`decor_${i}`, `assets/img/nature/decor_${i}.png`);
    }
    for (let i = 0; i < 8; i++) {
      this.load.image(`prop_${i}`, `assets/img/props/prop_${i}.png`);
    }
    // Seamless ground textures
    this.load.image('ground_grass', 'assets/img/tiles_real/ground_grass.png');
    this.load.image('ground_path', 'assets/img/tiles_real/ground_path.png');
    this.load.image('ground_dirt', 'assets/img/tiles_real/ground_dirt.png');

    // === Priority-3: Gacha box illustrations ===
    for (const r of ['normal', 'rare', 'epic', 'legendary', 'rune']) {
      this.load.image(`gacha_${r}`, `assets/img/gacha/box_${r}.png`);
    }
    // Gacha open burst (4 frames)
    for (let i = 0; i < 4; i++) {
      this.load.image(`gacha_open_${i}`, `assets/img/effects/gacha_open_${i}.png`);
    }

    // === Priority-6: Monster walk/attack/death atlases (8 frames each) ===
    for (const tier of ['tier1', 'tier2', 'tier3', 'tier4', 'tier5']) {
      for (let i = 0; i < 8; i++) {
        this.load.image(`mon_${tier}_walk_${i}`, `assets/img/monsters/anim/${tier}_walk_${i}.png`);
      }
    }
    for (let i = 0; i < 8; i++) {
      this.load.image(`mon_attack_${i}`, `assets/img/monsters/anim/mon_attack_${i}.png`);
      this.load.image(`mon_death_${i}`, `assets/img/monsters/anim/mon_death_${i}.png`);
    }
    // === Priority-6: UI markers + extra props ===
    for (let i = 0; i < 6; i++) {
      this.load.image(`marker_${i}`, `assets/img/effects/marker_${i}.png`);
    }
    for (let i = 0; i < 8; i++) {
      this.load.image(`extra_prop_${i}`, `assets/img/props/extra_prop_${i}.png`);
    }

    // === Priority-7: Character cast/hit/down/death + 4-direction extra walk frames ===
    for (const cls of ['aether-lord', 'iron-sentinel', 'sylvan-ranger', 'rune-weaver']) {
      const dir = cls.replace(/-/g, '_');
      for (const act of ['cast', 'hit', 'down', 'death']) {
        this.load.image(`char_${cls}_${act}`, `assets/img/characters/${dir}/${act}.png`);
      }
    }

    // === Priority-8: Items (potions/scrolls/equip/accessory/material) ===
    for (const cat of ['potion', 'scroll_rune', 'equip', 'accessory', 'material']) {
      for (let i = 0; i < 8; i++) {
        this.load.image(`${cat}_${i}`, `assets/img/items/${cat}_${i}.png`);
      }
    }
    // === Priority-8: UI button frames + HUD bars ===
    for (let i = 0; i < 6; i++) {
      this.load.image(`ui_${i}`, `assets/img/ui/ui_${i}.png`);
      this.load.image(`hud_${i}`, `assets/img/ui/hud_${i}.png`);
    }
    // === Priority-8: Spell effects ===
    for (let i = 0; i < 8; i++) {
      this.load.image(`spell_${i}`, `assets/img/effects/spell_${i}.png`);
    }

    // 404s are expected — many codex slots aren't filled yet and procedural fallbacks
    // cover them. Log nothing per-file (was flooding the console with hundreds of warns).
    // Summary only at end of preload.
    let missing = 0;
    this.load.on('loaderror', () => { missing++; });
    this.load.once('complete', () => {
      if (missing > 0) console.info(`[BootScene] ${missing} optional assets missing — procedural fallbacks used`);
    });
  }

  create() {
    this.generatePlaceholderTextures();
    this.scene.start('LoginScene');
  }

  /** Generate procedural placeholder textures so the game can run before codex assets arrive. */
  private generatePlaceholderTextures() {
    // Tiles always procedural (32×32 mosaic — codex tilesets are 1024×1024 atlases, used differently)
    // Daylight palette — brightened so the world reads as daytime, not night.
    this.makeColorTile('tile_grass', 0x5C9E4F, 0x77BC64);
    this.makeColorTile('tile_dirt', 0x9A6E45, 0x7C5230);
    this.makeColorTile('tile_stone', 0x7A8089, 0x60656E);
    this.makeColorTile('tile_water', 0x2E5C8A, 0x244A72);
    this.makeColorTile('tile_wood', 0x6E462A, 0x573420);
    this.makeColorTile('tile_marble', 0xF0ECE0, 0xDAD6CB);

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

    // ========= FX textures (Lineage-Remaster pass) =========
    // Soft drop shadow ellipse — feathered radial alpha
    const sh = this.add.graphics();
    for (let r = 18; r >= 0; r--) {
      const alpha = 0.35 * (1 - r / 18) ** 1.6;
      sh.fillStyle(0x000000, alpha);
      sh.fillEllipse(24, 12, r * 2 + 2, r + 2);
    }
    sh.generateTexture('fx_shadow', 48, 24);
    sh.destroy();

    // White soft glow particle (additive blend)
    const gl = this.add.graphics();
    for (let r = 12; r >= 0; r--) {
      const a = (1 - r / 12) ** 2;
      gl.fillStyle(0xFFFFFF, a * 0.6);
      gl.fillCircle(12, 12, r);
    }
    gl.generateTexture('fx_glow', 24, 24);
    gl.destroy();

    // Warm flame glow particle (orange)
    const wg = this.add.graphics();
    for (let r = 12; r >= 0; r--) {
      const a = (1 - r / 12) ** 2;
      wg.fillStyle(0xFFB347, a * 0.7);
      wg.fillCircle(12, 12, r);
    }
    wg.generateTexture('fx_flame', 24, 24);
    wg.destroy();

    // Dust particle for footsteps (small tan circle)
    const du = this.add.graphics();
    du.fillStyle(0xC9B084, 0.7);
    du.fillCircle(4, 4, 3);
    du.fillStyle(0xE5D4A8, 0.4);
    du.fillCircle(3, 3, 2);
    du.generateTexture('fx_dust', 8, 8);
    du.destroy();

    // Sparkle (bright white star) for legendary/levelup
    const sp = this.add.graphics();
    sp.fillStyle(0xFFFFFF, 1);
    sp.fillCircle(6, 6, 2);
    sp.fillStyle(0xFFFFFF, 0.4);
    sp.fillCircle(6, 6, 5);
    sp.generateTexture('fx_sparkle', 12, 12);
    sp.destroy();
  }

  private makeColorTile(key: string, primary: number, accent: number) {
    // Generate 3 variants per tile family — pseudo-random noise (no grid lines)
    for (let v = 0; v < 3; v++) {
      const g = this.add.graphics();
      g.fillStyle(primary, 1); g.fillRect(0, 0, 32, 32);
      // Subtle variation patches
      g.fillStyle(accent, 0.18);
      const seed = (key.charCodeAt(0) + v * 7) * 31;
      for (let i = 0; i < 14; i++) {
        const x = (seed * (i + 1) * 11) % 32;
        const y = (seed * (i + 3) * 17) % 32;
        const s = ((seed + i) % 3) + 1;
        g.fillRect(x, y, s, s);
      }
      g.fillStyle(primary, 0.5);
      for (let i = 0; i < 6; i++) {
        const x = (seed * (i + 5) * 13) % 32;
        const y = (seed * (i + 2) * 19) % 32;
        g.fillRect(x, y, 2, 1);
      }
      g.generateTexture(v === 0 ? key : `${key}_v${v}`, 32, 32);
      g.destroy();
    }
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
