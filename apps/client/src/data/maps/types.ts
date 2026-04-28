export interface MapSpawnPoint {
  id: string;
  x: number;
  y: number;
  monster_pool: string[];
  max_concurrent: number;
  respawn_sec: number;
}

export interface MapPortal {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  target_map: string;
  target_x: number;
  target_y: number;
  label_ko: string;
}

export interface MapDef {
  id: string;
  name_ko: string;
  name_en: string;
  width: number;
  height: number;
  bgm_track: string;
  ambient: 'town' | 'forest' | 'cave' | 'swamp' | 'fortress' | 'ruins' | 'temple' | 'fire' | 'aether' | 'dragon';
  ambient_color: string;
  weather: 'clear' | 'fog' | 'rain' | 'snow' | 'ash' | 'aurora';
  level_band: [number, number];
  collision: number[][];
  spawn_points: MapSpawnPoint[];
  npc_locations: { id: string; x: number; y: number }[];
  portals: MapPortal[];
  is_safe_zone: boolean;
}

export function genCollision(
  w: number,
  h: number,
  walls: Array<{ x: number; y: number; w: number; h: number }>
): number[][] {
  const grid = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let x = 0; x < w; x++) {
    grid[0][x] = 1;
    grid[h - 1][x] = 1;
  }
  for (let y = 0; y < h; y++) {
    grid[y][0] = 1;
    grid[y][w - 1] = 1;
  }
  for (const wall of walls) {
    for (let yy = wall.y; yy < wall.y + wall.h; yy++) {
      for (let xx = wall.x; xx < wall.x + wall.w; xx++) {
        if (grid[yy] && grid[yy][xx] !== undefined) grid[yy][xx] = 1;
      }
    }
  }
  return grid;
}
