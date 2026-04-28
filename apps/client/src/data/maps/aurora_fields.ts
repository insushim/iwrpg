import { MapDef, genCollision } from './types';

const map: MapDef = {
  id: 'aurora_fields',
  name_ko: '여명 평원',
  name_en: 'Aurora Fields',
  width: 80,
  height: 80,
  bgm_track: 'field_aurora_breeze',
  ambient: 'forest',
  ambient_color: '#7aa05a',
  weather: 'clear',
  level_band: [1, 5],
  collision: genCollision(80, 80, [
    { x: 12, y: 14, w: 4, h: 4 },
    { x: 30, y: 18, w: 5, h: 5 },
    { x: 50, y: 12, w: 4, h: 6 },
    { x: 64, y: 22, w: 4, h: 4 },
    { x: 18, y: 38, w: 6, h: 4 },
    { x: 40, y: 42, w: 4, h: 5 },
    { x: 58, y: 46, w: 5, h: 4 },
    { x: 12, y: 58, w: 4, h: 4 },
    { x: 36, y: 62, w: 5, h: 5 },
    { x: 56, y: 64, w: 4, h: 4 },
  ]),
  spawn_points: [
    { id: 'sp_af_1', x: 20, y: 22, monster_pool: ['m_slime', 'm_rabbit'], max_concurrent: 5, respawn_sec: 12 },
    { id: 'sp_af_2', x: 42, y: 26, monster_pool: ['m_slime'], max_concurrent: 4, respawn_sec: 10 },
    { id: 'sp_af_3', x: 60, y: 32, monster_pool: ['m_rabbit'], max_concurrent: 4, respawn_sec: 14 },
    { id: 'sp_af_4', x: 28, y: 50, monster_pool: ['m_slime', 'm_rabbit'], max_concurrent: 5, respawn_sec: 12 },
    { id: 'sp_af_5', x: 50, y: 56, monster_pool: ['m_slime'], max_concurrent: 4, respawn_sec: 10 },
  ],
  npc_locations: [],
  portals: [
    { id: 'p_af_south', x: 38, y: 76, w: 4, h: 2, target_map: 'aurora_town', target_x: 30, target_y: 5, label_ko: '여명 마을로' },
    { id: 'p_af_north', x: 38, y: 2, w: 4, h: 2, target_map: 'forgotten_meadow', target_x: 50, target_y: 76, label_ko: '잊혀진 초원으로' },
    { id: 'p_af_east', x: 76, y: 38, w: 2, h: 4, target_map: 'forgotten_meadow', target_x: 4, target_y: 40, label_ko: '잊혀진 초원으로' },
  ],
  is_safe_zone: false,
};

export default map;
