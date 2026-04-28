import { MapDef, genCollision } from './types';

const map: MapDef = {
  id: 'whisper_woods',
  name_ko: '속삭이는 숲',
  name_en: 'Whisper Woods',
  width: 100,
  height: 100,
  bgm_track: 'field_whisper_lullaby',
  ambient: 'forest',
  ambient_color: '#3a4838',
  weather: 'fog',
  level_band: [8, 15],
  collision: genCollision(100, 100, [
    { x: 14, y: 16, w: 7, h: 6 },
    { x: 32, y: 14, w: 6, h: 7 },
    { x: 52, y: 18, w: 7, h: 6 },
    { x: 74, y: 14, w: 6, h: 7 },
    { x: 20, y: 38, w: 6, h: 6 },
    { x: 42, y: 40, w: 7, h: 6 },
    { x: 62, y: 38, w: 6, h: 7 },
    { x: 84, y: 42, w: 6, h: 6 },
    { x: 16, y: 60, w: 7, h: 6 },
    { x: 36, y: 64, w: 6, h: 6 },
    { x: 58, y: 62, w: 7, h: 6 },
    { x: 80, y: 64, w: 6, h: 7 },
    { x: 28, y: 82, w: 6, h: 6 },
    { x: 60, y: 84, w: 7, h: 6 },
  ]),
  spawn_points: [
    { id: 'sp_ww_1', x: 24, y: 28, monster_pool: ['m_orc_scout', 'm_sprite'], max_concurrent: 5, respawn_sec: 18 },
    { id: 'sp_ww_2', x: 48, y: 32, monster_pool: ['m_sprite'], max_concurrent: 4, respawn_sec: 16 },
    { id: 'sp_ww_3', x: 72, y: 30, monster_pool: ['m_orc_scout'], max_concurrent: 5, respawn_sec: 18 },
    { id: 'sp_ww_4', x: 30, y: 54, monster_pool: ['m_orc_scout', 'm_sprite'], max_concurrent: 5, respawn_sec: 18 },
    { id: 'sp_ww_5', x: 56, y: 54, monster_pool: ['m_sprite'], max_concurrent: 4, respawn_sec: 16 },
    { id: 'sp_ww_6', x: 78, y: 56, monster_pool: ['m_orc_scout'], max_concurrent: 5, respawn_sec: 18 },
    { id: 'sp_ww_named', x: 50, y: 78, monster_pool: ['n_alpha_orc'], max_concurrent: 1, respawn_sec: 1800 },
  ],
  npc_locations: [],
  portals: [
    { id: 'p_ww_south', x: 48, y: 96, w: 4, h: 2, target_map: 'forgotten_meadow', target_x: 50, target_y: 4, label_ko: '잊혀진 초원으로' },
    { id: 'p_ww_north', x: 48, y: 2, w: 4, h: 2, target_map: 'treeshade_town', target_x: 25, target_y: 46, label_ko: '나무그늘 마을로' },
    { id: 'p_ww_east', x: 96, y: 48, w: 2, h: 4, target_map: 'sunken_mine', target_x: 40, target_y: 4, label_ko: '침몰 광산으로' },
  ],
  is_safe_zone: false,
};

export default map;
